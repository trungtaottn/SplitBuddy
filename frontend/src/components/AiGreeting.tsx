import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useMood, MoodType } from '@/contexts/MoodContext'
import { Smile, Frown, Moon, Flame, Zap } from 'lucide-react'

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

const MOODS = [
  { id: 'happy' as MoodType, icon: Smile, label: 'Vui vẻ', color: 'orange' },
  { id: 'sad' as MoodType, icon: Frown, label: 'Buồn', color: 'blue' },
  { id: 'tired' as MoodType, icon: Moon, label: 'Mệt mỏi', color: 'violet' },
  { id: 'stressed' as MoodType, icon: Zap, label: 'Căng thẳng', color: 'emerald' },
  { id: 'excited' as MoodType, icon: Flame, label: 'Hào hứng', color: 'pink' },
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
  const [showMoodSelector, setShowMoodSelector] = useState(mood === 'neutral')
  const [currentSlogan, setCurrentSlogan] = useState(() => 
    SLOGANS[Math.floor(Math.random() * SLOGANS.length)]
  )

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
          className="text-center text-xl md:text-2xl lg:text-3xl font-bold text-orange-500 mb-4 pb-4 border-b border-gray-100"
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
                      ? `bg-gradient-to-r from-${moodItem.color}-500 to-${moodItem.color}-600 text-white shadow-md scale-105`
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:scale-105'
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
                  {greeting.action === 'create_session' && '🍻 Tạo cuộc nhậu ngay!'}
                  {greeting.action === 'view_debts' && '📊 Xem công nợ'}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
