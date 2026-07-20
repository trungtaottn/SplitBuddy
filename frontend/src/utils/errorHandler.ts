import { AxiosError } from 'axios'
import type { ApiError } from '@/types/api'
import { toast } from '@/components/ui/toaster'

/**
 * Extract error message from API error response
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check if it's an Axios error with API response
    if ('response' in error) {
      const axiosError = error as AxiosError<ApiError>
      if (axiosError.response?.data?.error) {
        return axiosError.response.data.error.message
      }
      // Fallback to HTTP status text
      if (axiosError.response?.statusText) {
        return axiosError.response.statusText
      }
    }
    return error.message
  }
  return 'Có lỗi xảy ra. Vui lòng thử lại.'
}

/**
 * Get error code from API error response
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof Error && 'response' in error) {
    const axiosError = error as AxiosError<ApiError>
    return axiosError.response?.data?.error?.code
  }
  return undefined
}

/**
 * Check if error is retryable (network errors, 5xx, etc.)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error && 'response' in error) {
    const axiosError = error as AxiosError
    const status = axiosError.response?.status
    
    // Network errors (no response)
    if (!status) {
      return true
    }
    
    // 5xx server errors are retryable
    if (status >= 500 && status < 600) {
      return true
    }
    
    // 429 Too Many Requests
    if (status === 429) {
      return true
    }
  }
  
  return false
}

/**
 * Show error toast with proper message
 */
export function showError(error: unknown, defaultMessage = 'Có lỗi xảy ra. Vui lòng thử lại.') {
  const message = getErrorMessage(error) || defaultMessage
  toast.error(message)
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: unknown
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error
      }
      
      // Don't wait after last attempt
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}
