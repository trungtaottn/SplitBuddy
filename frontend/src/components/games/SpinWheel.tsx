import { useState, useRef, useEffect } from 'react'
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

// Vibrant colors for wheel segments
const SEGMENT_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Light Blue
  '#F8B500', // Orange
  '#00CED1', // Dark Cyan
]

export function SpinWheel({ participants, onResult, disabled = false }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [winner, setWinner] = useState<Participant | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isEnabled())
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

  const spin = () => {
    if (isSpinning || participants.length === 0 || disabled) return

    setIsSpinning(true)
    setWinner(null)

    // Play spinning sound
    if (soundEnabled) {
      soundManager.playDiceRoll()
    }

    // Random spin: 5-10 full rotations + random angle
    const spins = 5 + Math.random() * 5
    const randomAngle = Math.random() * 360
    const totalRotation = rotation + spins * 360 + randomAngle

    setRotation(totalRotation)

    // Calculate winner after spin
    setTimeout(() => {
      // Normalize rotation to 0-360
      const normalizedRotation = totalRotation % 360
      // Calculate which segment is at the top (pointer position)
      // Pointer is at top (270 degrees in canvas coordinate)
      const pointerAngle = (360 - normalizedRotation + 90) % 360
      const winnerIndex = Math.floor(pointerAngle / segmentAngle) % participants.length
      
      const selectedWinner = participants[winnerIndex]
      setWinner(selectedWinner)
      setIsSpinning(false)
      
      // Play reveal sound and vibrate
      if (soundEnabled) {
        soundManager.playReveal()
      }
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100])
      }
      
      onResult(selectedWinner)
    }, 4000) // Match CSS transition duration
  }

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
        <div
          className="transition-transform duration-[4000ms] ease-out"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
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

      {/* Winner announcement */}
      {winner && !isSpinning && (
        <div className="text-center animate-bounce">
          <p className="text-sm text-muted-foreground">Người được chọn:</p>
          <p className="text-2xl font-bold text-primary">{winner.name}</p>
        </div>
      )}
    </div>
  )
}
