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

/**
 * MusicPlayer - Vintage Paper Style
 * Features:
 * - Paper card design
 * - Sepia monochrome colors
 * - Typewriter typography
 */

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
      {/* Expanded Panel - Vintage Paper Style */}
      <div 
        className={cn(
          "absolute bottom-full left-0 mb-2 w-72 overflow-hidden transition-all duration-300 ease-out",
          "card-paper",
          isExpanded ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95 pointer-events-none"
        )}
      >
        {/* Track Info */}
        <div className="p-4 border-b-2 border-dotted border-border">
          <div className="flex items-center gap-3">
            {/* Vintage Vinyl Record - Spinning when playing */}
            <div className="relative w-16 h-16 flex-shrink-0">
              {/* Vinyl Record */}
              <div className={cn(
                "w-16 h-16 rounded-full border-4 border-border bg-gradient-to-br from-foreground/20 to-foreground/5",
                "relative overflow-hidden shadow-lg",
                isPlaying && "animate-spin"
              )} style={{ animationDuration: '3s' }}>
                {/* Record grooves */}
                <div className="absolute inset-2 rounded-full border-2 border-border/50" />
                <div className="absolute inset-4 rounded-full border border-border/30" />
                <div className="absolute inset-6 rounded-full border border-border/20" />
                
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                </div>
              </div>
              
              {/* Needle arm (static, doesn't spin) */}
              {isPlaying && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-foreground/60 origin-top rotate-12" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate uppercase tracking-wide">
                {currentTrack?.name || 'Không có bài hát'}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {tracks.length} bài hát
              </p>
              {isPlaying && (
                <div className="flex items-center gap-1 mt-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span 
                      key={i}
                      className="w-0.5 bg-primary rounded-none animate-bounce" 
                      style={{ 
                        animationDelay: `${i * 100}ms`,
                        height: `${6 + Math.random() * 6}px`
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
              className="h-8 w-8 rounded-sm"
              onClick={prevTrack}
            >
              <SkipBack className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <Button 
              variant="stamp" 
              size="icon" 
              className="h-10 w-10 rounded-sm"
              onClick={toggle}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Play className="h-4 w-4 ml-0.5" strokeWidth={1.5} />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-sm"
              onClick={nextTrack}
            >
              <SkipForward className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 mt-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 shrink-0 rounded-sm"
              onClick={handleMuteToggle}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5" strokeWidth={1.5} />
              ) : (
                <Volume2 className="h-3.5 w-3.5" strokeWidth={1.5} />
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
        <div className="max-h-32 overflow-y-auto border-t-2 border-dotted border-border">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              className={cn(
                "w-full px-3 py-2 text-left text-xs hover:bg-secondary transition-colors",
                "flex items-center gap-2 border-b border-border/30 last:border-b-0",
                currentTrack?.id === track.id && "bg-primary/10 text-primary"
              )}
              onClick={() => selectTrack(track)}
            >
              <span className="w-4 text-center text-[10px] text-muted-foreground">
                {index + 1}
              </span>
              <span className="flex-1 truncate">{track.name}</span>
              {currentTrack?.id === track.id && isPlaying && (
                <span className="text-[10px]">♪</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Button - Vintage Style */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "group flex items-center gap-2 h-9 px-3 rounded-sm transition-all duration-200",
          "bg-card border-2 border-border shadow-paper",
          "hover:shadow-lifted hover:border-primary/50",
          isPlaying && "border-primary/50"
        )}
      >
        {/* Icon - Mini Vinyl Record */}
        <div className="relative w-5 h-5 flex-shrink-0">
          <div className={cn(
            "w-5 h-5 rounded-full border border-primary/50 bg-gradient-to-br from-foreground/20 to-foreground/5",
            "relative overflow-hidden",
            isPlaying && "animate-spin"
          )} style={{ animationDuration: '2s' }}>
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-primary" />
            </div>
          </div>
          {/* Needle */}
          {isPlaying && (
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-px h-2 bg-primary/60 origin-top rotate-12" />
          )}
        </div>
        
        <span className="text-[10px] font-semibold uppercase tracking-wider max-w-16 truncate text-foreground">
          {isPlaying ? (currentTrack?.name || 'Playing') : 'Music'}
        </span>
        
        {/* Sound wave indicator when playing */}
        {isPlaying && (
          <div className="flex items-center gap-0.5 h-3">
            {[0, 1, 2].map((i) => (
              <span 
                key={i}
                className="w-0.5 bg-primary rounded-none animate-bounce" 
                style={{ 
                  animationDelay: `${i * 150}ms`,
                  height: `${4 + i * 2}px`
                }} 
              />
            ))}
          </div>
        )}
      </button>
    </div>
  )
}
