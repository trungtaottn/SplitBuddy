import { useEffect, useState } from 'react'
import { useMood, MoodType } from '@/contexts/MoodContext'

// Particle component for visual effects
interface Particle {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  emoji: string
  duration: number
  delay: number
}

const MOOD_PARTICLES: Record<MoodType, string[]> = {
  happy: ['✨', '🌟', '⭐', '💫', '🎉'],
  sad: ['💧', '🌧️', '☁️', '💙'],
  tired: ['💤', '😴', '🌙', '⭐'],
  stressed: ['🍃', '🌿', '💚', '🧘'],
  excited: ['🔥', '⚡', '💥', '🎊', '🎉'],
  neutral: [],
}

const MOOD_ANIMATION_CONFIG: Record<MoodType, { count: number; speed: string }> = {
  happy: { count: 8, speed: '3s' },
  sad: { count: 5, speed: '6s' },
  tired: { count: 4, speed: '8s' },
  stressed: { count: 6, speed: '5s' },
  excited: { count: 10, speed: '2s' },
  neutral: { count: 0, speed: '0s' },
}

export function MoodEffects() {
  const { mood } = useMood()
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (mood === 'neutral') {
      setParticles([])
      return
    }

    const config = MOOD_ANIMATION_CONFIG[mood]
    const emojis = MOOD_PARTICLES[mood]
    
    const newParticles: Particle[] = Array.from({ length: config.count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 16 + Math.random() * 12,
      opacity: 0.3 + Math.random() * 0.4,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      duration: 10 + Math.random() * 15,
      delay: Math.random() * 5,
    }))
    
    setParticles(newParticles)
  }, [mood])

  if (mood === 'neutral' || particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-float"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            fontSize: `${particle.size}px`,
            opacity: particle.opacity,
            animation: `float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        >
          {particle.emoji}
        </div>
      ))}
      
      {/* Mood-specific overlay effect */}
      {mood === 'sad' && (
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
      )}
      {mood === 'happy' && (
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent" />
      )}
      {mood === 'excited' && (
        <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 to-transparent" />
      )}
      {mood === 'tired' && (
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent" />
      )}
      {mood === 'stressed' && (
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent" />
      )}
      
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) translateX(10px) rotate(5deg);
          }
          50% {
            transform: translateY(-10px) translateX(-10px) rotate(-5deg);
          }
          75% {
            transform: translateY(-30px) translateX(5px) rotate(3deg);
          }
        }
      `}</style>
    </div>
  )
}
