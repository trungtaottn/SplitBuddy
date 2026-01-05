import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import { Moon, Sun } from 'lucide-react'
import { BeerIcon } from '@/components/ui/BeerIcon'

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
  "Không say không về!",
  "Bia lạnh, bạn bè ấm!",
  "Đăng nhập đi rồi nhậu!",
  "Hôm nay uống gì?",
  "Tiền chia đều, vui chia đôi!",
  "Nhậu hôm nay, lo ngày mai!",
  "Ai nợ ai, app biết hết!",
  "Đừng để bạn bè chờ!",
  "Cạn ly đi, tính sau!",
  "Nhậu đi đừng ngại!",
  "Bia chảy, tiền chảy!",
  "Bạn nhậu tốt nhất!",
  "Uống có trách nhiệm nhé!",
  "Chia bill rõ ràng nào!",
  "Nhậu vui, nhớ về!",
  "Bia ngon, bạn thân!",
  "Cạn ly, cạn túi!",
  "Nhậu đi, sống vui!",
  "Bia lạnh, tình nóng!",
  "Uống đi, lo sau!",
  "Nhậu đã, về sau!",
  "Bia ngon, bạn tốt!",
  "Cạn ly, vui vẻ!",
  "Nhậu đi, đừng sợ!",
]

// Animation variants for staggered entrance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const logoVariants = {
  hidden: { opacity: 0, y: -20, rotate: -2 },
  visible: { opacity: 1, y: 0, rotate: 0 },
}

const titleVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const sloganVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

const formVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [funMessage, setFunMessage] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
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
      navigate('/', { replace: true })
    } catch {
      toast.error('Email hoặc mật khẩu không đúng')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background texture-paper overflow-hidden">
      {/* Aged vignette effect with breathing animation */}
      <div className="fixed inset-0 pointer-events-none texture-aged animate-breathing" />
      
      {/* Film grain overlay */}
      <div className="fixed inset-0 pointer-events-none animate-film-grain opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
      }} />
      
      {/* Decorative corner ornaments with float animation */}
      <motion.div 
        className="fixed top-4 left-4 text-2xl text-primary/20 select-none animate-float-subtle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        ❧
      </motion.div>
      <motion.div 
        className="fixed top-4 right-16 text-2xl text-primary/20 select-none rotate-180 animate-float-subtle"
        style={{ animationDelay: '0.5s' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.7 }}
      >
        ❧
      </motion.div>
      <motion.div 
        className="fixed bottom-4 left-4 text-2xl text-primary/20 select-none rotate-180 animate-float-subtle"
        style={{ animationDelay: '1s' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.9 }}
      >
        ❧
      </motion.div>
      <motion.div 
        className="fixed bottom-4 right-4 text-2xl text-primary/20 select-none animate-float-subtle"
        style={{ animationDelay: '1.5s' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.1 }}
      >
        ❧
      </motion.div>
      
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
      <motion.div 
        className="w-full max-w-md relative z-10 mx-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Paper card with coffee stain */}
        <motion.div 
          className="card-paper p-8 texture-coffee"
          variants={itemVariants}
        >
          {/* Letterhead */}
          <div className="text-center mb-8 border-b-2 border-double border-border pb-6">
            <motion.div 
              className="flex justify-center mb-3"
              variants={logoVariants}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <BeerIcon size={64} animated />
            </motion.div>
            <motion.h1 
              className="text-2xl font-bold tracking-tight mb-1 overflow-hidden"
              variants={titleVariants}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              Split Buddy<span className="cursor-blink"></span>
            </motion.h1>
            <motion.p 
              className="text-xs uppercase tracking-[0.3em] text-muted-foreground mt-4"
              variants={sloganVariants}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
            >
              Nhậu đi chứ nhìn cái gì hả? 
            </motion.p>
          </div>

          {/* Fun message - typewriter style */}
          <motion.div 
            className="text-center mb-6"
            variants={itemVariants}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            key={funMessage}
          >
            <p className="text-lg italic text-muted-foreground animate-ink-fade">
              "{funMessage}"
            </p>
          </motion.div>

          {/* Login Form */}
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-5"
            variants={containerVariants}
          >
            {/* Email field */}
            <motion.div 
              className="field-vintage"
              variants={formVariants}
            >
              <Label 
                htmlFor="email" 
                className={`text-xs uppercase tracking-widest text-muted-foreground mb-2 block transition-all ${
                  focusedField === 'email' ? 'text-primary' : ''
                }`}
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
                className={`input-vintage w-full bg-transparent transition-all ${
                  focusedField === 'email' ? 'animate-underline-draw' : ''
                }`}
              />
            </motion.div>

            {/* Password field */}
            <motion.div 
              className="field-vintage"
              variants={formVariants}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <Label 
                htmlFor="password" 
                className={`text-xs uppercase tracking-widest text-muted-foreground mb-2 block transition-all ${
                  focusedField === 'password' ? 'text-primary' : ''
                }`}
              >
                Mật khẩu
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
                className={`input-vintage w-full bg-transparent transition-all ${
                  focusedField === 'password' ? 'animate-underline-draw' : ''
                }`}
              />
            </motion.div>

            {/* Submit button - Stamp style */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.02, rotate: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                type="submit" 
                variant="stamp"
                className="w-full mt-6 hover:shadow-lifted transition-all hover:-translate-y-1" 
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
            </motion.div>
          </motion.form>

          {/* Footer note */}
          <motion.div 
            className="mt-8 pt-4 border-t border-dashed border-border/50 text-center"
            variants={itemVariants}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <p className="text-xs text-muted-foreground">
              Liên hệ quản trị viên để được cấp tài khoản
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 italic">
              Est. 2024 • Made with ☕
            </p>
          </motion.div>
        </motion.div>

        {/* Shadow pages underneath */}
        <motion.div 
          className="absolute -bottom-1 left-2 right-2 h-2 bg-secondary/50 rounded-b-sm -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        />
        <motion.div 
          className="absolute -bottom-2 left-4 right-4 h-2 bg-secondary/30 rounded-b-sm -z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        />
      </motion.div>
    </div>
  )
}
