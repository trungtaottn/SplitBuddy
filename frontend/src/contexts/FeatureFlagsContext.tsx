import { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { isRateLimitError } from '@/utils/errorHandler'
import type { FeatureFlagPublic, ApiResponse } from '@/types/api'
import { FeatureFlagsContext } from './feature-flags-context'

const POLLING_INTERVAL = 120000 // 2 minutes

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
    retry: (failureCount, error: unknown) => {
      // Don't retry on 429 to avoid storming
      if (isRateLimitError(error)) return false
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
