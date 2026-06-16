import { createContext } from 'react'
import type { MoodConfig, MoodType } from './mood-configs'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface MoodContextType {
  mood: MoodType
  setMood: (mood: MoodType) => void
  resetMood: () => void
  moodConfig: MoodConfig
  isChatOpen: boolean
  toggleChat: () => void
  openChat: () => void
  closeChat: () => void
  chatHistory: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearChat: () => void
}

export const MoodContext = createContext<MoodContextType | null>(null)
