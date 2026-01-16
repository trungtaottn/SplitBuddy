import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isYouTubeUrl, extractYouTubeVideoId, loadYouTubeAPI, YTPlayer, YTPlayerState } from '@/lib/youtube'
import { api } from '@/lib/axios'
import type { ApiResponse, PaginationMeta } from '@/types/api'

export interface Track {
  id: string
  name: string
  src: string
  isYouTube?: boolean
}

interface MusicContextType {
  isPlaying: boolean
  currentTrack: Track | null
  tracks: Track[]
  volume: number
  isLoading: boolean
  play: () => void
  pause: () => void
  toggle: () => void
  setVolume: (volume: number) => void
  nextTrack: () => void
  prevTrack: () => void
  selectTrack: (track: Track) => void
  refreshTracks: () => Promise<void>
}

const MusicContext = createContext<MusicContextType | null>(null)

export function MusicProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  // const [isLoading, setIsLoading] = useState(true) // Removed unused state
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('musicVolume')
    return saved ? parseFloat(saved) : 0.3
  })
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ytPlayerRef = useRef<YTPlayer | null>(null)
  const ytContainerRef = useRef<HTMLDivElement | null>(null)
  const [ytReady, setYtReady] = useState(false)
  
  // Ref to always have access to latest nextTrack function
  const nextTrackRef = useRef<() => void>(() => {})

  const currentTrack = tracks.length > 0 ? tracks[currentTrackIndex] : null

  const { data: paginatedData, isFetching: isLoading, refetch } = useQuery({
    queryKey: ['music-tracks'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ data: Track[]; pagination: PaginationMeta }>>('/admin/music')
      return res.data.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
       if (error?.response?.status === 429) return false
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
    audioRef.current.volume = volume
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
        if (tracks.length > 1) {
          nextTrack()
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
    
    const wasPlaying = isPlaying
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
          ytPlayerRef.current.setVolume(volume * 100)
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
                event.target.setVolume(volume * 100)
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
                if (tracks.length > 1) {
                  nextTrack()
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
  }, [currentTrack?.id, ytReady])

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

  const play = () => {
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
  }

  const pause = () => {
    if (currentTrack && isYouTubeUrl(currentTrack.src) && ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo()
    }
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsPlaying(false)
  }

  const toggle = () => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  const setVolume = (newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)))
  }

  const nextTrack = () => {
    if (tracks.length > 0) {
      setCurrentTrackIndex((prev) => (prev + 1) % tracks.length)
      // Auto-play when switching tracks
      setIsPlaying(true)
    }
  }
  
  // Keep ref updated with latest nextTrack function
  useEffect(() => {
    nextTrackRef.current = nextTrack
  })

  const prevTrack = () => {
    if (tracks.length > 0) {
      setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length)
    }
  }

  const selectTrack = (track: Track) => {
    const index = tracks.findIndex((t) => t.id === track.id)
    if (index !== -1) {
      setCurrentTrackIndex(index)
    }
  }

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        currentTrack,
        tracks,
        volume,
        isLoading,
        play,
        pause,
        toggle,
        setVolume,
        nextTrack,
        prevTrack,
        selectTrack,
        refreshTracks,
      }}
    >
      {children}
    </MusicContext.Provider>
  )
}

export function useMusic() {
  const context = useContext(MusicContext)
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider')
  }
  return context
}
