import { useState } from 'react'
import { useMusic } from '@/contexts/MusicContext'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  ChevronUp,
  ChevronDown
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
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50">
      {/* Expanded Panel */}
      <div 
        className={cn(
          "absolute bottom-full right-0 mb-2 w-72 rounded-xl shadow-2xl overflow-hidden transition-all duration-300",
          "bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border border-gray-200 dark:border-gray-700",
          isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {/* Track Info with Vinyl Disc */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            {/* Vinyl Disc Animation */}
            <div className="relative w-16 h-16 shrink-0">
              {/* Outer disc */}
              <div 
                className={cn(
                  "absolute inset-0 rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
                  "shadow-lg border-4 border-gray-700",
                  isPlaying && "animate-spin-slow"
                )}
                style={{ animationDuration: '3s' }}
              >
                {/* Vinyl grooves */}
                <div className="absolute inset-2 rounded-full border border-gray-600/30" />
                <div className="absolute inset-4 rounded-full border border-gray-600/20" />
                <div className="absolute inset-6 rounded-full border border-gray-600/30" />
                
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-inner">
                    <div className="w-2 h-2 rounded-full bg-gray-900" />
                  </div>
                </div>
              </div>
              
              {/* Reflection highlight */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {currentTrack?.name || 'Không có bài hát'}
              </p>
              <p className="text-xs text-muted-foreground">
                {tracks.length} bài hát
              </p>
              {isPlaying && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-1 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10"
              onClick={prevTrack}
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button 
              variant="default" 
              size="icon" 
              className="h-12 w-12 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
              onClick={toggle}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white ml-0.5" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10"
              onClick={nextTrack}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 shrink-0"
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
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>

        {/* Track List */}
        <div className="max-h-40 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              className={cn(
                "w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                "flex items-center gap-2",
                currentTrack?.id === track.id && "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400"
              )}
              onClick={() => selectTrack(track)}
            >
              <span className="w-5 text-center text-xs text-muted-foreground">
                {index + 1}
              </span>
              <span className="flex-1 truncate">{track.name}</span>
              {currentTrack?.id === track.id && isPlaying && (
                <span className="text-xs">🎵</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Button with Mini Vinyl */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "relative flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all duration-300",
          "bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border border-gray-200 dark:border-gray-700",
          "hover:shadow-xl hover:scale-105",
          isPlaying && "ring-2 ring-orange-400 ring-offset-2 dark:ring-offset-gray-900"
        )}
      >
        {/* Mini Vinyl Disc */}
        <div className="relative w-10 h-10">
          <div 
            className={cn(
              "absolute inset-0 rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
              "border-2 border-gray-600",
              isPlaying && "animate-spin-slow"
            )}
          >
            {/* Grooves */}
            <div className="absolute inset-1 rounded-full border border-gray-600/30" />
            <div className="absolute inset-2 rounded-full border border-gray-600/20" />
            {/* Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-orange-400 to-pink-500">
                <div className="w-1 h-1 rounded-full bg-gray-900 mx-auto mt-1" />
              </div>
            </div>
          </div>
          {/* Highlight */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
        </div>
        
        <span className="text-sm font-medium max-w-24 truncate hidden sm:block">
          {currentTrack?.name || 'Nhạc nền'}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </div>
  )
}
