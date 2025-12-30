import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'

export interface Track {
  id: string
  name: string
  src: string
}

interface MusicContextType {
  isPlaying: boolean
  currentTrack: Track | null
  tracks: Track[]
  volume: number
  play: () => void
  pause: () => void
  toggle: () => void
  setVolume: (volume: number) => void
  nextTrack: () => void
  prevTrack: () => void
  selectTrack: (track: Track) => void
  addTracks: (newTracks: Track[]) => void
}

const MusicContext = createContext<MusicContextType | null>(null)

// Default tracks - users can add more
const DEFAULT_TRACKS: Track[] = [
  { id: '1', name: 'Nhạc nền 1', src: '/music/track1.mp3' },
  { id: '2', name: 'Nhạc nền 2', src: '/music/track2.mp3' },
  { id: '3', name: 'Nhạc nền 3', src: '/music/track3.mp3' },
]

export function MusicProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('musicVolume')
    return saved ? parseFloat(saved) : 0.3
  })
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const currentTrack = tracks.length > 0 ? tracks[currentTrackIndex] : null

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = volume
    audioRef.current.loop = false
    
    // Auto play next track when current ends
    audioRef.current.addEventListener('ended', () => {
      nextTrack()
    })

    // Handle errors gracefully
    audioRef.current.addEventListener('error', () => {
      console.warn('Failed to load track, trying next...')
      if (tracks.length > 1) {
        nextTrack()
      }
    })

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      const wasPlaying = isPlaying
      audioRef.current.src = currentTrack.src
      audioRef.current.load()
      if (wasPlaying) {
        audioRef.current.play().catch(() => {
          // Auto-play might be blocked, user needs to interact first
          setIsPlaying(false)
        })
      }
    }
  }, [currentTrack?.id])

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
    localStorage.setItem('musicVolume', volume.toString())
  }, [volume])

  const play = () => {
    if (audioRef.current && currentTrack) {
      audioRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch((err) => {
        console.warn('Playback failed:', err)
      })
    }
  }

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
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
    }
  }

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

  const addTracks = (newTracks: Track[]) => {
    setTracks((prev) => [...prev, ...newTracks])
  }

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        currentTrack,
        tracks,
        volume,
        play,
        pause,
        toggle,
        setVolume,
        nextTrack,
        prevTrack,
        selectTrack,
        addTracks,
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
