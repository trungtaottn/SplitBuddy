import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import { Moon, Sun } from 'lucide-react'

/**
 * LoginPage - Vintage Letterhead Style
 * Features:
 * - Paper texture background
 * - Typewriter form inputs
 * - Stamp-style login button
 * - Coffee stain decoration
 */

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
    <div className="relative min-h-screen flex items-center justify-center bg-background texture-paper overflow-hidden">
      {/* Aged vignette effect */}
      <div className="fixed inset-0 pointer-events-none texture-aged" />
      
      {/* Decorative corner ornaments */}
      <div className="fixed top-4 left-4 text-2xl text-primary/20 select-none">❧</div>
      <div className="fixed top-4 right-16 text-2xl text-primary/20 select-none rotate-180">❧</div>
      <div className="fixed bottom-4 left-4 text-2xl text-primary/20 select-none rotate-180">❧</div>
      <div className="fixed bottom-4 right-4 text-2xl text-primary/20 select-none">❧</div>
      
      {/* Dark mode toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-20 p-2 rounded-sm bg-card border-2 border-border shadow-paper hover:shadow-lifted transition-all"
        title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5 text-warning" strokeWidth={1.5} />
        ) : (
          <Moon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
        )}
      </button>

      {/* Login Card - Document/Letterhead Style */}
      <div className="w-full max-w-md relative z-10 mx-4">
        {/* Paper card with coffee stain */}
        <div className="card-paper p-8 texture-coffee animate-paper-slide">
          {/* Letterhead */}
          <div className="text-center mb-8 border-b-2 border-double border-border pb-6">
            <div className="text-5xl mb-3 animate-bounce">🍺</div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">
              SplitBuddy
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Bill Splitting System
            </p>
          </div>

          {/* Fun message - typewriter style */}
          <div className="text-center mb-6">
            <p className="text-sm italic text-muted-foreground animate-ink-fade">
              "{funMessage}"
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div className="field-vintage">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-vintage w-full bg-transparent"
              />
            </div>

            {/* Password field */}
            <div className="field-vintage">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                Mật khẩu
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-vintage w-full bg-transparent"
              />
            </div>

            {/* Submit button - Stamp style */}
            <Button 
              type="submit" 
              variant="stamp"
              className="w-full mt-6" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-pulse">...</span>
                  Đang xử lý
                </span>
              ) : (
                'Đăng nhập'
              )}
            </Button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-dashed border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              Liên hệ quản trị viên để được cấp tài khoản
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 italic">
              Est. 2024 • Made with ☕
            </p>
          </div>
        </div>

        {/* Shadow pages underneath */}
        <div className="absolute -bottom-1 left-2 right-2 h-2 bg-secondary/50 rounded-b-sm -z-10" />
        <div className="absolute -bottom-2 left-4 right-4 h-2 bg-secondary/30 rounded-b-sm -z-20" />
      </div>
    </div>
  )
}
