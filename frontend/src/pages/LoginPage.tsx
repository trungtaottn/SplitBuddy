import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'
import { Moon, Sun } from 'lucide-react'

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

function InteractiveBackground() {
  const [particles, setParticles] = useState<Particle[]>([])
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  
  const glowRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef<MousePos>({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const animationRef = useRef<number>()
  const lastParticleTime = useRef(0)

  const colors = ['#f97316', '#ec4899', '#ef4444', '#f59e0b', '#fb7185']

  const blobs = useMemo(() => {
    const blobColors = [
      'from-orange-400/10 to-pink-400/10',
      'from-pink-400/10 to-red-400/10',
      'from-red-400/10 to-orange-400/10',
      'from-amber-400/10 to-orange-400/10',
      'from-rose-400/10 to-pink-400/10',
    ]
    return Array.from({ length: 7 }, (_, i) => ({
      id: i,
      color: blobColors[i % blobColors.length],
      size: 200 + Math.random() * 200,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 12 + Math.random() * 8,
    }))
  }, [])

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      const mouse = mouseRef.current
      mouse.x += (mouse.targetX - mouse.x) * 0.12
      mouse.y += (mouse.targetY - mouse.y) * 0.12
      
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${mouse.x - 150}px, ${mouse.y - 150}px)`
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
  }, [])

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, select, textarea')) return

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
        prev.map(p => ({ ...p, life: p.life - 8 })).filter(p => p.life > 0)
      )
    }, 60)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {blobs.map((blob) => (
        <div
          key={blob.id}
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

      <div
        ref={glowRef}
        className="absolute rounded-full blur-3xl will-change-transform"
        style={{
          width: '300px',
          height: '300px',
          left: 0,
          top: 0,
          background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
        }}
      />

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

      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute rounded-full border-2 border-orange-400/40 animate-ripple"
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
  const { theme, toggleTheme } = useTheme()
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-pink-50 to-red-50 dark:from-orange-950/50 dark:via-pink-950/50 dark:to-red-950/50 px-4 overflow-hidden">
      <InteractiveBackground />
      
      {/* Dark mode toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
        title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5 text-yellow-500" />
        ) : (
          <Moon className="h-5 w-5 text-gray-700" />
        )}
      </button>

      <Card className="w-full max-w-md relative z-10 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-5xl animate-bounce">
            🍻
          </div>
          <CardTitle className="text-3xl font-logo gradient-text">SplitBuddy</CardTitle>
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
