import { useState, useRef, useEffect } from 'react'
import { useMusic } from '@/contexts/MusicContext'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Music2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

export function MusicPlayer() {
  const { 
    isPlaying, 
    currentTrack, 
    volume, 
    toggle, 
    setVolume, 
    nextTrack, 
    prevTrack,
    tracks,
    selectTrack
  } = useMusic()
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(volume)
  const containerRef = useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  const handleMuteToggle = () => {
    if (isMuted) {
      setVolume(prevVolume)
      setIsMuted(false)
    } else {
      setPrevVolume(volume)
      setVolume(0)
      setIsMuted(true)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (value[0] > 0) {
      setIsMuted(false)
    }
  }

  if (tracks.length === 0) return null

  return (
    <div ref={containerRef} className="fixed bottom-20 md:bottom-4 left-4 z-50">
      {/* Expanded Panel */}
      <div 
        className={cn(
          "absolute bottom-full left-0 mb-2 w-72 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ease-out",
          "bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border border-gray-200 dark:border-gray-700",
          isExpanded ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95 pointer-events-none"
        )}
      >
        {/* Track Info */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {/* Animated Icon */}
            <div className={cn(
              "w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center",
              isPlaying && "animate-pulse"
            )}>
              <Music2 className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {currentTrack?.name || 'Không có bài hát'}
              </p>
              <p className="text-xs text-muted-foreground">
                {tracks.length} bài hát
              </p>
              {isPlaying && (
                <div className="flex items-center gap-0.5 mt-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span 
                      key={i}
                      className="w-0.5 bg-orange-500 rounded-full animate-bounce" 
                      style={{ 
                        animationDelay: `${i * 100}ms`,
                        height: `${8 + Math.random() * 8}px`
                      }} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-3">
          <div className="flex items-center justify-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-full"
              onClick={prevTrack}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button 
              variant="default" 
              size="icon" 
              className="h-11 w-11 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg"
              onClick={toggle}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-white" />
              ) : (
                <Play className="h-5 w-5 text-white ml-0.5" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-full"
              onClick={nextTrack}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 mt-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 shrink-0"
              onClick={handleMuteToggle}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.01}
              className="flex-1"
            />
          </div>
        </div>

        {/* Track List */}
        <div className="max-h-32 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                "flex items-center gap-2",
                currentTrack?.id === track.id && "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400"
              )}
              onClick={() => selectTrack(track)}
            >
              <span className="w-4 text-center text-xs text-muted-foreground">
                {index + 1}
              </span>
              <span className="flex-1 truncate text-xs">{track.name}</span>
              {currentTrack?.id === track.id && isPlaying && (
                <span className="text-xs">🎵</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Button - Minimal & Smooth */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "group flex items-center gap-2 h-10 px-3 rounded-full shadow-md transition-all duration-300 ease-out",
          "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50",
          "hover:shadow-lg hover:bg-white dark:hover:bg-gray-900",
          isPlaying && "ring-1 ring-orange-400/50"
        )}
      >
        {/* Icon */}
        <div className={cn(
          "w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center transition-transform",
          isPlaying && "animate-pulse",
          isExpanded && "rotate-180"
        )}>
          <Music2 className="h-3.5 w-3.5 text-white" />
        </div>
        
        <span className="text-xs font-medium max-w-20 truncate text-gray-700 dark:text-gray-300">
          {isPlaying ? (currentTrack?.name || 'Đang phát') : 'Nhạc'}
        </span>
        
        {/* Sound wave indicator when playing */}
        {isPlaying && (
          <div className="flex items-center gap-0.5 h-4">
            {[0, 1, 2].map((i) => (
              <span 
                key={i}
                className="w-0.5 bg-orange-500 rounded-full animate-bounce" 
                style={{ 
                  animationDelay: `${i * 150}ms`,
                  height: `${6 + i * 2}px`
                }} 
              />
            ))}
          </div>
        )}
      </button>
    </div>
  )
}
