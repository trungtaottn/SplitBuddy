import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext'
import { LogOut, User, Wallet, Home, Users, Shield, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MusicPlayer } from '@/components/ui/MusicPlayer'
import { AnimatedOutlet } from '@/components/PageTransition'
import { SkipLink } from '@/components/SkipLink'

/**
 * AppLayout - Vintage Paper Style
 * Features:
 * - Paper texture background
 * - Typewriter navigation
 * - Notebook-style header
 */

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { isEnabled } = useFeatureFlags()
  const navigate = useNavigate()
  const location = useLocation()

  const isAdmin = user?.role === 'admin'
  
  // Check feature flags
  const showGroups = isEnabled('groups')
  const showDebts = isEnabled('debts')
  const showGames = isEnabled('games')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 texture-paper">
      {/* Aged paper vignette effect */}
      <div className="fixed inset-0 pointer-events-none texture-aged" />
      
      {/* Accessibility: Skip to main content */}
      <SkipLink />
      
      {/* Desktop Header - Letterhead Style */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b-2 border-double border-border">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 md:h-16">
          {/* Logo - Vintage style with beer icon */}
          <Link 
            to={isAdmin ? "/admin" : "/"} 
            className="flex items-center gap-3 group"
          >
            <span className="text-xl md:text-2xl animate-bounce">🍺</span>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-bold tracking-tight text-foreground">
                SplitBuddy
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground -mt-1">
                Bill Splitter
              </span>
            </div>
          </Link>

          {/* Desktop Nav - Typewriter tabs */}
          <nav className="hidden items-center gap-1 md:flex">
            {isAdmin ? (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Shield className="h-4 w-4" strokeWidth={1.5} />
                  <span>Quản lý</span>
                </Button>
              </Link>
            ) : (
              <>
                {showGroups && (
                  <Link to="/groups">
                    <Button 
                      variant={isActive('/groups') ? 'outline' : 'ghost'} 
                      size="sm" 
                      className="gap-2"
                    >
                      <Users className="h-4 w-4" strokeWidth={1.5} />
                      <span>Nhóm</span>
                    </Button>
                  </Link>
                )}
                {showDebts && (
                  <Link to="/debts" data-onboarding="debts">
                    <Button 
                      variant={isActive('/debts') ? 'outline' : 'ghost'} 
                      size="sm" 
                      className="gap-2"
                    >
                      <Wallet className="h-4 w-4" strokeWidth={1.5} />
                      <span>Công nợ</span>
                    </Button>
                  </Link>
                )}
                {showGames && (
                  <Link to="/games" data-onboarding="games">
                    <Button 
                      variant={isActive('/games') ? 'outline' : 'ghost'} 
                      size="sm" 
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                      <span>Trò chơi</span>
                    </Button>
                  </Link>
                )}
              </>
            )}

            {/* Divider */}
            <div className="w-px h-6 bg-border mx-2" />

            {/* User section */}
            <Link 
              to="/profile" 
              className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-accent/30 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-primary/50 bg-primary/10 text-primary">
                <User className="h-3.5 w-3.5" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium max-w-[100px] truncate">
                {user?.full_name}
              </span>
            </Link>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </nav>

          {/* Mobile: User info */}
          <div className="flex items-center gap-2 md:hidden">
            <Link 
              to="/profile" 
              className="max-w-24 truncate text-sm font-medium text-foreground"
            >
              {user?.full_name}
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main 
        id="main-content" 
        tabIndex={-1} 
        className="container mx-auto px-4 py-6 md:py-8 focus:outline-none relative z-10"
      >
        <AnimatedOutlet />
      </main>

      {/* Mobile Bottom Navigation - Tab bar style */}
      {isAdmin ? (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border bg-card md:hidden">
          <div className="flex h-16 items-center justify-center">
            <Link
              to="/admin"
              className={`flex flex-col items-center gap-1 px-6 py-2 ${
                isActive('/admin') 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              <Shield className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                Admin
              </span>
            </Link>
          </div>
        </nav>
      ) : (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-2 border-border md:hidden">
          <div className="flex h-16 items-center justify-around px-2">
            <Link
              to="/"
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-sm transition-all ${
                isActive('/') 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground'
              }`}
            >
              <Home className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                Home
              </span>
            </Link>

            {showGroups && (
              <Link
                to="/groups"
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-sm transition-all ${
                  isActive('/groups') 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground'
                }`}
              >
                <Users className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[10px] uppercase tracking-wider font-semibold">
                  Nhóm
                </span>
              </Link>
            )}

            {showDebts && (
              <Link
                to="/debts"
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-sm transition-all ${
                  isActive('/debts') 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground'
                }`}
              >
                <Wallet className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[10px] uppercase tracking-wider font-semibold">
                  Nợ
                </span>
              </Link>
            )}

            {showGames && (
              <Link
                to="/games"
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-sm transition-all ${
                  isActive('/games') 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground'
                }`}
              >
                <Sparkles className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[10px] uppercase tracking-wider font-semibold">
                  Games
                </span>
              </Link>
            )}
          </div>
        </nav>
      )}
      
      {/* Background Music Player */}
      <MusicPlayer />
    </div>
  )
}
