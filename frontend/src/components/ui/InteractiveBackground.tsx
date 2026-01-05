import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

/**
 * InteractiveBackground - Vintage Paper Style
 * Features:
 * - Sepia monochrome particles
 * - Subtle paper-like effects
 * - Warm brown tones only
 */

interface Particle {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  life: number
}

interface MousePos {
  x: number
  y: number
  targetX: number
  targetY: number
}

// Vintage sepia colors only
const VINTAGE_COLORS = [
  'hsl(28, 65%, 26%)',   // Sepia primary
  'hsl(32, 50%, 58%)',   // Gold
  'hsl(30, 25%, 45%)',   // Coffee
  'hsl(38, 20%, 60%)',   // Faded paper
]

export function InteractiveBackground() {
  const [particles, setParticles] = useState<Particle[]>([])
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  
  const glowRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef<MousePos>({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const animationRef = useRef<number>()
  const lastParticleTime = useRef(0)

  // Subtle sepia blobs
  const blobs = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      size: 150 + Math.random() * 150,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 15 + Math.random() * 10,
      opacity: 0.03 + Math.random() * 0.02,
    }))
  }, [])

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      const mouse = mouseRef.current
      mouse.x += (mouse.targetX - mouse.x) * 0.1
      mouse.y += (mouse.targetY - mouse.y) * 0.1
      
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${mouse.x - 100}px, ${mouse.y - 100}px)`
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
    
    // Throttle particle creation - more subtle
    const now = Date.now()
    if (now - lastParticleTime.current > 120 && Math.random() > 0.7) {
      lastParticleTime.current = now
      const newParticle: Particle = {
        id: now + Math.random(),
        x: e.clientX,
        y: e.clientY,
        size: 2 + Math.random() * 3,
        opacity: 0.2 + Math.random() * 0.2,
        life: 100,
      }
      setParticles(prev => [...prev.slice(-8), newParticle])
    }
  }, [])

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

    // Subtle burst
    const burst = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + i,
      x: e.clientX + (Math.random() - 0.5) * 20,
      y: e.clientY + (Math.random() - 0.5) * 20,
      size: 3 + Math.random() * 4,
      opacity: 0.3,
      life: 100,
    }))
    setParticles(prev => [...prev.slice(-5), ...burst])
  }, [])

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
          .map(p => ({ ...p, life: p.life - 6 }))
          .filter(p => p.life > 0)
      )
    }, 60)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Subtle sepia gradient blobs */}
      {blobs.map((blob) => (
        <div
          key={blob.id}
          className="absolute rounded-full blur-3xl animate-blob"
          style={{
            width: `${blob.size}px`,
            height: `${blob.size}px`,
            left: `${blob.left}%`,
            top: `${blob.top}%`,
            animationDelay: `${blob.delay}s`,
            animationDuration: `${blob.duration}s`,
            backgroundColor: VINTAGE_COLORS[blob.id % VINTAGE_COLORS.length],
            opacity: blob.opacity,
          }}
        />
      ))}

      {/* Mouse glow - subtle sepia */}
      <div
        ref={glowRef}
        className="absolute rounded-full blur-3xl will-change-transform"
        style={{
          width: '200px',
          height: '200px',
          left: 0,
          top: 0,
          background: 'radial-gradient(circle, hsl(28 65% 26% / 0.05) 0%, transparent 70%)',
        }}
      />

      {/* Trail particles - sepia dots */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            backgroundColor: VINTAGE_COLORS[0],
            opacity: (p.life / 100) * p.opacity,
            transform: `scale(${p.life / 100})`,
          }}
        />
      ))}

      {/* Click ripples - sepia border */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute rounded-full animate-ripple border-2"
          style={{
            left: r.x,
            top: r.y,
            transform: 'translate(-50%, -50%)',
            borderColor: 'hsl(28 65% 26% / 0.2)',
          }}
        />
      ))}
    </div>
  )
}
