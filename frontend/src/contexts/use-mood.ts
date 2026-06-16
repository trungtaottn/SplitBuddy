import { useContext } from 'react'
import { MoodContext } from './mood-context'

export function useMood() {
  const context = useContext(MoodContext)
  if (!context) {
    throw new Error('useMood must be used within MoodProvider')
  }
  return context
}
