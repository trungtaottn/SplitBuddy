import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Toaster } from './components/ui/toaster'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SessionDetailPage from './pages/SessionDetailPage'
import DebtsPage from './pages/DebtsPage'
import GroupsPage from './pages/GroupsPage'
import GroupDebtsPage from './pages/GroupDebtsPage'
import AdminPage from './pages/AdminPage'
import GamesPage from './pages/GamesPage'
import AppLayout from './components/layout/AppLayout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AdminRedirect() {
  const { user } = useAuth()
  
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }
  
  return <DashboardPage />
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminRedirect />} />
          <Route path="sessions/:id" element={<SessionDetailPage />} />
          <Route path="debts" element={<DebtsPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="groups/:groupId/debts" element={<GroupDebtsPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
