import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useMood, MOOD_CONFIGS } from '@/contexts/MoodContext'
import { 
  MessageCircle, X, Send, Sparkles, Beer, Smile, Frown, 
  Moon, Zap, Flame, Loader2, Volume2, VolumeX, Minimize2
} from 'lucide-react'
import type { ApiResponse } from '@/types/api'

const MOOD_ICONS = {
  happy: Smile,
  sad: Frown,
  tired: Moon,
  stressed: Zap,
  excited: Flame,
  neutral: MessageCircle,
}

export function FloatingChat() {
  const { 
    mood, setMood, moodConfig, isChatOpen, toggleChat, closeChat,
    chatHistory, addMessage 
  } = useMood()
  
  const [input, setInput] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isChatOpen, isMinimized])

  // Send initial greeting when chat opens for first time
  useEffect(() => {
    if (isChatOpen && chatHistory.length === 0) {
      const greeting = moodConfig.greetings[Math.floor(Math.random() * moodConfig.greetings.length)]
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      })
    }
  }, [isChatOpen])

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post<ApiResponse<{ response: string }>>('/ai/chat', {
        message,
        mood,
        personality: moodConfig.aiPersonality,
        context: `Bạn là SplitBuddy - một người bạn thân thiết. Xưng hô "tôi/bạn". 
Có thể đùa giỡn, có dark humor nhẹ nhàng khi phù hợp.
Tâm trạng hiện tại của người dùng: ${moodConfig.nameVi}.
Tính cách AI: ${moodConfig.aiPersonality}.
Hãy trả lời ngắn gọn, tự nhiên như đang chat với bạn bè.`,
      })
      return res.data.data.response
    },
    onSuccess: (response) => {
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      })
    },
  })

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return

    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    })

    chatMutation.mutate(input)
    setInput('')
  }

  const handleMoodChange = (newMood: keyof typeof MOOD_CONFIGS) => {
    setMood(newMood)
    setShowMoodPicker(false)
    
    // Add mood change message
    const newConfig = MOOD_CONFIGS[newMood]
    addMessage({
      id: Date.now().toString(),
      role: 'assistant',
      content: newConfig.greetings[Math.floor(Math.random() * newConfig.greetings.length)],
      timestamp: new Date(),
    })
  }

  const MoodIcon = MOOD_ICONS[mood]

  if (!isChatOpen) {
    return (
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg 
          flex items-center justify-center transition-all duration-300 hover:scale-110
          bg-gradient-to-br ${moodConfig.theme.gradient} text-white`}
        title="Chat với SplitBuddy"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
      </button>
    )
  }

  if (isMinimized) {
    return (
      <div 
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full 
          shadow-lg cursor-pointer bg-gradient-to-r ${moodConfig.theme.gradient} text-white`}
        onClick={() => setIsMinimized(false)}
      >
        <MoodIcon className="h-5 w-5" />
        <span className="text-sm font-medium">SplitBuddy</span>
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      </div>
    )
  }

  return (
    <Card className={`fixed bottom-6 right-6 z-50 w-96 max-h-[600px] flex flex-col shadow-2xl 
      border-2 ${moodConfig.theme.borderColor} overflow-hidden`}>
      {/* Header */}
      <div className={`p-4 bg-gradient-to-r ${moodConfig.theme.gradient} text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Beer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold">SplitBuddy</h3>
              <p className="text-xs opacity-80">Luôn sẵn sàng lắng nghe bạn</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Thu nhỏ"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              onClick={closeChat}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Mood Selector */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs opacity-80">Tâm trạng:</span>
          <button
            onClick={() => setShowMoodPicker(!showMoodPicker)}
            className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors"
          >
            <span>{moodConfig.emoji}</span>
            <span>{moodConfig.nameVi}</span>
          </button>
        </div>
        
        {/* Mood Picker Dropdown */}
        {showMoodPicker && (
          <div className="mt-2 p-2 bg-white/10 rounded-lg grid grid-cols-3 gap-1">
            {Object.entries(MOOD_CONFIGS).map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleMoodChange(key as keyof typeof MOOD_CONFIGS)}
                className={`p-2 rounded-lg text-center text-xs transition-colors
                  ${mood === key ? 'bg-white/30' : 'hover:bg-white/20'}`}
              >
                <span className="text-lg">{config.emoji}</span>
                <p>{config.nameVi}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] ${moodConfig.theme.cardBg}`}>
        {chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                msg.role === 'user'
                  ? `bg-gradient-to-r ${moodConfig.theme.gradient} text-white rounded-br-md`
                  : 'bg-white shadow-md rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span className="text-xs font-medium text-gray-500">SplitBuddy</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-white shadow-md p-3 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Đang suy nghĩ...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`p-4 border-t ${moodConfig.theme.borderColor} bg-white`}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Nhắn gì đó với tôi..."
            className="flex-1 px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{ 
              ['--tw-ring-color' as string]: moodConfig.theme.primary 
            }}
            disabled={chatMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className={`rounded-full w-10 h-10 p-0 bg-gradient-to-r ${moodConfig.theme.gradient} hover:opacity-90`}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-2 flex-wrap">
          <button
            onClick={() => setInput('Tôi muốn tạo một cuộc nhậu')}
            className={`text-xs px-3 py-1 rounded-full border ${moodConfig.theme.borderColor} hover:bg-gray-50`}
          >
            🍻 Tạo cuộc nhậu
          </button>
          <button
            onClick={() => setInput('Chơi trò chơi đi')}
            className={`text-xs px-3 py-1 rounded-full border ${moodConfig.theme.borderColor} hover:bg-gray-50`}
          >
            🎮 Chơi game
          </button>
          <button
            onClick={() => setInput('Kể chuyện cười đi')}
            className={`text-xs px-3 py-1 rounded-full border ${moodConfig.theme.borderColor} hover:bg-gray-50`}
          >
            😂 Kể chuyện cười
          </button>
        </div>
      </div>
    </Card>
  )
}
