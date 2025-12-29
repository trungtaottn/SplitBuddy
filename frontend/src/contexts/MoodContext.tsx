import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type MoodType = 'happy' | 'sad' | 'tired' | 'stressed' | 'excited' | 'neutral'

interface MoodTheme {
  primary: string
  secondary: string
  accent: string
  background: string
  gradient: string
  textColor: string
  cardBg: string
  borderColor: string
}

interface MoodConfig {
  name: string
  nameVi: string
  emoji: string
  theme: MoodTheme
  aiPersonality: string
  greetings: string[]
  ambientSound: string | null
}

export const MOOD_CONFIGS: Record<MoodType, MoodConfig> = {
  happy: {
    name: 'happy',
    nameVi: 'Vui vẻ',
    emoji: '😊',
    theme: {
      primary: '#f97316', // orange-500
      secondary: '#fbbf24', // amber-400
      accent: '#fb923c', // orange-400
      background: 'from-orange-50 via-amber-50 to-yellow-50',
      gradient: 'from-orange-500 to-amber-500',
      textColor: 'text-orange-900',
      cardBg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      borderColor: 'border-orange-200',
    },
    aiPersonality: 'vui vẻ, hài hước, hay đùa, sử dụng nhiều từ ngữ tích cực',
    greetings: [
      'Chào bạn! Hôm nay trông bạn vui quá! Có chuyện gì hay kể tôi nghe đi!',
      'Ê, thấy bạn vui là tôi cũng vui lây rồi đó! Làm gì vui thế?',
      'Wow, năng lượng tích cực quá! Chia sẻ với tôi đi nào!',
    ],
    ambientSound: '/sounds/happy-ambient.mp3',
  },
  sad: {
    name: 'sad',
    nameVi: 'Buồn',
    emoji: '😢',
    theme: {
      primary: '#3b82f6', // blue-500
      secondary: '#60a5fa', // blue-400
      accent: '#93c5fd', // blue-300
      background: 'from-blue-50 via-slate-50 to-gray-100',
      gradient: 'from-blue-500 to-slate-500',
      textColor: 'text-blue-900',
      cardBg: 'bg-gradient-to-br from-blue-50 to-slate-50',
      borderColor: 'border-blue-200',
    },
    aiPersonality: 'nhẹ nhàng, đồng cảm, an ủi, lắng nghe, không phán xét',
    greetings: [
      'Này, tôi thấy bạn có vẻ không vui lắm... Muốn tâm sự gì không?',
      'Có chuyện gì à? Tôi đây, sẵn sàng lắng nghe bạn.',
      'Đôi khi cuộc sống khó khăn lắm, tôi hiểu mà. Kể tôi nghe đi.',
    ],
    ambientSound: '/sounds/sad-ambient.mp3',
  },
  tired: {
    name: 'tired',
    nameVi: 'Mệt mỏi',
    emoji: '😴',
    theme: {
      primary: '#8b5cf6', // violet-500
      secondary: '#a78bfa', // violet-400
      accent: '#c4b5fd', // violet-300
      background: 'from-violet-50 via-purple-50 to-indigo-50',
      gradient: 'from-violet-500 to-purple-500',
      textColor: 'text-violet-900',
      cardBg: 'bg-gradient-to-br from-violet-50 to-purple-50',
      borderColor: 'border-violet-200',
    },
    aiPersonality: 'nhẹ nhàng, thư giãn, khuyến khích nghỉ ngơi, không tạo áp lực',
    greetings: [
      'Trông bạn mệt quá... Hôm nay làm việc nhiều à?',
      'Này, đừng cố quá nhé. Nghỉ ngơi một chút đi.',
      'Mệt thì cứ thả lỏng đi, có gì tôi giúp được không?',
    ],
    ambientSound: '/sounds/tired-ambient.mp3',
  },
  stressed: {
    name: 'stressed',
    nameVi: 'Căng thẳng',
    emoji: '😰',
    theme: {
      primary: '#10b981', // emerald-500
      secondary: '#34d399', // emerald-400
      accent: '#6ee7b7', // emerald-300
      background: 'from-emerald-50 via-teal-50 to-cyan-50',
      gradient: 'from-emerald-500 to-teal-500',
      textColor: 'text-emerald-900',
      cardBg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-200',
    },
    aiPersonality: 'bình tĩnh, hỗ trợ, đưa ra lời khuyên thực tế, giúp giảm stress',
    greetings: [
      'Hít thở sâu nào... Có gì căng thẳng kể tôi nghe đi.',
      'Stress à? Bình tĩnh, mọi chuyện rồi sẽ ổn thôi.',
      'Tôi biết bạn đang áp lực. Chia sẻ với tôi nhé, hai người gánh dễ hơn một người.',
    ],
    ambientSound: '/sounds/stressed-ambient.mp3',
  },
  excited: {
    name: 'excited',
    nameVi: 'Hào hứng',
    emoji: '🔥',
    theme: {
      primary: '#ec4899', // pink-500
      secondary: '#f472b6', // pink-400
      accent: '#f9a8d4', // pink-300
      background: 'from-pink-50 via-rose-50 to-red-50',
      gradient: 'from-pink-500 to-rose-500',
      textColor: 'text-pink-900',
      cardBg: 'bg-gradient-to-br from-pink-50 to-rose-50',
      borderColor: 'border-pink-200',
    },
    aiPersonality: 'năng lượng cao, hào hứng, khuyến khích, sử dụng nhiều cảm thán',
    greetings: [
      'WOW! Năng lượng của bạn đang MAX rồi đó! Có gì hot thế?',
      'Ê ê, hào hứng gì thế? Kể tôi nghe đi!',
      'Thấy bạn hype quá! Có party gì không đấy?',
    ],
    ambientSound: '/sounds/excited-ambient.mp3',
  },
  neutral: {
    name: 'neutral',
    nameVi: 'Bình thường',
    emoji: '😐',
    theme: {
      primary: '#6b7280', // gray-500
      secondary: '#9ca3af', // gray-400
      accent: '#d1d5db', // gray-300
      background: 'from-gray-50 via-slate-50 to-zinc-50',
      gradient: 'from-gray-500 to-slate-500',
      textColor: 'text-gray-900',
      cardBg: 'bg-gradient-to-br from-gray-50 to-slate-50',
      borderColor: 'border-gray-200',
    },
    aiPersonality: 'thân thiện, cân bằng, sẵn sàng trò chuyện về mọi thứ',
    greetings: [
      'Chào bạn! Hôm nay thế nào rồi?',
      'Này, có gì mới không?',
      'Ê, lâu rồi không gặp! Kể tôi nghe đi.',
    ],
    ambientSound: null,
  },
}

interface MoodContextType {
  mood: MoodType
  setMood: (mood: MoodType) => void
  moodConfig: MoodConfig
  isChatOpen: boolean
  toggleChat: () => void
  openChat: () => void
  closeChat: () => void
  chatHistory: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearChat: () => void
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const MoodContext = createContext<MoodContextType | null>(null)

export function MoodProvider({ children }: { children: ReactNode }) {
  const [mood, setMoodState] = useState<MoodType>(() => {
    const saved = localStorage.getItem('splitbuddy-mood')
    return (saved as MoodType) || 'neutral'
  })
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

  const moodConfig = MOOD_CONFIGS[mood]

  // Persist mood to localStorage
  useEffect(() => {
    localStorage.setItem('splitbuddy-mood', mood)
  }, [mood])

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

export function useMood() {
  const context = useContext(MoodContext)
  if (!context) {
    throw new Error('useMood must be used within MoodProvider')
  }
  return context
}
