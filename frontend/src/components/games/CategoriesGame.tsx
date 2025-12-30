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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-teal-500" />
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
          <div className={`text-7xl font-black transition-colors ${
            timeLeft <= 2 ? 'text-red-500 animate-pulse' : 
            timeLeft <= 3 ? 'text-orange-500' : 
            'text-teal-500'
          }`}>
            {timeLeft}
          </div>
          <p className="text-sm text-muted-foreground">giây</p>
        </div>

        {/* Category Display */}
        {currentCategory ? (
          <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200 text-center">
            <p className="text-sm text-teal-600 mb-1">Chủ đề:</p>
            <p className="text-2xl font-bold text-teal-800">{currentCategory.name}</p>
            <p className="text-xs text-muted-foreground mt-2">VD: {currentCategory.examples}</p>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center">
            <p className="text-muted-foreground">Bấm "Chủ đề mới" để bắt đầu!</p>
          </div>
        )}

        {/* Round Over Message */}
        {roundOver && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center animate-bounce">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-lg font-bold text-red-600">HẾT GIỞ!</p>
            </div>
            <p className="text-sm text-red-500">Người này phải uống!</p>
          </div>
        )}

        {/* Timer Controls */}
        <div className="flex gap-2 justify-center">
          {!isPlaying ? (
            <Button 
              onClick={startTimer} 
              className="gap-2 bg-teal-500 hover:bg-teal-600"
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
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <Beer className="h-4 w-4 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Luật chơi:</p>
              <p className="text-amber-700">Lần lượt kể tên theo chủ đề. Hết giờ hoặc lặp lại = Uống!</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
