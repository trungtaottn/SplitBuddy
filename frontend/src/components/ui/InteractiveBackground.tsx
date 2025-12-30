import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useMood } from '@/contexts/MoodContext'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  life: number
}

interface MousePos {
  x: number
  y: number
  targetX: number
  targetY: number
}

const MOOD_COLORS: Record<string, string[]> = {
  happy: ['#f97316', '#fbbf24', '#fb923c', '#fcd34d'],
  sad: ['#3b82f6', '#60a5fa', '#93c5fd', '#6b7280'],
  tired: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8'],
  stressed: ['#10b981', '#34d399', '#6ee7b7', '#14b8a6'],
  excited: ['#ec4899', '#f472b6', '#f9a8d4', '#fb7185'],
  neutral: ['#6b7280', '#9ca3af', '#d1d5db', '#a1a1aa'],
}

const MOOD_BLOB_COLORS: Record<string, string[]> = {
  happy: [
    'from-orange-400/20 to-amber-400/20',
    'from-amber-400/20 to-yellow-400/20',
    'from-yellow-400/20 to-orange-400/20',
  ],
  sad: [
    'from-blue-400/20 to-slate-400/20',
    'from-slate-400/20 to-gray-400/20',
    'from-gray-400/20 to-blue-400/20',
  ],
  tired: [
    'from-violet-400/20 to-purple-400/20',
    'from-purple-400/20 to-indigo-400/20',
    'from-indigo-400/20 to-violet-400/20',
  ],
  stressed: [
    'from-emerald-400/20 to-teal-400/20',
    'from-teal-400/20 to-cyan-400/20',
    'from-cyan-400/20 to-emerald-400/20',
  ],
  excited: [
    'from-pink-400/20 to-rose-400/20',
    'from-rose-400/20 to-red-400/20',
    'from-red-400/20 to-pink-400/20',
  ],
  neutral: [
    'from-gray-400/20 to-slate-400/20',
    'from-slate-400/20 to-zinc-400/20',
    'from-zinc-400/20 to-gray-400/20',
  ],
}

export function InteractiveBackground() {
  const { mood } = useMood()
  const [particles, setParticles] = useState<Particle[]>([])
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  
  const glowRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef<MousePos>({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const animationRef = useRef<number>()
  const lastParticleTime = useRef(0)

  const colors = MOOD_COLORS[mood] || MOOD_COLORS.neutral
  const blobColors = MOOD_BLOB_COLORS[mood] || MOOD_BLOB_COLORS.neutral

  const blobs = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      color: blobColors[i % blobColors.length],
      size: 250 + Math.random() * 200,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 25 + Math.random() * 15,
    }))
  }, [mood])

  // Smooth animation loop using requestAnimationFrame
  useEffect(() => {
    const animate = () => {
      const mouse = mouseRef.current
      // Smooth interpolation (lerp) - adjust 0.15 for speed
      mouse.x += (mouse.targetX - mouse.x) * 0.12
      mouse.y += (mouse.targetY - mouse.y) * 0.12
      
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${mouse.x - 125}px, ${mouse.y - 125}px)`
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current.targetX = e.clientX
    mouseRef.current.targetY = e.clientY
    
    // Throttle particle creation
    const now = Date.now()
    if (now - lastParticleTime.current > 80 && Math.random() > 0.6) {
      lastParticleTime.current = now
      const newParticle: Particle = {
        id: now + Math.random(),
        x: e.clientX,
        y: e.clientY,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 100,
      }
      setParticles(prev => [...prev.slice(-12), newParticle])
    }
  }, [colors])

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, select, textarea, [role="button"]')) {
      return
    }

    const newRipple = { id: Date.now(), x: e.clientX, y: e.clientY }
    setRipples(prev => [...prev, newRipple])
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id))
    }, 800)

    const burst = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      x: e.clientX + (Math.random() - 0.5) * 30,
      y: e.clientY + (Math.random() - 0.5) * 30,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 100,
    }))
    setParticles(prev => [...prev.slice(-8), ...burst])
  }, [colors])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('click', handleClick)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
    }
  }, [handleMouseMove, handleClick])

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(p => ({ ...p, life: p.life - 8 }))
          .filter(p => p.life > 0)
      )
    }, 60)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient blobs */}
      {blobs.map((blob) => (
        <div
          key={`${mood}-${blob.id}`}
          className={`absolute rounded-full bg-gradient-to-br ${blob.color} blur-3xl animate-blob`}
          style={{
            width: `${blob.size}px`,
            height: `${blob.size}px`,
            left: `${blob.left}%`,
            top: `${blob.top}%`,
            animationDelay: `${blob.delay}s`,
            animationDuration: `${blob.duration}s`,
          }}
        />
      ))}

      {/* Mouse glow - using ref for smooth animation */}
      <div
        ref={glowRef}
        className="absolute rounded-full blur-3xl will-change-transform"
        style={{
          width: '250px',
          height: '250px',
          left: 0,
          top: 0,
          background: `radial-gradient(circle, ${colors[0]}20 0%, transparent 70%)`,
        }}
      />

      {/* Trail particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            backgroundColor: p.color,
            opacity: p.life / 100 * 0.7,
            transform: `scale(${p.life / 100})`,
            filter: 'blur(1px)',
          }}
        />
      ))}

      {/* Click ripples */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute rounded-full animate-ripple"
          style={{
            left: r.x,
            top: r.y,
            transform: 'translate(-50%, -50%)',
            border: `2px solid ${colors[0]}40`,
          }}
        />
      ))}
    </div>
  )
}
