import { createContext, useContext } from 'react'

export interface OnboardingStep {
  id: string
  target?: string
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  emoji?: string
}

export interface OnboardingContextType {
  isActive: boolean
  currentStep: number
  steps: OnboardingStep[]
  startOnboarding: () => void
  endOnboarding: () => void
  nextStep: () => void
  prevStep: () => void
  skipOnboarding: () => void
}

export const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}
