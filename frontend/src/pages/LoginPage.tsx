import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  life: number
}

function InteractiveBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [particles, setParticles] = useState<Particle[]>([])
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])

  const colors = ['#f97316', '#ec4899', '#ef4444', '#f59e0b', '#fb7185']

  const blobs = useMemo(() => {
    const blobColors = [
      'from-orange-400/30 to-pink-400/30',
      'from-pink-400/30 to-red-400/30',
      'from-red-400/30 to-orange-400/30',
      'from-amber-400/30 to-orange-400/30',
      'from-rose-400/30 to-pink-400/30',
    ]
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      color: blobColors[i % blobColors.length],
      size: 200 + Math.random() * 150,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 20 + Math.random() * 10,
    }))
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    
    // Add trail particles occasionally
    if (Math.random() > 0.7) {
      const newParticle: Particle = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 100,
      }
      setParticles(prev => [...prev.slice(-20), newParticle])
    }
  }, [])

  const handleClick = useCallback((e: MouseEvent) => {
    // Add ripple effect on click
    const newRipple = { id: Date.now(), x: e.clientX, y: e.clientY }
    setRipples(prev => [...prev, newRipple])
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id))
    }, 1000)

    // Burst of particles
    const burst = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: e.clientX + (Math.random() - 0.5) * 50,
      y: e.clientY + (Math.random() - 0.5) * 50,
      size: 6 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 100,
    }))
    setParticles(prev => [...prev.slice(-15), ...burst])
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
    }
  }, [handleMouseMove, handleClick])

  // Fade out particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(p => ({ ...p, life: p.life - 5 }))
          .filter(p => p.life > 0)
      )
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      {/* Gradient blobs */}
      {blobs.map((blob) => (
        <div
          key={blob.id}
          className={`absolute rounded-full bg-gradient-to-br ${blob.color} blur-3xl animate-blob pointer-events-none`}
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

      {/* Mouse glow effect */}
      <div
        className="absolute rounded-full bg-gradient-radial from-orange-400/20 via-pink-400/10 to-transparent blur-2xl pointer-events-none transition-all duration-100"
        style={{
          width: '300px',
          height: '300px',
          left: mousePos.x - 150,
          top: mousePos.y - 150,
        }}
      />

      {/* Trail particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none transition-all duration-300"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            backgroundColor: p.color,
            opacity: p.life / 100,
            transform: `scale(${p.life / 100})`,
            filter: 'blur(1px)',
          }}
        />
      ))}

      {/* Click ripples */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute rounded-full border-2 border-orange-400/50 pointer-events-none animate-ripple"
          style={{
            left: r.x,
            top: r.y,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  )
}

const FUN_MESSAGES = [
  "Nhậu đi, lo gì!",
  "Chia tiền công bằng, ai cũng vui!",
  "Không say không về!",
  "Một người vì mọi người, mọi người vì bia!",
  "Cuộc đời ngắn lắm, nhậu đi đừng ngại!",
  "Bia lạnh, bạn bè ấm!",
  "Đăng nhập đi rồi nhậu!",
  "Hôm nay uống gì?",
  "Cạn ly đi, chuyện đời tính sau!",
  "Tiền chia đều, vui chia đôi!",
  "Bạn nhậu tốt, bạn đời tốt hơn!",
  "Nhậu hôm nay, lo ngày mai!",
  "Ai nợ ai, app này biết hết!",
  "Bia chảy về đâu, tiền chảy về đó!",
  "Đừng để bạn bè chờ lâu!",
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [funMessage, setFunMessage] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setFunMessage(FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)])
    const interval = setInterval(() => {
      setFunMessage(FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)])
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(email, password)
      toast.success('Đăng nhập thành công!')
      navigate('/')
    } catch {
      toast.error('Email hoặc mật khẩu không đúng')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-pink-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 overflow-hidden">
      <InteractiveBackground />
      <Card className="w-full max-w-md relative z-10 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-5xl animate-bounce">
            🍻
          </div>
          <CardTitle className="text-2xl gradient-text">SplitBuddy</CardTitle>
          <CardDescription className="transition-all duration-500">{funMessage}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nhập cái i meo dô"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="chỗ này nhập cái mẹt khẻu dô"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Liên hệ quản trị viên để được cấp tài khoản <br />
            Cụ thể là ai thì chưa biết... hẹ hẹ..
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
