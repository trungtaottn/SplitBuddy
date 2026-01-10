import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { api } from '@/lib/axios'
import type { FeatureFlagPublic, ApiResponse } from '@/types/api'

const POLLING_INTERVAL = 120000 // 2 minutes (120 seconds) - feature flags change infrequently

interface FeatureFlagsContextType {
  features: Record<string, boolean>
  isLoading: boolean
  isEnabled: (key: string) => boolean
  refresh: () => Promise<void>
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined)

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const previousFeaturesRef = useRef<string>('')

  const fetchFeatures = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true)
    try {
      const response = await api.get<ApiResponse<FeatureFlagPublic[]>>('/auth/features')
      const featureMap: Record<string, boolean> = {}
      response.data.data.forEach(f => {
        featureMap[f.key] = f.enabled
      })
      
      // Check if features changed - if so, update and potentially notify
      const newFeaturesString = JSON.stringify(featureMap)
      if (previousFeaturesRef.current && previousFeaturesRef.current !== newFeaturesString) {
        console.log('Feature flags updated from server')
      }
      previousFeaturesRef.current = newFeaturesString
      setFeatures(featureMap)
    } catch (error) {
      console.error('Failed to fetch feature flags:', error)
      setFeatures({})
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchFeatures(true)

    // Poll for updates every 30 seconds
    const intervalId = setInterval(() => {
      fetchFeatures(false)
    }, POLLING_INTERVAL)

    // Refresh when tab becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchFeatures(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Refresh on window focus
    const handleFocus = () => {
      fetchFeatures(false)
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchFeatures])

  const isEnabled = (key: string): boolean => {
    // If feature not found, default to enabled
    return features[key] ?? true
  }

  const refresh = async () => {
    await fetchFeatures(true)
  }

  return (
    <FeatureFlagsContext.Provider value={{ features, isLoading, isEnabled, refresh }}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext)
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider')
  }
  return context
}

export function useFeature(key: string): boolean {
  const { isEnabled } = useFeatureFlags()
  return isEnabled(key)
}
