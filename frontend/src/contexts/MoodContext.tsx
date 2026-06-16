import { useState, useEffect, ReactNode } from 'react'
import { MOOD_CONFIGS, type MoodType } from './mood-configs'
import { MoodContext, type ChatMessage } from './mood-context'

// Helper to get today's date string
const getTodayKey = () => new Date().toISOString().split('T')[0]

// Helper to get mood storage key for a user
const getMoodKey = (userId?: string) => `splitbuddy-mood-${userId || 'guest'}`
const getMoodDateKey = (userId?: string) => `splitbuddy-mood-date-${userId || 'guest'}`

// Get current user ID from localStorage
const getCurrentUserId = (): string | undefined => {
  try {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsed = JSON.parse(userData)
      return parsed?.id
    }
  } catch { /* ignore */ }
  return undefined
}

export function MoodProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(getCurrentUserId)
  
  const [mood, setMoodState] = useState<MoodType>(() => {
    const userId = getCurrentUserId()
    const savedMood = localStorage.getItem(getMoodKey(userId))
    const savedDate = localStorage.getItem(getMoodDateKey(userId))
    const today = getTodayKey()
    
    // Reset to neutral if it's a new day or no mood saved
    if (savedDate !== today || !savedMood) {
      return 'neutral'
    }
    return savedMood as MoodType
  })
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

  const moodConfig = MOOD_CONFIGS[mood]

  // Persist mood to localStorage with user ID and date
  useEffect(() => {
    if (mood !== 'neutral') {
      localStorage.setItem(getMoodKey(currentUserId), mood)
      localStorage.setItem(getMoodDateKey(currentUserId), getTodayKey())
    }
  }, [mood, currentUserId])
  
  // Poll for user changes (handles same-tab login/logout)
  useEffect(() => {
    const checkUserChange = () => {
      const newUserId = getCurrentUserId()
      if (newUserId !== currentUserId) {
        setCurrentUserId(newUserId)
        
        // Load mood for new user
        const savedMood = localStorage.getItem(getMoodKey(newUserId))
        const savedDate = localStorage.getItem(getMoodDateKey(newUserId))
        const today = getTodayKey()
        
        if (savedDate === today && savedMood) {
          setMoodState(savedMood as MoodType)
        } else {
          setMoodState('neutral')
        }
        setChatHistory([]) // Clear chat on user change
      }
    }
    
    // Check immediately and then every 500ms
    checkUserChange()
    const interval = setInterval(checkUserChange, 500)
    return () => clearInterval(interval)
  }, [currentUserId])

  // Apply mood theme to document
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--mood-primary', moodConfig.theme.primary)
    root.style.setProperty('--mood-secondary', moodConfig.theme.secondary)
    root.style.setProperty('--mood-accent', moodConfig.theme.accent)
    
    // Add mood class to body for global styling
    document.body.className = document.body.className.replace(/mood-\w+/g, '')
    document.body.classList.add(`mood-${mood}`)
  }, [mood, moodConfig])

  const setMood = (newMood: MoodType) => {
    setMoodState(newMood)
  }
  
  // Reset mood to neutral (called on logout)
  const resetMood = () => {
    setMoodState('neutral')
    setChatHistory([])
  }

  const toggleChat = () => setIsChatOpen(prev => !prev)
  const openChat = () => setIsChatOpen(true)
  const closeChat = () => setIsChatOpen(false)

  const addMessage = (message: ChatMessage) => {
    setChatHistory(prev => [...prev, message])
  }

  const clearChat = () => setChatHistory([])

  return (
    <MoodContext.Provider value={{
      mood,
      setMood,
      resetMood,
      moodConfig,
      isChatOpen,
      toggleChat,
      openChat,
      closeChat,
      chatHistory,
      addMessage,
      clearChat,
    }}>
      {children}
    </MoodContext.Provider>
  )
}
