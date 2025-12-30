// YouTube URL utilities

export function isYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(url)
}

export function extractYouTubeVideoId(url: string): string | null {
  // Handle youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]

  // Handle youtube.com/watch?v=VIDEO_ID
  const longMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/)
  if (longMatch) return longMatch[1]

  // Handle youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)
  if (embedMatch) return embedMatch[1]

  return null
}

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, options: YTPlayerOptions) => YTPlayer
      PlayerState: typeof YTPlayerState
    }
    onYouTubeIframeAPIReady: () => void
  }
}

export interface YTPlayerOptions {
  height?: string | number
  width?: string | number
  videoId?: string
  playerVars?: {
    autoplay?: 0 | 1
    controls?: 0 | 1
    disablekb?: 0 | 1
    fs?: 0 | 1
    modestbranding?: 0 | 1
    rel?: 0 | 1
    showinfo?: 0 | 1
    origin?: string
  }
  events?: {
    onReady?: (event: { target: YTPlayer }) => void
    onStateChange?: (event: { data: number; target: YTPlayer }) => void
    onError?: (event: { data: number }) => void
  }
}

export interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  setVolume: (volume: number) => void
  getVolume: () => number
  loadVideoById: (videoId: string) => void
  getPlayerState: () => number
  destroy: () => void
}

export const YTPlayerState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
}

let apiLoaded = false
let apiLoadPromise: Promise<void> | null = null

export function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve()
  
  if (apiLoadPromise) return apiLoadPromise

  apiLoadPromise = new Promise((resolve) => {
    // Check if already loaded
    if (window.YT && window.YT.Player) {
      apiLoaded = true
      resolve()
      return
    }

    // Create callback
    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true
      resolve()
    }

    // Load the script
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    document.head.appendChild(script)
  })

  return apiLoadPromise
}
