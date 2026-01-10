import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { MoodProvider } from './contexts/MoodContext'
import { MusicProvider } from './contexts/MusicContext'
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Toaster } from './components/ui/toaster'
import { MoodEffects } from './components/MoodEffects'
import { InstallPrompt } from './components/InstallPrompt'
import { OfflineIndicator } from './components/OfflineIndicator'
import { OnboardingProvider } from './components/Onboarding'
import { ErrorBoundary } from './components/ErrorBoundary'
import AppLayout from './components/layout/AppLayout'
import { PageSkeleton } from './components/ui/skeleton'

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SessionDetailPage = lazy(() => import('./pages/SessionDetailPage'))
const DebtsPage = lazy(() => import('./pages/DebtsPage'))
const GroupsPage = lazy(() => import('./pages/GroupsPage'))
const GroupDebtsPage = lazy(() => import('./pages/GroupDebtsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const GamesPage = lazy(() => import('./pages/GamesPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))

// Loading fallback component
function PageLoader() {
  return (
    <div className="animate-in fade-in duration-300">
      <PageSkeleton />
    </div>
  )
}

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
  
  return (
    <Suspense fallback={<PageLoader />}>
      <DashboardPage />
    </Suspense>
  )
}

function App() {
  return (
    <ThemeProvider>
      <FeatureFlagsProvider>
        <MoodProvider>
          <MusicProvider>
          <OnboardingProvider>
          {/* PWA Indicators */}
          <OfflineIndicator />
          
          {/* Global Error Boundary */}
          <ErrorBoundary>
          <Routes>
            <Route 
              path="/login" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LoginPage />
                </Suspense>
              } 
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminRedirect />} />
              <Route 
                path="sessions/:id" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SessionDetailPage />
                  </Suspense>
                } 
              />
              <Route 
                path="debts" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <DebtsPage />
                  </Suspense>
                } 
              />
              <Route 
                path="groups" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <GroupsPage />
                  </Suspense>
                } 
              />
              <Route 
                path="groups/:groupId/debts" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <GroupDebtsPage />
                  </Suspense>
                } 
              />
              <Route 
                path="games" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <GamesPage />
                  </Suspense>
                } 
              />
              <Route 
                path="profile" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ProfilePage />
                  </Suspense>
                } 
              />
              <Route
                path="templates"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <TemplatesPage />
                  </Suspense>
                }
              />
              <Route
                path="analytics"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AnalyticsPage />
                  </Suspense>
                }
              />
              <Route 
                path="admin" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminPage />
                  </Suspense>
                } 
              />
            </Route>
          </Routes>
          </ErrorBoundary>
          
          <MoodEffects />
          <Toaster />
          
          {/* PWA Install Prompt */}
          <InstallPrompt />
          </OnboardingProvider>
          </MusicProvider>
        </MoodProvider>
      </FeatureFlagsProvider>
    </ThemeProvider>
  )
}

export default App
