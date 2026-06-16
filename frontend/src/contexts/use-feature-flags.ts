import { useContext } from 'react'
import { FeatureFlagsContext } from './feature-flags-context'

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
