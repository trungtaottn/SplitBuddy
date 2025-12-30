import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/lib/axios'
import type { FeatureFlagPublic, ApiResponse } from '@/types/api'

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

  const fetchFeatures = async () => {
    try {
      const response = await api.get<ApiResponse<FeatureFlagPublic[]>>('/auth/features')
      const featureMap: Record<string, boolean> = {}
      response.data.data.forEach(f => {
        featureMap[f.key] = f.enabled
      })
      setFeatures(featureMap)
    } catch (error) {
      console.error('Failed to fetch feature flags:', error)
      // Default all features to enabled if fetch fails
      setFeatures({})
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFeatures()
  }, [])

  const isEnabled = (key: string): boolean => {
    // If feature not found, default to enabled
    return features[key] ?? true
  }

  const refresh = async () => {
    setIsLoading(true)
    await fetchFeatures()
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
