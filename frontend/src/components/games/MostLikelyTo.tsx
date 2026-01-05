import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThumbsUp, RotateCcw, X, Beer, Shuffle, HelpCircle } from 'lucide-react'
import { soundManager } from '@/utils/sounds'

const QUESTIONS = [
  // Fun & Light
  'Ai có khả năng nhất sẽ trở thành triệu phú?',
  'Ai có khả năng nhất sẽ nổi tiếng?',
  'Ai có khả năng nhất sẽ sống đến 100 tuổi?',
  'Ai có khả năng nhất sẽ kết hôn đầu tiên?',
  'Ai có khả năng nhất sẽ có nhiều con nhất?',
  'Ai có khả năng nhất sẽ đi du lịch vòng quanh thế giới?',
  'Ai có khả năng nhất sẽ viết sách?',
  'Ai có khả năng nhất sẽ làm CEO?',
  
  // Embarrassing
  'Ai có khả năng nhất sẽ say xỉn hôm nay?',
  'Ai có khả năng nhất sẽ làm điều gì đó xấu hổ tối nay?',
  'Ai có khả năng nhất sẽ quên mặc quần áo ra ngoài?',
  'Ai có khả năng nhất sẽ ngủ quên ở party?',
  'Ai có khả năng nhất sẽ khóc vì 1 bộ phim?',
  'Ai có khả năng nhất sẽ nhắn tin cho ex lúc say?',
  'Ai có khả năng nhất sẽ post ảnh xấu lên mạng?',
  'Ai có khả năng nhất sẽ té trước đám đông?',
  
  // Relationships
  'Ai có khả năng nhất sẽ hẹn hò với người nổi tiếng?',
  'Ai có khả năng nhất sẽ có nhiều người yêu nhất?',
  'Ai có khả năng nhất sẽ được cầu hôn ở nơi công cộng?',
  'Ai có khả năng nhất sẽ chọn sai người?',
  'Ai có khả năng nhất sẽ có affair?',
  'Ai có khả năng nhất sẽ bị friendzone?',
  
  // Personality
  'Ai có khả năng nhất sẽ nói dối để thoát tình huống?',
  'Ai có khả năng nhất sẽ giữ bí mật tốt nhất?',
  'Ai có khả năng nhất sẽ gossip nhiều nhất?',
  'Ai có khả năng nhất sẽ làm drama?',
  'Ai có khả năng nhất sẽ là người bạn tốt nhất lúc khó khăn?',
  'Ai có khả năng nhất sẽ quên sinh nhật bạn bè?',
  
  // Wild
  'Ai có khả năng nhất sẽ bị bắt vì làm điều gì đó điên rồ?',
  'Ai có khả năng nhất sẽ tham gia reality show?',
  'Ai có khả năng nhất sẽ làm stripper?',
  'Ai có khả năng nhất sẽ có hình xăm kín người?',
  'Ai có khả năng nhất sẽ nhảy xuống biển không mặc gì?',
  'Ai có khả năng nhất sẽ có one night stand với người lạ?',
  
  // Skills
  'Ai có khả năng nhất sẽ thắng cuộc thi ăn?',
  'Ai có khả năng nhất sẽ thắng trong 1 cuộc cãi nhau?',
  'Ai có khả năng nhất sẽ sống sót trong zombie apocalypse?',
  'Ai có khả năng nhất sẽ giành giải Nobel?',
  'Ai có khả năng nhất sẽ làm được 100 cái hít đất?',
]

interface MostLikelyToProps {
  onClose?: () => void
}

export function MostLikelyTo({ onClose }: MostLikelyToProps) {
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null)
  const [usedQuestions, setUsedQuestions] = useState<Set<number>>(new Set())
  const [isRevealing, setIsRevealing] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const getRandomQuestion = () => {
    // Find unused questions
    const availableIndices = QUESTIONS.map((_, i) => i).filter(i => !usedQuestions.has(i))
    
    if (availableIndices.length === 0) {
      // Reset if all used
      setUsedQuestions(new Set())
      return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]
    }
    
    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
    setUsedQuestions(new Set([...usedQuestions, randomIndex]))
    return QUESTIONS[randomIndex]
  }

  const nextQuestion = () => {
    setIsRevealing(true)
    soundManager.playClick()
    
    // Countdown
    setCountdown(3)
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          setCurrentQuestion(getRandomQuestion())
          setIsRevealing(false)
          soundManager.playReveal()
          return 0
        }
        soundManager.playCountdownBeep()
        return prev - 1
      })
    }, 1000)
  }

  const resetGame = () => {
    setCurrentQuestion(null)
    setUsedQuestions(new Set())
    soundManager.playClick()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-indigo-500" />
            Ai có khả năng nhất?
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetGame} title="Chơi lại">
              <RotateCcw className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Đã dùng: {usedQuestions.size}/{QUESTIONS.length}</span>
          <span>Còn lại: {QUESTIONS.length - usedQuestions.size}</span>
        </div>

        {/* Question Display */}
        <div className="min-h-[200px] flex items-center justify-center">
          {isRevealing ? (
            <div className="text-center space-y-4">
              <div className="text-6xl font-heading font-bold text-primary animate-pulse">
                {countdown}
              </div>
              <p className="text-muted-foreground font-body">Chuẩn bị chỉ người...</p>
            </div>
          ) : currentQuestion ? (
            <div className="text-center space-y-4">
              <div className="card-paper p-6 rounded-2xl border-2 border-primary/30">
                <p className="text-xl font-heading font-semibold text-foreground leading-relaxed">
                  {currentQuestion}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-body">
                <ThumbsUp className="h-4 w-4 text-primary" />
                <span>Đếm 3-2-1 rồi chỉ!</span>
                <ThumbsUp className="h-4 w-4 text-primary" />
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <HelpCircle className="h-16 w-16 mx-auto text-primary/30" />
              <p className="text-muted-foreground font-body">Bấm nút để bắt đầu!</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button
          onClick={nextQuestion}
          disabled={isRevealing}
          variant="stamp"
          className="w-full gap-2"
          size="lg"
        >
          <Shuffle className="h-5 w-5" />
          {currentQuestion ? 'Câu tiếp theo' : 'Bắt đầu!'}
        </Button>

        {/* Rules */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <Beer className="h-4 w-4 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Luật chơi:</p>
              <p className="text-amber-700">Đếm 3-2-1, mọi người cùng chỉ. Ai bị chỉ nhiều nhất phải uống!</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
