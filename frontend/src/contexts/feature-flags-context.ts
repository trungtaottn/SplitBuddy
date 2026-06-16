import { createContext } from 'react'

export interface FeatureFlagsContextType {
  features: Record<string, boolean>
  isLoading: boolean
  isEnabled: (key: string) => boolean
  refresh: () => Promise<void>
}

export const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined)
