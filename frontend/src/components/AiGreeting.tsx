import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useMood, MoodType, MOOD_CONFIGS } from '@/contexts/MoodContext'
import { Smile, Frown, Moon, Flame, Zap, RefreshCw } from 'lucide-react'

/**
 * AiGreeting - Vintage Paper Style
 * Features:
 * - Typewriter mood selection
 * - Sepia monochrome colors
 * - Paper card styling
 */

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

// Vintage monochrome mood button styles
const MOOD_BUTTON_CLASSES: Record<MoodType, string> = {
  happy: 'bg-primary text-primary-foreground border-primary shadow-paper',
  sad: 'bg-muted text-muted-foreground border-muted-foreground shadow-paper',
  tired: 'bg-accent text-accent-foreground border-accent shadow-paper',
  stressed: 'bg-warning/20 text-warning border-warning shadow-paper',
  excited: 'bg-primary text-primary-foreground border-primary shadow-paper',
  neutral: 'bg-card text-card-foreground border-border',
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
    <Card className="card-paper">
      <CardContent className="p-6">
        {/* Slogan - Vintage Typewriter Style */}
        <div className="text-center mb-6 pb-4 border-b-2 border-dotted border-border">
          <p className="text-2xl md:text-3xl italic text-primary font-heading font-bold tracking-tight">
            "{currentSlogan}"
          </p>
        </div>

        {showMoodSelector ? (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-xl font-medium">
                Chào <span className="text-primary font-bold">{firstName}</span>!
              </p>
              <p className="text-base text-muted-foreground mt-1 italic">
                Hôm nay tâm trạng thế nào?
              </p>
            </div>
            
            {/* Mood Selection - Vintage Button Style */}
            <div className="flex flex-wrap justify-center gap-3">
              {MOODS.map((moodItem) => (
                <button
                  key={moodItem.id}
                  onClick={() => handleMoodSelect(moodItem.id)}
                  disabled={greetingMutation.isPending}
                  className={`
                    flex flex-col items-center gap-2 rounded-lg px-5 py-4
                    border-2 transition-all duration-200
                    hover:scale-105 active:scale-95
                    ${mood === moodItem.id
                      ? MOOD_BUTTON_CLASSES[moodItem.id]
                      : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-secondary'
                    }
                  `}
                >
                  <moodItem.icon className="h-6 w-6" strokeWidth={2} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {moodItem.label}
                  </span>
                </button>
              ))}
            </div>
            
            {greetingMutation.isPending && (
              <p className="text-center text-sm text-muted-foreground italic cursor-blink">
                Đang suy nghĩ...
              </p>
            )}
          </div>
        ) : greeting ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-3xl">{MOOD_CONFIGS[mood].emoji}</span>
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  {MOOD_CONFIGS[mood].nameVi}
                </span>
                <button
                  onClick={() => {
                    setShowMoodSelector(true)
                    setGreeting(null)
                  }}
                  className="p-1.5 rounded-sm hover:bg-secondary transition-colors border border-transparent hover:border-border"
                  title="Đổi tâm trạng"
                >
                  <RefreshCw className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                </button>
              </div>
              <p className="text-lg leading-relaxed font-body">{greeting.message}</p>
              
              {greeting.suggestion && (
                <p className="mt-3 text-base font-medium text-primary italic">
                  {greeting.suggestion}
                </p>
              )}
            </div>
            
            {greeting.action && (
              <div className="flex justify-center pt-2">
                <Button onClick={handleAction} variant="default" size="lg" className="gap-2 font-bold uppercase tracking-wider px-8">
                  {greeting.action === 'create_session' && 'Nhậu ngay đê!'}
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
