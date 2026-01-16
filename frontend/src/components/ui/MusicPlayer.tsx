import { useState, useRef, useEffect } from 'react'
import { useMusic } from '@/contexts/MusicContext'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Disc,
  Music2,
  Shuffle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

/**
 * MusicPlayer - Neon Cyberpunk Style
 * Features:
 * - Glassmorphism panel
 * - Neon glow controls
 * - Digital visualizer effect
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
    selectTrack,
    isShuffled,
    toggleShuffle
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
      {/* Expanded Panel - Neon Glass Style */}
      <div 
        className={cn(
          "absolute bottom-full left-0 mb-4 w-72 overflow-hidden transition-all duration-300 cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          "bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]",
          isExpanded ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        )}
      >
        {/* Glow effect */}
        <div className="absolute top-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />

        {/* Track Info */}
        <div className="p-5 relative">
          <div className="flex items-center gap-4">
            {/* Album Art / Visualizer */}
            <div className="relative w-12 h-12 flex-shrink-0 group">
              <div className={cn(
                "w-12 h-12 rounded-lg bg-black border border-white/10 flex items-center justify-center overflow-hidden",
                isPlaying && "shadow-[0_0_15px_hsl(var(--primary)/0.5)] border-primary/50"
              )}>
                 {isPlaying ? (
                   <div className="flex items-center justify-center gap-[2px]">
                     {[1,2,3,4].map(i => (
                       <div 
                        key={i} 
                        className="w-1 bg-primary rounded-full animate-neon-pulse"
                        style={{ height: '60%', animationDelay: `${i * 0.1}s` }}
                       />
                     ))}
                   </div>
                 ) : (
                   <Disc className="text-muted-foreground w-6 h-6" />
                 )}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-bold text-sm truncate tracking-wide text-white",
                isPlaying && "text-transparent bg-clip-text bg-gradient-to-r from-white to-primary animate-pulse"
              )}>
                {currentTrack?.name || 'Giai điệu Neon'}
              </p>
              <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono mt-1">
                {tracks.length} TRACKS • LOFI
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-5 pb-5">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10"
              onClick={prevTrack}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button 
              size="icon" 
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-black shadow-[0_0_15px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.7)] hover:scale-105 transition-all"
              onClick={toggle}
              haptic={true}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10"
              onClick={nextTrack}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "h-8 w-8 transition-colors",
                isShuffled ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-white hover:bg-white/10"
              )}
              onClick={toggleShuffle}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-white pr-0"
              onClick={handleMuteToggle}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.01}
              className="flex-1 [&>.relative>.absolute]:bg-primary [&>.relative]:bg-white/10"
            />
          </div>
        </div>

        {/* Playlist */}
        <div className="max-h-40 overflow-y-auto bg-black/20 border-t border-white/5">
          {tracks.map((track,_index) => (
            <button
              key={track.id}
              className={cn(
                "w-full px-4 py-3 text-left text-xs transition-colors flex items-center justify-between group",
                currentTrack?.id === track.id 
                  ? "bg-primary/10 text-primary border-l-2 border-primary" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white border-l-2 border-transparent"
              )}
              onClick={() => selectTrack(track)}
            >
              <span className="truncate pr-2 font-medium">{track.name}</span>
              {currentTrack?.id === track.id && isPlaying && (
                 <div className="flex gap-0.5 h-2 items-end">
                    <span className="w-0.5 bg-primary animate-pulse h-full" />
                    <span className="w-0.5 bg-primary animate-pulse h-2/3" />
                    <span className="w-0.5 bg-primary animate-pulse h-1/2" />
                 </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Button - Glass Capsule */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "group flex items-center gap-3 h-12 pl-3 pr-5 rounded-full transition-all duration-300",
          "bg-black/40 backdrop-blur-xl border border-white/10",
          "hover:border-primary/50 hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)]",
          isPlaying && "border-primary/30 shadow-[0_0_15px_hsl(var(--primary)/0.1)]"
        )}
      >
        {/* Visualizer Circle */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className={cn(
            "absolute inset-0 rounded-full border border-primary/30",
            isPlaying && "animate-ping opacity-20"
          )} />
          <div className={cn(
            "w-8 h-8 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center border border-white/10 overflow-hidden",
            isPlaying && "border-primary/50"
          )}>
            {isPlaying ? (
              <div className="flex gap-[2px] items-end h-3">
                 {[1,2,3].map(i => (
                    <div 
                      key={i} 
                      className="w-[2px] bg-primary rounded-full animate-bounce"
                      style={{ height: '80%', animationDelay: `${i*0.1}s` }} 
                    />
                 ))}
              </div>
            ) : (
              <Music2 className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-start">
           <span className={cn(
             "text-xs font-bold uppercase tracking-wider max-w-[100px] truncate transition-colors",
             isPlaying ? "text-primary" : "text-white/80"
           )}>
             {isPlaying ? currentTrack?.name : 'Music'}
           </span>
           <span className="text-[9px] text-muted-foreground font-mono">
             {isPlaying ? 'PLAYING...' : 'PAUSED'}
           </span>
        </div>
      </button>
    </div>
  )
}
