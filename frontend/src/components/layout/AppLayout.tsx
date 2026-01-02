import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useMood } from '@/contexts/MoodContext'
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext'
import { LogOut, User, Wallet, Home, Users, Shield, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InteractiveBackground } from '@/components/ui/InteractiveBackground'
import { MusicPlayer } from '@/components/ui/MusicPlayer'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { moodConfig } = useMood()
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

  // Dark mode backgrounds per mood (lighter colors for better visibility)
  const darkBgMap: Record<string, string> = {
    happy: 'dark:from-orange-950/50 dark:via-amber-950/50 dark:to-yellow-950/50',
    sad: 'dark:from-blue-950/50 dark:via-slate-950/50 dark:to-gray-950/50',
    tired: 'dark:from-violet-950/50 dark:via-purple-950/50 dark:to-indigo-950/50',
    stressed: 'dark:from-emerald-950/50 dark:via-teal-950/50 dark:to-cyan-950/50',
    excited: 'dark:from-pink-950/50 dark:via-rose-950/50 dark:to-red-950/50',
    neutral: 'dark:from-gray-950/50 dark:via-slate-950/50 dark:to-zinc-950/50',
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${moodConfig.theme.background} ${darkBgMap[moodConfig.name] || darkBgMap.neutral} pb-16 md:pb-0 transition-colors duration-500`}>
      <InteractiveBackground />
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/90 backdrop-blur-md shadow-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 md:h-16">
          <Link to={isAdmin ? "/admin" : "/"} className="flex items-center gap-2 group">
            <span className="text-xl md:text-2xl animate-bounce">🍻</span>
            <span className="hidden sm:inline font-logo text-xl gradient-text">SplitBuddy</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-4 md:flex">
            {isAdmin ? (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Quản lý Users
                </Button>
              </Link>
            ) : (
              <>
                {showGroups && (
                  <Link to="/groups">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Users className="h-4 w-4" />
                      Nhóm
                    </Button>
                  </Link>
                )}
                {showDebts && (
                  <Link to="/debts">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Wallet className="h-4 w-4" />
                      Công nợ
                    </Button>
                  </Link>
                )}
                {showGames && (
                  <Link to="/games">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Trò chơi
                    </Button>
                  </Link>
                )}
              </>
            )}

            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                <User className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">{user?.full_name}</span>
            </Link>

            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>

          {/* Mobile: Show user avatar and logout */}
          <div className="flex items-center gap-2 md:hidden">
            <Link to="/profile" className="max-w-24 truncate text-sm font-medium hover:text-primary">
              {user?.full_name}
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      {isAdmin ? (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white dark:bg-gray-900 dark:border-gray-800 md:hidden">
          <div className="flex h-16 items-center justify-center">
            <Link
              to="/admin"
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                isActive('/admin') ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Shield className="h-5 w-5" />
              <span className="text-xs">Quản lý Users</span>
            </Link>
          </div>
        </nav>
      ) : (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-lg md:hidden">
          <div className="flex h-16 items-center justify-around">
            <Link
              to="/"
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                isActive('/') 
                  ? 'text-primary bg-primary/10 scale-105' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-primary'
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs font-medium">Trang chủ</span>
            </Link>
            {showGroups && (
              <Link
                to="/groups"
                className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                  isActive('/groups') 
                    ? 'text-primary bg-primary/10 scale-105' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-primary'
                }`}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs font-medium">Nhóm</span>
              </Link>
            )}
            {showDebts && (
              <Link
                to="/debts"
                className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                  isActive('/debts') 
                    ? 'text-primary bg-primary/10 scale-105' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-primary'
                }`}
              >
                <Wallet className="h-5 w-5" />
                <span className="text-xs font-medium">Công nợ</span>
              </Link>
            )}
            {showGames && (
              <Link
                to="/games"
                className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                  isActive('/games') 
                    ? 'text-primary bg-primary/10 scale-105' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-primary'
                }`}
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-medium">Trò chơi</span>
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
