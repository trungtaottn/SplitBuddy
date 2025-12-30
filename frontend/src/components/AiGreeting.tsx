import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useMood, MoodType, MOOD_CONFIGS } from '@/contexts/MoodContext'
import { Smile, Frown, Moon, Flame, Zap, RefreshCw } from 'lucide-react'

// Tailwind safelist classes - needed for dynamic mood backgrounds
// from-orange-50 via-amber-50 to-yellow-50 from-blue-50 via-slate-50 to-gray-100
// from-violet-50 via-purple-50 to-indigo-50 from-emerald-50 via-teal-50 to-cyan-50
// from-pink-50 via-rose-50 to-red-50 from-gray-50 via-slate-50 to-zinc-50

interface GreetingResponse {
  message: string
  suggestion: string | null
  action: string | null
  slogan: string
}

interface AiGreetingProps {
  onCreateSession?: () => void
  onViewDebts?: () => void
}

// Static class mappings for Tailwind (dynamic classes don't work with purge)
const MOOD_BUTTON_CLASSES: Record<MoodType, string> = {
  happy: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md scale-105',
  sad: 'bg-gradient-to-r from-blue-500 to-slate-500 text-white shadow-md scale-105',
  tired: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md scale-105',
  stressed: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md scale-105',
  excited: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md scale-105',
  neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
}

const MOODS = [
  { id: 'happy' as MoodType, icon: Smile, label: 'Vui vẻ' },
  { id: 'sad' as MoodType, icon: Frown, label: 'Buồn' },
  { id: 'tired' as MoodType, icon: Moon, label: 'Mệt mỏi' },
  { id: 'stressed' as MoodType, icon: Zap, label: 'Căng thẳng' },
  { id: 'excited' as MoodType, icon: Flame, label: 'Hào hứng' },
]

const SLOGANS = [
  "Bia lạnh, bạn thân, cuộc đời tươi đẹp!",
  "Chia bill rõ ràng, tình bạn bền lâu!",
  "Có bạn có bia, có bia có vui!",
  "Tiền chia đều, vui chia đôi!",
  "Cuộc vui nào rồi cũng tàn, nhưng bill thì vẫn phải chia!",
]

export default function AiGreeting({ onCreateSession, onViewDebts }: AiGreetingProps) {
  const { user } = useAuth()
  const { mood, setMood } = useMood()
  const [greeting, setGreeting] = useState<GreetingResponse | null>(null)
  const [showMoodSelector, setShowMoodSelector] = useState(true)
  const [currentSlogan, setCurrentSlogan] = useState(() => 
    SLOGANS[Math.floor(Math.random() * SLOGANS.length)]
  )

  // Fetch greeting on mount if mood is already set
  useEffect(() => {
    if (mood !== 'neutral' && !greeting) {
      // Use local greeting instead of API call for immediate feedback
      const localGreeting = MOOD_CONFIGS[mood].greetings[
        Math.floor(Math.random() * MOOD_CONFIGS[mood].greetings.length)
      ]
      setGreeting({
        message: localGreeting,
        suggestion: null,
        action: 'create_session',
        slogan: currentSlogan,
      })
      setShowMoodSelector(false)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlogan(SLOGANS[Math.floor(Math.random() * SLOGANS.length)])
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const greetingMutation = useMutation({
    mutationFn: async (mood: string | null) => {
      const res = await api.post<{ data: GreetingResponse }>('/ai/greeting', {
        user_name: user?.full_name || 'Bạn',
        mood,
      })
      return res.data.data
    },
    onSuccess: (data) => {
      setGreeting(data)
      setShowMoodSelector(false)
    },
  })

  const handleMoodSelect = (moodId: MoodType) => {
    setMood(moodId)
    greetingMutation.mutate(moodId)
  }

  const handleAction = () => {
    if (greeting?.action === 'create_session' && onCreateSession) {
      onCreateSession()
    } else if (greeting?.action === 'view_debts' && onViewDebts) {
      onViewDebts()
    }
  }

  if (!user) return null

  const firstName = user.full_name?.split(' ').pop() || 'Bạn'

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        {/* Slogan */}
        <p 
          className="text-center text-xl md:text-2xl lg:text-3xl font-bold text-orange-500 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800"
          style={{ fontFamily: '"Dancing Script", cursive' }}
        >
          {currentSlogan}
        </p>

        {showMoodSelector ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-medium">
                Chào <span className="text-orange-500 font-bold">{firstName}</span>! 👋
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Hôm nay tâm trạng thế nào?
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2">
              {MOODS.map((moodItem) => (
                <button
                  key={moodItem.id}
                  onClick={() => handleMoodSelect(moodItem.id)}
                  disabled={greetingMutation.isPending}
                  className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all ${
                    mood === moodItem.id
                      ? MOOD_BUTTON_CLASSES[moodItem.id]
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:scale-105'
                  }`}
                >
                  <moodItem.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{moodItem.label}</span>
                </button>
              ))}
            </div>
            
            {greetingMutation.isPending && (
              <p className="text-center text-sm text-muted-foreground animate-pulse">
                Đang suy nghĩ... 🤔
              </p>
            )}
          </div>
        ) : greeting ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">{MOOD_CONFIGS[mood].emoji}</span>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Tâm trạng: {MOOD_CONFIGS[mood].nameVi}
                </span>
                <button
                  onClick={() => {
                    setShowMoodSelector(true)
                    setGreeting(null)
                  }}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Đổi tâm trạng"
                >
                  <RefreshCw className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              <p className="text-base leading-relaxed">{greeting.message}</p>
              
              {greeting.suggestion && (
                <p className="mt-2 text-sm font-medium text-orange-500">
                  {greeting.suggestion}
                </p>
              )}
            </div>
            
            {greeting.action && (
              <div className="flex justify-center">
                <Button onClick={handleAction} className="gap-2 bg-orange-500 hover:bg-orange-600">
                  {greeting.action === 'create_session' && 'Nhậu ngay đê! Chờ chi nữa...'}
                  {greeting.action === 'view_debts' && 'Xem công nợ'}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
