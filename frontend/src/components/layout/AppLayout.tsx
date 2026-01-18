import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext'
import { LogOut, User, Wallet, Home, Users, Sparkles, TrendingUp, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MusicPlayer } from '@/components/ui/MusicPlayer'
import { AnimatedOutlet } from '@/components/PageTransition'
import { NotificationBell } from '@/components/NotificationBell'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { MobileNav } from '@/components/layout/MobileNav'

function ConnectionStatus() {
  const { connectionStatus, reconnect } = useWebSocket()

  if (connectionStatus === 'connected') return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full bg-background border shadow-sm">
      {connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
        <>
          <Wifi className="h-3 w-3 animate-pulse text-yellow-500" />
          <span className="text-muted-foreground hidden lg:inline">Connecting...</span>
        </>
      ) : (
        <button 
            onClick={reconnect}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <WifiOff className="h-3 w-3 text-destructive" />
          <span className="text-destructive hidden lg:inline">Offline</span>
        </button>
      )}
    </div>
  )
}

/**
 * AppLayout - Dark Luxury / Portfolio Style
 * Features:
 * - Minimal header (Content focus)
 * - Typography navigation
 * - No heavy glass effects in nav
 */

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { isEnabled } = useFeatureFlags()
  const navigate = useNavigate()
  const location = useLocation()

  const isAdmin = user?.role === 'admin'
  const showGroups = isEnabled('groups')
  const showDebts = isEnabled('debts')
  const showGames = isEnabled('games')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  const NavLink = ({ to, label, icon: _Icon }: { to: string; label: string; icon: any }) => (

    <Link 
      to={to} 
      className={`relative group flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-widest transition-colors duration-300 ${
        isActive(to) ? 'text-white' : 'text-muted-foreground hover:text-white'
      }`}
    >
      <span>{label}</span>
      {isActive(to) && (
        <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500 to-red-500" />
      )}
    </Link>
  )

  return (
    <div className="min-h-screen bg-transparent pb-32 md:pb-0">
      {/* Desktop Header - Minimalist */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/5">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          {/* Brand - Text Only */}
          <Link to={isAdmin ? "/admin" : "/"} className="flex flex-col">
            <span className="text-2xl font-black font-heading tracking-tighter text-white leading-none">
              SPLIT
            </span>
            <span className="text-2xl font-black font-heading tracking-tighter text-white leading-none">
              BUDDY
            </span>
          </Link>

          {/* Desktop Nav - Editorial Links */}
          <nav className="hidden items-center md:flex gap-4">
            {!isAdmin && (
              <>
                <NavLink to="/" label="Trang chủ" icon={Home} />
                {showGroups && <NavLink to="/groups" label="Nhóm" icon={Users} />}
                {showDebts && <NavLink to="/debts" label="Công nợ" icon={Wallet} />}
                {showGames && <NavLink to="/games" label="Trò chơi" icon={Sparkles} />}
                <NavLink to="/analytics" label="Thống kê" icon={TrendingUp} />
              </>
            )}

            <div className="w-px h-6 bg-white/10 mx-4" />

            {/* User Actions */}
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              {!isAdmin && <NotificationBell />}
              
              <Link to="/profile" className="flex items-center gap-3 group">
                <div className="text-right hidden lg:block">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">{user?.full_name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                   {isAdmin ? 'Director' : 'Member'}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                  <User className="h-5 w-5 text-white" />
                </div>
              </Link>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-white"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </nav>

          {/* Mobile Menu Toggle (Simplified) */}
          <div className="md:hidden flex items-center gap-4">
             {/* Mobile User/Menu would go here */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 relative z-10 w-full max-w-7xl">
        <AnimatedOutlet />
      </main>

      {/* Mobile Bottom Navigation - Minimal Dark */}
      <MobileNav />

      
      {/* Background Music Player - Keep functionality but verify style later */}
      <MusicPlayer />
      
      <div id="fab-portal" />
    </div>
  )
}
