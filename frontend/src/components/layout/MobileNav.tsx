import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Wallet, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const location = useLocation()
  const { isEnabled } = useFeatureFlags()
  
  const showGroups = isEnabled('groups')
  const showDebts = isEnabled('debts')

  const isActive = (path: string) => location.pathname === path

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    ...(showGroups ? [{ path: '/groups', label: 'Groups', icon: Users }] : []),
    ...(showDebts ? [{ path: '/debts', label: 'Debts', icon: Wallet }] : []),
    { path: '/profile', label: 'Profile', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
      {/* Glass Effect Background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-white/10" />

      <div className="relative flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {


          const active = isActive(item.path)
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 transition-colors duration-300",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-6 w-6 transition-transform duration-300", active && "scale-110")} />
                {active && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute inset-0 bg-primary/20 blur-lg rounded-full"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </div>
              {/* Optional Label 
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
              */}
              {active && (
                 <motion.div 
                    layoutId="nav-indicator"
                    className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full"
                 />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
