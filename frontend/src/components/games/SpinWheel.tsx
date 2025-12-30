import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { soundManager } from '@/utils/sounds'

interface Participant {
  id: string
  name: string
}

interface SpinWheelProps {
  participants: Participant[]
  onResult: (winner: Participant) => void
  disabled?: boolean
}

// Soft gradient colors matching app theme (pink/rose tones)
const SEGMENT_COLORS = [
  '#fecdd3', // rose-200
  '#fda4af', // rose-300
  '#fb7185', // rose-400
  '#f472b6', // pink-400
  '#f9a8d4', // pink-300
  '#fbcfe8', // pink-200
  '#fce7f3', // pink-100
  '#ffe4e6', // rose-100
  '#fecaca', // red-200
  '#fca5a5', // red-300
  '#fdba74', // orange-300
  '#fed7aa', // orange-200
]

// Animation duration in ms
const SPIN_DURATION = 7000

export function SpinWheel({ participants, onResult, disabled = false }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isEnabled())
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(0)

  const segmentAngle = 360 / participants.length

  // Draw the wheel
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || participants.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 10

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw segments
    participants.forEach((participant, index) => {
      const startAngle = (index * segmentAngle - 90) * (Math.PI / 180)
      const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180)

      // Draw segment
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = SEGMENT_COLORS[index % SEGMENT_COLORS.length]
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw text
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + (segmentAngle * Math.PI) / 360)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#000'
      ctx.font = 'bold 14px sans-serif'
      
      // Truncate name if too long
      let displayName = participant.name
      if (displayName.length > 10) {
        displayName = displayName.substring(0, 9) + '...'
      }
      
      ctx.fillText(displayName, radius - 20, 5)
      ctx.restore()
    })

    // Draw center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw center text
    ctx.fillStyle = '#333'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('QUAY', centerX, centerY + 4)

  }, [participants, segmentAngle])

  // Easing function - starts fast, slows down gradually
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3)
  }

  const spin = useCallback(() => {
    if (isSpinning || participants.length === 0 || disabled) return

    setIsSpinning(true)

    // Play spinning sound
    if (soundEnabled) {
      soundManager.playDiceRoll()
    }

    // Random spin: 8-12 full rotations + random angle
    const totalSpinDegrees = (8 + Math.random() * 4) * 360 + Math.random() * 360
    const startRotation = rotation
    const targetRotation = startRotation + totalSpinDegrees
    const startTime = performance.now()

    // Animation loop
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / SPIN_DURATION, 1)
      
      // Apply easing - wheel spins fast at start, slows down at end
      const easedProgress = easeOutCubic(progress)
      const currentRotation = startRotation + (totalSpinDegrees * easedProgress)
      
      setRotation(currentRotation)

      // Play tick sound - less frequent as wheel slows down
      const tickThreshold = 50 + (progress * 300)
      
      if (soundEnabled && currentTime - lastTickRef.current > tickThreshold && progress < 0.95) {
        soundManager.playClick()
        lastTickRef.current = currentTime
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete - calculate winner
        // Simple: 360° / số người = góc mỗi segment
        // Sau khi quay X độ, segment tại vị trí (360-X) là người thắng
        const normalizedRotation = ((targetRotation % 360) + 360) % 360
        const winnerIndex = Math.floor((360 - normalizedRotation) / segmentAngle) % participants.length
        
        const selectedWinner = participants[winnerIndex]
        setIsSpinning(false)
        
        // Play reveal sound and vibrate
        if (soundEnabled) {
          soundManager.playReveal()
        }
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }
        
        onResult(selectedWinner)
      }
    }

    // Start animation
    lastTickRef.current = performance.now()
    animationRef.current = requestAnimationFrame(animate)
  }, [isSpinning, participants, disabled, soundEnabled, rotation, segmentAngle, onResult])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    soundManager.setEnabled(newValue)
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có người chơi nào
      </div>
    )
  }

  if (participants.length === 1) {
    return (
      <div className="text-center py-8">
        <p className="text-lg font-semibold">{participants[0].name}</p>
        <p className="text-sm text-muted-foreground">Chỉ có 1 người chơi</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Sound toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleSound}
        className="absolute top-2 right-2"
      >
        {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </Button>

      {/* Pointer */}
      <div className="relative">
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-red-500 drop-shadow-lg" />
        </div>

        {/* Wheel */}
        <div style={{ transform: `rotate(${rotation}deg)` }}>
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="rounded-full shadow-xl"
          />
        </div>
      </div>

      {/* Spin button */}
      <Button
        onClick={spin}
        disabled={isSpinning || disabled}
        size="lg"
        className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
      >
        <RotateCcw className={`h-5 w-5 ${isSpinning ? 'animate-spin' : ''}`} />
        {isSpinning ? 'Đang quay...' : 'QUAY!'}
      </Button>
    </div>
  )
}
