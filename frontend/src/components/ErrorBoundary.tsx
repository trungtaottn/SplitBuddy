import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { RefreshCw, Home, AlertTriangle, Bug } from 'lucide-react'

// Check if we're in development mode
const isDevelopment = typeof import.meta !== 'undefined' && 
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true

interface Props {
  children: ReactNode
  /** Fallback UI to show on error */
  fallback?: ReactNode
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Whether to show detailed error info (dev only) */
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * ErrorBoundary - Catches JavaScript errors anywhere in child component tree
 * 
 * Features:
 * - Displays friendly error message
 * - Option to retry
 * - Option to navigate home
 * - Dev mode shows error details
 * - Follows Minimalist Retro design
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)
    
    // Log to console in development
    if (isDevelopment) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const showDetails = this.props.showDetails ?? isDevelopment

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full shadow-lg border-destructive/20">
            <CardHeader className="text-center pb-4">
              {/* Error Illustration */}
              <div className="mx-auto mb-4 relative">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-10 w-10 text-destructive animate-pulse" />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-secondary/50 rounded-full blur-md" />
              </div>

              <CardTitle className="text-xl font-heading text-foreground">
                Úi! Có gì đó không ổn rồi 😵
              </CardTitle>
              <CardDescription className="font-body mt-2">
                Ứng dụng gặp lỗi không mong muốn. Đừng lo, bạn có thể thử lại hoặc quay về trang chủ.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1 gap-2 btn-gradient"
                >
                  <RefreshCw className="h-4 w-4" />
                  Thử lại
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Home className="h-4 w-4" />
                  Về trang chủ
                </Button>
              </div>

              {/* Error details (dev mode) */}
              {showDetails && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground flex items-center gap-2 hover:text-foreground">
                    <Bug className="h-4 w-4" />
                    Chi tiết lỗi (Dev)
                  </summary>
                  <div className="mt-2 p-3 rounded-lg bg-secondary/50 overflow-auto">
                    <p className="text-sm font-mono text-destructive break-all">
                      {this.state.error.message}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Fun message */}
              <p className="text-center text-xs text-muted-foreground mt-4">
                💡 Tip: Nếu lỗi vẫn xảy ra, thử refresh lại trang (Ctrl + R)
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * useErrorHandler - Hook to catch and handle errors in functional components
 */
export function useErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error)
    
    // Could integrate with error reporting service here
    // e.g., Sentry.captureException(error)
  }

  return { handleError }
}

/**
 * AsyncBoundary - Wrapper for async operations with loading and error states
 */
interface AsyncBoundaryProps {
  children: ReactNode
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
  loadingFallback?: ReactNode
}

export function AsyncBoundary({
  children,
  isLoading = false,
  error = null,
  onRetry,
  loadingFallback,
}: AsyncBoundaryProps) {
  if (isLoading && loadingFallback) {
    return <>{loadingFallback}</>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
          Có lỗi xảy ra
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {error.message || 'Không thể tải dữ liệu. Vui lòng thử lại.'}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </Button>
        )}
      </div>
    )
  }

  return <>{children}</>
}

export default ErrorBoundary

