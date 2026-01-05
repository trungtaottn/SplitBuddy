import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { List, RotateCcw, X, Beer, Play, Pause, Shuffle, AlertTriangle } from 'lucide-react'
import { soundManager } from '@/utils/sounds'

const CATEGORIES = [
  { name: 'Thương hiệu bia', examples: 'Heineken, Tiger, Saigon...' },
  { name: 'Thương hiệu xe hơi', examples: 'Toyota, Honda, BMW...' },
  { name: 'Tên các nước', examples: 'Việt Nam, Mỹ, Nhật Bản...' },
  { name: 'Tên thủ đô', examples: 'Hà Nội, Tokyo, Paris...' },
  { name: 'Loại trái cây', examples: 'Táo, cam, xoài...' },
  { name: 'Tên cầu thủ bóng đá', examples: 'Messi, Ronaldo, Neymar...' },
  { name: 'Tên ca sĩ Việt Nam', examples: 'Sơn Tùng, Mỹ Tâm, Đàm Vĩnh Hưng...' },
  { name: 'Tên phim Hollywood', examples: 'Avengers, Titanic, Avatar...' },
  { name: 'Thương hiệu thời trang', examples: 'Gucci, Louis Vuitton, Zara...' },
  { name: 'Loại đồ ăn', examples: 'Phở, pizza, sushi...' },
  { name: 'Tên thành phố Việt Nam', examples: 'Sài Gòn, Đà Nẵng, Huế...' },
  { name: 'Tên app điện thoại', examples: 'Facebook, TikTok, Zalo...' },
  { name: 'Tên band nhạc', examples: 'BTS, Blackpink, Westlife...' },
  { name: 'Loại đồ uống', examples: 'Cà phê, trà sữa, sinh tố...' },
  { name: 'Tên game', examples: 'PUBG, Liên Quân, FIFA...' },
  { name: 'Thương hiệu điện thoại', examples: 'iPhone, Samsung, Xiaomi...' },
  { name: 'Tên diễn viên', examples: 'Brad Pitt, Angelina Jolie...' },
  { name: 'Loại hoa', examples: 'Hồng, cúc, sen...' },
  { name: 'Tên sông', examples: 'Sông Hồng, Mekong, Amazon...' },
  { name: 'Thương hiệu đồ ăn nhanh', examples: 'KFC, McDonald, Lotteria...' },
]

interface CategoriesGameProps {
  onClose?: () => void
}

export function CategoriesGame({ onClose }: CategoriesGameProps) {
  const [currentCategory, setCurrentCategory] = useState<typeof CATEGORIES[0] | null>(null)
  const [timeLeft, setTimeLeft] = useState(5)
  const [isPlaying, setIsPlaying] = useState(false)
  const [roundOver, setRoundOver] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    
    setTimeLeft(5)
    setIsPlaying(true)
    setRoundOver(false)
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setIsPlaying(false)
          setRoundOver(true)
          soundManager.playDanger()
          return 0
        }
        if (prev <= 3) {
          soundManager.playCountdownBeep()
        }
        return prev - 1
      })
    }, 1000)
  }

  const pauseTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setIsPlaying(false)
  }

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimeLeft(5)
    setIsPlaying(false)
    setRoundOver(false)
  }

  const nextCategory = () => {
    const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    setCurrentCategory(randomCategory)
    resetTimer()
    soundManager.playClick()
  }

  const nextPlayer = () => {
    resetTimer()
    startTimer()
    soundManager.playClick()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between font-heading">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-success" />
            Categories
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className={`text-7xl font-heading font-black font-mono transition-colors ${
            timeLeft <= 2 ? 'text-destructive animate-pulse' : 
            timeLeft <= 3 ? 'text-warning' : 
            'text-success'
          }`}>
            {timeLeft}
          </div>
          <p className="text-sm text-muted-foreground font-body">giây</p>
        </div>

        {/* Category Display */}
        {currentCategory ? (
          <div className="card-paper p-4 rounded-xl border-2 border-success/30 text-center">
            <p className="text-sm text-success mb-1 font-body">Chủ đề:</p>
            <p className="text-2xl font-heading font-bold text-foreground">{currentCategory.name}</p>
            <p className="text-xs text-muted-foreground mt-2 font-body">VD: {currentCategory.examples}</p>
          </div>
        ) : (
          <div className="p-4 bg-secondary/50 rounded-xl border-2 border-dashed border-border text-center">
            <p className="text-muted-foreground font-body">Bấm "Chủ đề mới" để bắt đầu!</p>
          </div>
        )}

        {/* Round Over Message */}
        {roundOver && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-center animate-bounce">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-lg font-heading font-bold text-destructive">HẾT GIỞ!</p>
            </div>
            <p className="text-sm text-destructive font-body">Người này phải uống!</p>
          </div>
        )}

        {/* Timer Controls */}
        <div className="flex gap-2 justify-center">
          {!isPlaying ? (
            <Button 
              onClick={startTimer} 
              variant="stamp"
              className="gap-2"
              disabled={!currentCategory}
            >
              <Play className="h-4 w-4" />
              {roundOver ? 'Chơi lại' : 'Bắt đầu'}
            </Button>
          ) : (
            <Button onClick={pauseTimer} variant="outline" className="gap-2">
              <Pause className="h-4 w-4" />
              Dừng
            </Button>
          )}
          
          <Button onClick={nextPlayer} variant="outline" className="gap-2" disabled={!currentCategory}>
            Người tiếp
          </Button>
          
          <Button onClick={resetTimer} variant="ghost" size="icon">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* New Category Button */}
        <Button onClick={nextCategory} className="w-full gap-2" variant="outline">
          <Shuffle className="h-4 w-4" />
          Chủ đề mới
        </Button>

        {/* Rules */}
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <Beer className="h-4 w-4 text-warning mt-0.5" />
            <div>
              <p className="font-medium text-warning font-body">Luật chơi:</p>
              <p className="text-muted-foreground font-body">Lần lượt kể tên theo chủ đề. Hết giờ hoặc lặp lại = Uống!</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
