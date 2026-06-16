import { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isYouTubeUrl, extractYouTubeVideoId, loadYouTubeAPI, YTPlayer, YTPlayerState } from '@/lib/youtube'
import { api } from '@/lib/axios'
import type { ApiResponse, PaginationMeta } from '@/types/api'
import { isRateLimitError } from '@/utils/errorHandler'
import { MusicContext, type Track } from './music-context'

export function MusicProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isShuffled, setIsShuffled] = useState(false)
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([])
  // const [isLoading, setIsLoading] = useState(true) // Removed unused state
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('musicVolume')
    const parsed = saved ? Number(saved) : 0.3
    return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.3
  })
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ytPlayerRef = useRef<YTPlayer | null>(null)
  const ytContainerRef = useRef<HTMLDivElement | null>(null)
  const [ytReady, setYtReady] = useState(false)
  
  const nextTrackRef = useRef<() => void>(() => {})
  const tracksLengthRef = useRef(0)
  const isPlayingRef = useRef(false)
  const volumeRef = useRef(volume)

  const currentTrack = tracks.length > 0 ? tracks[currentTrackIndex] : null

  useEffect(() => {
    tracksLengthRef.current = tracks.length
  }, [tracks.length])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    volumeRef.current = volume
  }, [volume])

  const { data: paginatedData, isFetching: isLoading, refetch } = useQuery({
    queryKey: ['music-tracks'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ data: Track[]; pagination: PaginationMeta }>>('/admin/music?limit=1000')
      return res.data.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: unknown) => {
       if (isRateLimitError(error)) return false
       return failureCount < 2
    }
  })

  // Sync state with query data
  useEffect(() => {
    if (paginatedData && Array.isArray(paginatedData.data)) {
      const tracksWithType = paginatedData.data.map((t: Track) => ({
        ...t,
        isYouTube: isYouTubeUrl(t.src),
      }))
      setTracks(tracksWithType)
    }
  }, [paginatedData])

  const refreshTracks = async () => {
     await refetch()
  }

  // Initialize YouTube API
  useEffect(() => {
    loadYouTubeAPI().then(() => {
      setYtReady(true)
    })
  }, [])

  // Create hidden YouTube container
  useEffect(() => {
    if (!ytContainerRef.current) {
      const container = document.createElement('div')
      container.id = 'yt-player-container'
      container.style.position = 'fixed'
      container.style.top = '-9999px'
      container.style.left = '-9999px'
      container.style.width = '1px'
      container.style.height = '1px'
      container.style.opacity = '0'
      container.style.pointerEvents = 'none'
      document.body.appendChild(container)
      
      const playerDiv = document.createElement('div')
      playerDiv.id = 'yt-music-player'
      container.appendChild(playerDiv)
      
      ytContainerRef.current = container
    }

    return () => {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy()
        ytPlayerRef.current = null
      }
      if (ytContainerRef.current) {
        ytContainerRef.current.remove()
        ytContainerRef.current = null
      }
    }
  }, [])

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = volumeRef.current
    audioRef.current.loop = false
    
    // Auto play next track when current ends
    audioRef.current.addEventListener('ended', () => {
      nextTrackRef.current()
    })

    // Handle errors gracefully (ignore YouTube URLs as they use YT player)
    audioRef.current.addEventListener('error', () => {
      const src = audioRef.current?.src || ''
      if (!src.includes('youtube') && !src.includes('youtu.be') && src !== '') {
        console.warn('Failed to load track, trying next...')
        if (tracksLengthRef.current > 1) {
          nextTrackRef.current()
        }
      }
    })

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Update source when track changes
  useEffect(() => {
    if (!currentTrack) return
    
    const wasPlaying = isPlayingRef.current
    const isYT = isYouTubeUrl(currentTrack.src)
    
    if (isYT) {
      // Stop HTML audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      
      // Handle YouTube
      if (ytReady && window.YT) {
        const videoId = extractYouTubeVideoId(currentTrack.src)
        if (!videoId) return
        
        if (ytPlayerRef.current) {
          ytPlayerRef.current.loadVideoById(videoId)
          ytPlayerRef.current.setVolume(volumeRef.current * 100)
          // Auto-play if was playing, otherwise pause
          if (wasPlaying) {
            ytPlayerRef.current.playVideo()
          } else {
            ytPlayerRef.current.pauseVideo()
          }
        } else {
          // Create new player
          ytPlayerRef.current = new window.YT.Player('yt-music-player', {
            videoId,
            playerVars: {
              autoplay: wasPlaying ? 1 : 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              rel: 0,
            },
            events: {
              onReady: (event) => {
                event.target.setVolume(volumeRef.current * 100)
                if (wasPlaying) {
                  event.target.playVideo()
                }
              },
              onStateChange: (event) => {
                if (event.data === YTPlayerState.ENDED) {
                  nextTrackRef.current()
                }
              },
              onError: () => {
                console.warn('YouTube player error, trying next track...')
                if (tracksLengthRef.current > 1) {
                  nextTrackRef.current()
                }
              },
            },
          })
        }
      }
    } else {
      // Stop YouTube player
      if (ytPlayerRef.current) {
        ytPlayerRef.current.pauseVideo()
      }
      
      // Handle regular audio
      if (audioRef.current) {
        audioRef.current.src = currentTrack.src
        audioRef.current.load()
        if (wasPlaying) {
          audioRef.current.play().catch(() => {
            setIsPlaying(false)
          })
        }
      }
    }
  }, [currentTrack, ytReady])

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
    if (ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(volume * 100)
    }
    localStorage.setItem('musicVolume', volume.toString())
  }, [volume])

  const play = useCallback(() => {
    if (!currentTrack) return
    
    const isYT = isYouTubeUrl(currentTrack.src)
    
    if (isYT && ytPlayerRef.current) {
      ytPlayerRef.current.playVideo()
      setIsPlaying(true)
    } else if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch((err) => {
        console.warn('Playback failed:', err)
      })
    }
  }, [currentTrack])

  const pause = useCallback(() => {
    if (currentTrack && isYouTubeUrl(currentTrack.src) && ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo()
    }
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsPlaying(false)
  }, [currentTrack])

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, pause, play])

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)))
  }, [])

  const nextTrack = useCallback(() => {
    if (tracks.length > 0) {
      if (isShuffled && shuffledIndices.length > 0) {
        // Find current position in shuffled array
        const currentShufflePos = shuffledIndices.indexOf(currentTrackIndex)
        const nextShufflePos = (currentShufflePos + 1) % shuffledIndices.length
        setCurrentTrackIndex(shuffledIndices[nextShufflePos])
      } else {
        // Normal sequential playback
        setCurrentTrackIndex((prev) => (prev + 1) % tracks.length)
      }
      // Auto-play when switching tracks
      setIsPlaying(true)
    }
  }, [currentTrackIndex, isShuffled, shuffledIndices, tracks.length])
  
  // Keep ref updated with latest nextTrack function
  useEffect(() => {
    nextTrackRef.current = nextTrack
  }, [nextTrack])

  const prevTrack = useCallback(() => {
    if (tracks.length > 0) {
      if (isShuffled && shuffledIndices.length > 0) {
        // Find current position in shuffled array
        const currentShufflePos = shuffledIndices.indexOf(currentTrackIndex)
        const prevShufflePos = (currentShufflePos - 1 + shuffledIndices.length) % shuffledIndices.length
        setCurrentTrackIndex(shuffledIndices[prevShufflePos])
      } else {
        // Normal sequential playback
        setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length)
      }
    }
  }, [currentTrackIndex, isShuffled, shuffledIndices, tracks.length])

  const selectTrack = useCallback((track: Track) => {
    const index = tracks.findIndex((t) => t.id === track.id)
    if (index !== -1) {
      setCurrentTrackIndex(index)
    }
  }, [tracks])

  const toggleShuffle = useCallback(() => {
    if (!isShuffled) {
      // Enable shuffle - create shuffled indices
      const indices = tracks.map((_, i) => i)
      // Fisher-Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[indices[i], indices[j]] = [indices[j], indices[i]]
      }
      setShuffledIndices(indices)
      setIsShuffled(true)
    } else {
      // Disable shuffle - go back to original order
      setShuffledIndices([])
      setIsShuffled(false)
    }
  }, [isShuffled, tracks])

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        currentTrack,
        tracks,
        volume,
        isLoading,
        isShuffled,
        play,
        pause,
        toggle,
        setVolume,
        nextTrack,
        prevTrack,
        selectTrack,
        refreshTracks,
        toggleShuffle,
      }}
    >
      {children}
    </MusicContext.Provider>
  )
}
