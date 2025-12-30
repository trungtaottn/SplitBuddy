import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'

function AnimatedBackground() {
  const blobs = useMemo(() => {
    const colors = [
      'from-orange-400/30 to-pink-400/30',
      'from-pink-400/30 to-red-400/30',
      'from-red-400/30 to-orange-400/30',
      'from-amber-400/30 to-orange-400/30',
      'from-rose-400/30 to-pink-400/30',
    ]
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      size: 150 + Math.random() * 200,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 15 + Math.random() * 10,
    }))
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Floating gradient blobs */}
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
      
      {/* Rising bubbles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={`bubble-${i}`}
          className="absolute rounded-full bg-white/20 dark:bg-white/10 animate-rise"
          style={{
            width: `${8 + Math.random() * 16}px`,
            height: `${8 + Math.random() * 16}px`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${10 + Math.random() * 15}s`,
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
      <AnimatedBackground />
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
                placeholder="email@example.com"
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
                placeholder="••••••••"
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
