import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// Confetti particle
interface Particle {
  id: number
  x: number
  color: string
  delay: number
  duration: number
}

interface CelebrationProps {
  show: boolean
  onComplete?: () => void
  type?: 'confetti' | 'fireworks' | 'success'
  duration?: number
}

export function Celebration({ 
  show, 
  onComplete, 
  type = 'confetti',
  duration = 2000 
}: CelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      
      // Generate particles
      const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#98D8C8']
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: 1 + Math.random() * 1,
      }))
      setParticles(newParticles)

      const timer = setTimeout(() => {
        setVisible(false)
        setParticles([])
        onComplete?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [show, duration, onComplete])

  if (!visible) return null

  if (type === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="animate-success bg-green-500 rounded-full p-6 shadow-2xl">
          <svg
            className="w-16 h-16 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              className="animate-draw-check"
              style={{
                strokeDasharray: 50,
                strokeDashoffset: 50,
                animation: 'drawCheck 0.5s ease forwards 0.2s',
              }}
            />
          </svg>
        </div>
        <style>{`
          @keyframes drawCheck {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${particle.x}%`,
            top: '-10px',
            backgroundColor: particle.color,
            animation: `confettiFall ${particle.duration}s ease-out ${particle.delay}s forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

// Toast-like success message with animation
export function SuccessToast({ 
  message, 
  show, 
  onHide,
  emoji = '🎉'
}: { 
  message: string
  show: boolean
  onHide?: () => void
  emoji?: string
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onHide?.()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onHide])

  if (!show) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in duration-300">
      <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-medium">
        <span className="text-xl animate-bounce">{emoji}</span>
        <span>{message}</span>
      </div>
    </div>
  )
}

// Progress celebration for milestones
export function MilestoneCelebration({
  milestone,
  show,
  onComplete,
}: {
  milestone: string
  show: boolean
  onComplete?: () => void
}) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center max-w-sm mx-4 animate-in zoom-in duration-300">
        <div className="text-6xl mb-4 animate-bounce">🏆</div>
        <h2 className="text-2xl font-bold mb-2 gradient-text">Chúc mừng!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{milestone}</p>
        <button
          onClick={onComplete}
          className="btn-gradient px-8 py-3 rounded-full font-semibold"
        >
          Tuyệt vời! 🎉
        </button>
      </div>
      <Celebration show={true} type="confetti" />
    </div>
  )
}

// Inline success indicator
export function InlineSuccess({ show }: { show: boolean }) {
  if (!show) return null

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 rounded-full animate-success">
      <svg
        className="w-3 h-3 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  )
}

// Number counter animation
export function AnimatedNumber({ 
  value, 
  duration = 1000,
  prefix = '',
  suffix = '',
  className,
}: { 
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const startValue = displayValue
    
    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const current = Math.floor(startValue + (value - startValue) * easeOutQuart)
      
      setDisplayValue(current)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [value, duration])

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}{displayValue.toLocaleString('vi-VN')}{suffix}
    </span>
  )
}

