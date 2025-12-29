import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useMood } from '@/contexts/MoodContext'
import { LogOut, User, Wallet, Home, Users, Shield, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { moodConfig } = useMood()
  const navigate = useNavigate()
  const location = useLocation()

  const isAdmin = user?.role === 'admin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className={`min-h-screen bg-gradient-to-b ${moodConfig.theme.background} pb-16 md:pb-0 transition-colors duration-500`}>
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 border-b border-white/20 glass shadow-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 md:h-16">
          <Link to={isAdmin ? "/admin" : "/"} className="flex items-center gap-2 text-lg font-bold md:text-xl group">
            <span className="text-2xl md:text-3xl group-hover:animate-bounce">🍻</span>
            <span className="hidden sm:inline gradient-text">SplitBuddy</span>
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
                <Link to="/groups">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Users className="h-4 w-4" />
                    Nhóm
                  </Button>
                </Link>
                <Link to="/debts">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Wallet className="h-4 w-4" />
                    Công nợ
                  </Button>
                </Link>
                <Link to="/games">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Trò chơi
                  </Button>
                </Link>
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
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white md:hidden">
          <div className="flex h-16 items-center justify-center">
            <Link
              to="/admin"
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                isActive('/admin') ? 'text-primary' : 'text-gray-500'
              }`}
            >
              <Shield className="h-5 w-5" />
              <span className="text-xs">Quản lý Users</span>
            </Link>
          </div>
        </nav>
      ) : (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/20 shadow-lg md:hidden">
          <div className="flex h-16 items-center justify-around">
            <Link
              to="/"
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                isActive('/') 
                  ? 'text-primary bg-primary/10 scale-105' 
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs font-medium">Trang chủ</span>
            </Link>
            <Link
              to="/groups"
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                isActive('/groups') 
                  ? 'text-primary bg-primary/10 scale-105' 
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs font-medium">Nhóm</span>
            </Link>
            <Link
              to="/debts"
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                isActive('/debts') 
                  ? 'text-primary bg-primary/10 scale-105' 
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              <Wallet className="h-5 w-5" />
              <span className="text-xs font-medium">Công nợ</span>
            </Link>
            <Link
              to="/games"
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                isActive('/games') 
                  ? 'text-primary bg-primary/10 scale-105' 
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-medium">Trò chơi</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  )
}
