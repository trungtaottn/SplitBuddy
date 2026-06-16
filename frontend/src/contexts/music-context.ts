import { createContext } from 'react'

export interface Track {
  id: string
  name: string
  src: string
  isYouTube?: boolean
}

export interface MusicContextType {
  isPlaying: boolean
  currentTrack: Track | null
  tracks: Track[]
  volume: number
  isLoading: boolean
  isShuffled: boolean
  play: () => void
  pause: () => void
  toggle: () => void
  setVolume: (volume: number) => void
  nextTrack: () => void
  prevTrack: () => void
  selectTrack: (track: Track) => void
  refreshTracks: () => Promise<void>
  toggleShuffle: () => void
}

export const MusicContext = createContext<MusicContextType | null>(null)
