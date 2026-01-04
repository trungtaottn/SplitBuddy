import { useState, useEffect, useCallback } from 'react'

// Hook for detecting online/offline status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// Queue system for offline actions
interface QueuedAction {
  id: string
  type: string
  payload: unknown
  timestamp: number
  retries: number
}

const QUEUE_STORAGE_KEY = 'splitbuddy-offline-queue'
const MAX_RETRIES = 3

function getQueue(): QueuedAction[] {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveQueue(queue: QueuedAction[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
  } catch {
    // Storage might be full, try to clear old items
    console.warn('Failed to save offline queue')
  }
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>(() => getQueue())
  const isOnline = useOnlineStatus()

  // Add action to queue
  const enqueue = useCallback((type: string, payload: unknown) => {
    const action: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    }
    
    const newQueue = [...queue, action]
    setQueue(newQueue)
    saveQueue(newQueue)
    
    return action.id
  }, [queue])

  // Remove action from queue
  const dequeue = useCallback((id: string) => {
    const newQueue = queue.filter(a => a.id !== id)
    setQueue(newQueue)
    saveQueue(newQueue)
  }, [queue])

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setQueue([])
    saveQueue([])
  }, [])

  // Process queue when online
  const processQueue = useCallback(async (
    handler: (action: QueuedAction) => Promise<boolean>
  ) => {
    if (!isOnline || queue.length === 0) return

    const results = await Promise.allSettled(
      queue.map(async (action) => {
        try {
          const success = await handler(action)
          if (success) {
            dequeue(action.id)
          } else if (action.retries < MAX_RETRIES) {
            // Increment retry count
            const newQueue = queue.map(a => 
              a.id === action.id 
                ? { ...a, retries: a.retries + 1 }
                : a
            )
            setQueue(newQueue)
            saveQueue(newQueue)
          } else {
            // Max retries reached, remove from queue
            dequeue(action.id)
          }
        } catch {
          // Handle error, increment retry if possible
        }
      })
    )

    return results
  }, [isOnline, queue, dequeue])

  return {
    queue,
    queueLength: queue.length,
    enqueue,
    dequeue,
    clearQueue,
    processQueue,
    isOnline,
  }
}

// Hook for caching data locally
interface CacheOptions {
  key: string
  ttl?: number // Time to live in milliseconds
}

export function useLocalCache<T>(options: CacheOptions) {
  const { key, ttl } = options

  const getCache = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(`cache-${key}`)
      if (!stored) return null

      const { data, timestamp } = JSON.parse(stored)
      
      // Check if expired
      if (ttl && Date.now() - timestamp > ttl) {
        localStorage.removeItem(`cache-${key}`)
        return null
      }

      return data as T
    } catch {
      return null
    }
  }, [key, ttl])

  const setCache = useCallback((data: T) => {
    try {
      localStorage.setItem(`cache-${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
      }))
    } catch {
      console.warn('Failed to cache data')
    }
  }, [key])

  const clearCache = useCallback(() => {
    localStorage.removeItem(`cache-${key}`)
  }, [key])

  return {
    getCache,
    setCache,
    clearCache,
  }
}

// Hook for offline-first data fetching
interface UseOfflineDataOptions<T> {
  queryKey: string
  queryFn: () => Promise<T>
  cacheTTL?: number
}

export function useOfflineData<T>({ 
  queryKey, 
  queryFn, 
  cacheTTL = 1000 * 60 * 60 // 1 hour default
}: UseOfflineDataOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const isOnline = useOnlineStatus()
  const { getCache, setCache } = useLocalCache<T>({ key: queryKey, ttl: cacheTTL })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    // Try to get from cache first
    const cached = getCache()
    if (cached) {
      setData(cached)
      setIsLoading(false)
    }

    // If online, fetch fresh data
    if (isOnline) {
      try {
        const freshData = await queryFn()
        setData(freshData)
        setCache(freshData)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch'))
        // Keep cached data if fetch fails
        if (!cached) {
          setData(null)
        }
      }
    } else if (!cached) {
      setError(new Error('Offline - no cached data available'))
    }

    setIsLoading(false)
  }, [isOnline, queryFn, getCache, setCache])

  useEffect(() => {
    fetchData()
  }, []) // Only run once on mount

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    isOnline,
    isFromCache: !isOnline && data !== null,
  }
}

