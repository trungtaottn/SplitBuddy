import { createContext, useContext, ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { FeatureFlagPublic, ApiResponse } from '@/types/api'

const POLLING_INTERVAL = 120000 // 2 minutes

interface FeatureFlagsContextType {
  features: Record<string, boolean>
  isLoading: boolean
  isEnabled: (key: string) => boolean
  refresh: () => Promise<void>
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined)

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data: features = {}, isLoading } = useQuery({
    queryKey: ['featureFlags'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<FeatureFlagPublic[]>>('/auth/features')
      const featureMap: Record<string, boolean> = {}
      response.data.data.forEach(f => {
        featureMap[f.key] = f.enabled
      })
      return featureMap
    },
    staleTime: 60000, // Consider fresh for 1 minute
    refetchInterval: POLLING_INTERVAL,
    retry: (failureCount, error: any) => {
      // Don't retry on 429 to avoid storming
      if (error?.response?.status === 429) return false
      return failureCount < 2
    },
  })

  // isEnabled helper
  const isEnabled = (key: string): boolean => {
    return features[key] ?? true
  }

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['featureFlags'] })
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
