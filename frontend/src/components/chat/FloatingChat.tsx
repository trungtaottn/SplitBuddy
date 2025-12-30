import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useMood } from '@/contexts/MoodContext'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import type { ApiResponse } from '@/types/api'

export function FloatingChat() {
  const { mood, moodConfig, isChatOpen, toggleChat, closeChat, chatHistory, addMessage } = useMood()
  
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  useEffect(() => {
    if (isChatOpen) inputRef.current?.focus()
  }, [isChatOpen])

  useEffect(() => {
    if (isChatOpen && chatHistory.length === 0) {
      const greeting = moodConfig.greetings[Math.floor(Math.random() * moodConfig.greetings.length)]
      addMessage({ id: Date.now().toString(), role: 'assistant', content: greeting, timestamp: new Date() })
    }
  }, [isChatOpen])

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post<ApiResponse<{ response: string }>>('/ai/chat', {
        message, mood,
        context: `Bạn là SplitBuddy - người bạn thân. Xưng "tôi/bạn". Có dark humor. Tâm trạng user: ${moodConfig.nameVi}. Trả lời ngắn gọn, tự nhiên.`,
      })
      return res.data.data.response
    },
    onSuccess: (response) => {
      addMessage({ id: Date.now().toString(), role: 'assistant', content: response, timestamp: new Date() })
    },
  })

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return
    addMessage({ id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() })
    chatMutation.mutate(input)
    setInput('')
  }

  // Floating button when closed
  if (!isChatOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 bg-gradient-to-br from-orange-500 to-pink-500 text-white"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
      </button>
    )
  }

  // Minimalist chat window
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border dark:border-gray-700">
      {/* Simple Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{moodConfig.emoji}</span>
          <span className="font-medium">SplitBuddy</span>
        </div>
        <button onClick={closeChat} className="p-1 hover:bg-white/20 dark:hover:bg-black/20 rounded-full">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages - Clean & Simple */}
      <div className="h-72 overflow-y-auto p-3 space-y-3 bg-gray-50 dark:bg-gray-900">
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-br-sm'
                : 'bg-gray-100 dark:bg-gray-700 shadow-sm rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 shadow-sm px-3 py-2 rounded-2xl rounded-bl-sm">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Simple Input */}
      <div className="p-3 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Nhắn gì đó..."
            className="flex-1 px-3 py-2 text-sm rounded-full border dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:border-orange-400"
            disabled={chatMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
