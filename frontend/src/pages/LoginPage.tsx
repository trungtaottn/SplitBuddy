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
import { Card, CardContent } from '@/components/ui/card'

/**
 * LoginPage - Dark Luxury / Portfolio Style
 * Features:
 * - Editorial Typography (Huge text)
 * - Deep Black Background
 * - High Contrast Inputs
 * - Pill Button CTA
 */

const MOTIVATIONAL_QUOTES = [
  "CONFIDENCE IN NUMBERS.",
  "SPLIT WITH AUTHORITY.",
  "FINANCIAL CLARITY.",
  "PREMIUM EXPERIENCE.",
]

// Animation variants - Elegant Fade Up
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
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } // Apple-like ease
  },
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0])
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)])
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(email, password)
      toast.success('Chào mừng trở lại')
      navigate('/', { replace: true })
    } catch {
      toast.error('Sai thông tin đăng nhập')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden font-body text-foreground selection:bg-primary selection:text-white">
      
      {/* Background Texture - Subtle Noise */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* Theme Toggle - Minimal */}
      <motion.button
        onClick={toggleTheme}
        className="fixed top-8 right-8 z-20 p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </motion.button>

      <motion.div 
        className="w-full max-w-lg relative z-10 px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Brand Header - Editorial Style */}
        <div className="mb-12 text-center">
          <motion.h1 
            className="text-display font-heading tracking-tighter text-foreground mb-4"
            variants={itemVariants}
          >
            SPLIT<br/>BUDDY
          </motion.h1>
          <motion.div 
            className="w-12 h-1 bg-primary mx-auto mb-6"
            variants={itemVariants}
          />
          <motion.p 
            className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase"
            variants={itemVariants}
          >
            {quote}
          </motion.p>
        </div>

        {/* Login Form - Minimalist */}
        <Card variant="outline" className="border-0 bg-transparent shadow-none">
          <CardContent className="p-0">
            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-8"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants} className="space-y-1">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  variant="underline"
                  className="text-xl font-medium"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Password
                  </Label>
                  <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                    Quên mật khẩu?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  variant="underline"
                  className="text-xl font-medium tracking-widest"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="pt-6">
                <Button 
                  type="submit" 
                  variant="default" // Orange Pill Gradient
                  size="default" // Big Pill
                  className="w-full" 
                  disabled={isLoading}
                  haptic={true}
                >
                  {isLoading ? 'Đang kiểm tra...' : 'Đăng nhập'}
                </Button>
              </motion.div>
            </motion.form>
          </CardContent>
        </Card>

        {/* Footer */}
        <motion.div 
          className="mt-16 text-center"
          variants={itemVariants}
        >
          <p className="text-[10px] text-muted-foreground/40 font-mono uppercase tracking-widest">
            Split Buddy Inc. © 2026
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
