import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dices, Sparkles, MessageCircleQuestion, Flame, RotateCcw, Beer, HelpCircle, X, Skull, Zap, AlertCircle, Target, Hand, Volume2, VolumeX, Users, CircleDot, Crown, ThumbsUp, List, TrendingUp } from 'lucide-react'
import { toast } from '@/components/ui/toaster'
import { soundManager, vibrate, vibrationPatterns } from '@/utils/sounds'
import type { ApiResponse } from '@/types/api'
import { SpinWheel, DrinkingCounter, PlayerRotation, KingsCup, MostLikelyTo, CategoriesGame, HighOrLow } from '@/components/games'
import { BeerIcon } from '@/components/ui/BeerIcon'

type GameType = 'truth_or_dare' | 'never_have_i_ever' | 'challenge' | 'dice' | 'wheel'

const GAME_INFO: Record<GameType, { name: string; color: string; warning: string }> = {
  truth_or_dare: { 
    name: 'Sự thật hay Thách thức', 
    color: 'pink',
    warning: 'Chuẩn bị tinh thần! Có thể bạn sẽ phải thú nhận điều không muốn...'
  },
  never_have_i_ever: { 
    name: 'Tôi chưa bao giờ', 
    color: 'blue',
    warning: 'Ai đã từng làm sẽ phải uống! Bạn có bí mật gì không?'
  },
  challenge: { 
    name: 'Thử thách', 
    color: 'orange',
    warning: 'Thử thách điên rồ đang chờ! Từ chối = PHẠT NẶNG!'
  },
  dice: { 
    name: 'Tung xúc xắc', 
    color: 'purple',
    warning: 'Số phận sẽ quyết định! Ra đôi = Bạn là VƯƠNG!'
  },
  wheel: {
    name: 'Vòng quay',
    color: 'emerald',
    warning: 'Ai sẽ là người được chọn? Quay để biết!'
  }
}

const SUSPENSE_MESSAGES = [
  'Đang xáo trộn câu hỏi...',
  'Hmm, câu nào nhỉ...',
  'Chuẩn bị tinh thần nào...',
  'Đây sẽ là câu THÚ VỊ...',
  'Số phận đang quyết định...',
]

const GameIcon = ({ type, className }: { type: GameType; className?: string }) => {
  switch (type) {
    case 'truth_or_dare': return <Target className={className} />
    case 'never_have_i_ever': return <Hand className={className} />
    case 'challenge': return <Flame className={className} />
    case 'dice': return <Dices className={className} />
    case 'wheel': return <CircleDot className={className} />
  }
}

interface GameContent {
  id: string
  game_type: string
  content_type: string
  content: string
  difficulty: string | null
}

interface DiceResult {
  dice1: number
  dice2: number
  total: number
  is_double: boolean
  rule_name: string
  rule_description: string
  action: string
  severity: 'safe' | 'mild' | 'spicy' | 'extreme'
  target: 'self' | 'choose' | 'all' | 'left' | 'right' | 'none'
}

const GAME_RULES = {
  truth_or_dare: {
    title: 'Luật chơi Sự thật hay Thách thức',
    rules: [
      'Chọn Sự thật hoặc Thách thức',
      'Không trả lời = Uống 2 shot',
      'Từ chối thách thức = Uống 3 shot',
      'Nói dối bị phát hiện = Uống 5 shot'
    ]
  },
  never_have_i_ever: {
    title: 'Luật chơi Tôi chưa bao giờ',
    rules: [
      'Đọc câu "Tôi chưa bao giờ..."',
      'Ai ĐÃ TỪNG làm điều đó phải UỐNG',
      'Uống = Thừa nhận đã làm',
      'Không uống = Chưa bao giờ làm'
    ]
  },
  challenge: {
    title: 'Luật chơi Thử thách',
    rules: [
      'Hoàn thành thử thách được đưa ra',
      'Thất bại = Uống theo độ khó',
      'Dễ: 1 shot | Trung bình: 2 shot',
      'Khó: 3 shot | Cực khó: 5 shot'
    ]
  },
  dice: {
    title: 'Luật chơi Xúc xắc',
    rules: [
      'Tung 2 xúc xắc và làm theo kết quả',
      'Ra đôi = Chọn người uống',
      'Tổng 7 = Cả bàn cùng uống',
      'Tổng 2 hoặc 12 = Người quay uống gấp đôi'
    ]
  }
}

// Game phases for smooth overlay transitions
type GamePhase = 'idle' | 'confirming' | 'loading' | 'countdown' | 'revealed'

export default function GamesPage() {
  const [currentGame, setCurrentGame] = useState<GameType | null>(null)
  const [gameContent, setGameContent] = useState<GameContent | null>(null)
  const [diceResult, setDiceResult] = useState<DiceResult | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [showRules, setShowRules] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isEnabled())
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const [adultContentEnabled, setAdultContentEnabled] = useState(false)
  const [showAdultWarning, setShowAdultWarning] = useState(false)
  
  // Wheel state
  const [showWheel, setShowWheel] = useState(false)
  const [wheelParticipants, setWheelParticipants] = useState<{id: string, name: string}[]>([])
  const [newParticipant, setNewParticipant] = useState('')
  
  // Drinking counter state
  const [showDrinkingCounter, setShowDrinkingCounter] = useState(false)
  
  // Player rotation state
  const [showPlayerRotation, setShowPlayerRotation] = useState(false)
  
  // Kings Cup state
  const [showKingsCup, setShowKingsCup] = useState(false)
  
  // Most Likely To state
  const [showMostLikelyTo, setShowMostLikelyTo] = useState(false)
  
  // Categories state
  const [showCategories, setShowCategories] = useState(false)
  
  // High or Low state
  const [showHighOrLow, setShowHighOrLow] = useState(false)
  
  // Unified game phase state - prevents overlay flickering
  const [gamePhase, setGamePhase] = useState<GamePhase>('idle')
  const [pendingGame, setPendingGame] = useState<GameType | null>(null)
  const [activeGame, setActiveGame] = useState<GameType | null>(null) // Track which game is loading
  const [loadingMessage, setLoadingMessage] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Toggle sound
  const toggleSound = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    soundManager.setEnabled(newValue)
    if (newValue) soundManager.playClick()
  }

  // Countdown effect with sound
  useEffect(() => {
    if (countdown > 0) {
      // Play countdown beep
      if (countdown === 1) {
        soundManager.playCountdownFinal()
      } else {
        soundManager.playCountdownBeep()
      }
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Loading message rotation
  useEffect(() => {
    if (gamePhase === 'loading') {
      const interval = setInterval(() => {
        setLoadingMessage(SUSPENSE_MESSAGES[Math.floor(Math.random() * SUSPENSE_MESSAGES.length)])
      }, 800)
      return () => clearInterval(interval)
    }
  }, [gamePhase])

  const startGame = async (gameType: GameType) => {
    // Set loading FIRST, then clear pending - prevents flash
    setActiveGame(gameType) // Track which game is loading for correct animation
    setLoadingMessage(SUSPENSE_MESSAGES[Math.floor(Math.random() * SUSPENSE_MESSAGES.length)])
    setGamePhase('loading')
    setPendingGame(null)
    
    // Suspense delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Transition to countdown (no gap - same overlay stays)
    setGamePhase('countdown')
    setCountdown(3)
    
    // Wait for countdown
    await new Promise(resolve => setTimeout(resolve, 3500))
    
    // Fetch and reveal - phase stays as countdown until data arrives
    const mutationParams = { difficulty: selectedDifficulty, includeAdult: adultContentEnabled }
    if (gameType === 'truth_or_dare') truthOrDare.mutate(mutationParams)
    else if (gameType === 'never_have_i_ever') neverHaveIEver.mutate(mutationParams)
    else if (gameType === 'challenge') challenge.mutate(mutationParams)
    else if (gameType === 'dice') rollDice.mutate()
  }

  const handleGameSelect = (gameType: GameType) => {
    if (currentGame === gameType && gamePhase === 'revealed') {
      // Already playing this game, get next question with full animation
      startGame(gameType)
    } else if (gamePhase === 'idle') {
      // Show confirmation
      setPendingGame(gameType)
      setGamePhase('confirming')
    }
  }
  
  const closeGame = () => {
    setGameContent(null)
    setDiceResult(null)
    setCurrentGame(null)
    setGamePhase('idle')
  }

  const truthOrDare = useMutation({
    mutationFn: async ({ difficulty, includeAdult }: { difficulty: string | null, includeAdult: boolean }) => {
      const params = new URLSearchParams()
      if (difficulty) params.append('difficulty', difficulty)
      if (includeAdult) params.append('include_adult', 'true')
      const res = await api.get<ApiResponse<GameContent>>(`/games/truth-or-dare?${params.toString()}`)
      return res.data.data
    },
    onSuccess: (data) => {
      setGameContent(data)
      setDiceResult(null)
      setCurrentGame('truth_or_dare')
      setGamePhase('revealed')
      // Sound & vibration on reveal
      soundManager.playReveal()
      vibrate(vibrationPatterns.success)
    },
    onError: () => {
      toast.error('Không thể lấy câu hỏi')
      setGamePhase('idle')
    }
  })

  const neverHaveIEver = useMutation({
    mutationFn: async ({ difficulty, includeAdult }: { difficulty: string | null, includeAdult: boolean }) => {
      const params = new URLSearchParams()
      if (difficulty) params.append('difficulty', difficulty)
      if (includeAdult) params.append('include_adult', 'true')
      const res = await api.get<ApiResponse<GameContent>>(`/games/never-have-i-ever?${params.toString()}`)
      return res.data.data
    },
    onSuccess: (data) => {
      setGameContent(data)
      setDiceResult(null)
      setCurrentGame('never_have_i_ever')
      setGamePhase('revealed')
      soundManager.playReveal()
      vibrate(vibrationPatterns.success)
    },
    onError: () => {
      toast.error('Không thể lấy câu hỏi')
      setGamePhase('idle')
    }
  })

  const challenge = useMutation({
    mutationFn: async ({ difficulty, includeAdult }: { difficulty: string | null, includeAdult: boolean }) => {
      const params = new URLSearchParams()
      if (difficulty) params.append('difficulty', difficulty)
      if (includeAdult) params.append('include_adult', 'true')
      const res = await api.get<ApiResponse<GameContent>>(`/games/challenges?${params.toString()}`)
      return res.data.data
    },
    onSuccess: (data) => {
      setGameContent(data)
      setDiceResult(null)
      setCurrentGame('challenge')
      setGamePhase('revealed')
      // Play danger sound for hard challenges
      if (data.difficulty === 'hard' || data.difficulty === 'extreme') {
        soundManager.playDanger()
        vibrate(vibrationPatterns.danger)
      } else {
        soundManager.playReveal()
        vibrate(vibrationPatterns.success)
      }
    },
    onError: () => {
      toast.error('Không thể lấy thử thách')
      setGamePhase('idle')
    }
  })

  const rollDice = useMutation({
    mutationFn: async () => {
      setIsSpinning(true)
      soundManager.playDiceRoll()
      vibrate(vibrationPatterns.dice)
      await new Promise(resolve => setTimeout(resolve, 1500))
      const res = await api.get<ApiResponse<DiceResult>>('/games/dice')
      return res.data.data
    },
    onSuccess: (data) => {
      setDiceResult(data)
      setGameContent(null)
      setCurrentGame('dice')
      setIsSpinning(false)
      setGamePhase('revealed')
      // Different sounds based on severity
      if (data.severity === 'extreme') {
        soundManager.playDanger()
        vibrate(vibrationPatterns.danger)
      } else if (data.is_double) {
        soundManager.playSuccess()
        vibrate(vibrationPatterns.success)
      } else {
        soundManager.playReveal()
        vibrate(vibrationPatterns.short)
      }
    },
    onError: () => {
      toast.error('Không thể tung xúc xắc')
      setIsSpinning(false)
      setGamePhase('idle')
    }
  })

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      case 'extreme': return 'bg-purple-100 text-purple-800'
      case '18+': return 'bg-pink-100 text-pink-800 border border-pink-300'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  const getDifficultyLabel = (difficulty: string | null) => {
    switch (difficulty) {
      case 'easy': return 'Dễ'
      case 'medium': return 'Trung bình'
      case 'hard': return 'Khó'
      case 'extreme': return 'Cực khó'
      case '18+': return '18+ 🔞'
      default: return 'Không xác định'
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center relative">
        {/* Sound & Filter Controls */}
        <div className="absolute right-0 top-0 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSound}
            className="gap-1"
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
          </Button>
          <select
            value={selectedDifficulty || ''}
            onChange={(e) => setSelectedDifficulty(e.target.value || null)}
            className="text-xs border-2 border-border/60 rounded-lg px-2 py-1.5 bg-background text-foreground font-body transition-all hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          >
            <option value="">Tất cả độ khó</option>
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
            <option value="extreme">Cực khó</option>
          </select>
          <button
            onClick={() => adultContentEnabled ? setAdultContentEnabled(false) : setShowAdultWarning(true)}
            className={`text-xs px-2 py-1.5 rounded-lg border-2 transition-all font-body ${
              adultContentEnabled 
                ? 'bg-primary/10 border-primary/30 text-primary' 
                : 'bg-secondary border-border/60 text-muted-foreground hover:border-border'
            }`}
            title={adultContentEnabled ? 'Tắt nội dung 18+' : 'Bật nội dung 18+'}
          >
            🔞 18+
          </button>
        </div>

        {/* Header - Retro Typography */}
        <h1 className="text-3xl font-heading font-bold text-foreground flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-warning animate-pulse" />
          Trò chơi nhậu
        </h1>
        <p className="text-muted-foreground mt-2 font-body">Chọn một trò chơi để bắt đầu cuộc vui!</p>
        <p className="text-xs text-primary mt-1 font-body italic">Uống có trách nhiệm - Đã uống không lái xe</p>
      </div>

      {/* Game Selection */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="card-interactive cursor-pointer border-2 hover:border-primary/50 group"
          onClick={() => handleGameSelect('truth_or_dare')}
        >
          <CardContent className="p-6 text-center relative">
            <button
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setShowRules('truth_or_dare') }}
            >
              <HelpCircle className="h-4 w-4 text-primary" />
            </button>
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-primary/30">
              <MessageCircleQuestion className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-heading font-bold text-lg">Sự thật hay Thách thức</h3>
            <p className="text-sm text-muted-foreground mt-1 font-body">55 câu hỏi & thử thách</p>
            <div className="flex justify-center gap-1 mt-2">
              <span className="text-xs px-2 py-0.5 bg-success/10 text-success rounded-full font-body">Dễ</span>
              <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded-full font-body">Khó</span>
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-body">18+</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="card-interactive cursor-pointer border-2 hover:border-primary/50 group"
          onClick={() => handleGameSelect('never_have_i_ever')}
        >
          <CardContent className="p-6 text-center relative">
            <button
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setShowRules('never_have_i_ever') }}
            >
              <HelpCircle className="h-4 w-4 text-primary" />
            </button>
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-primary/30">
              <Hand className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-heading font-bold text-lg">Tôi chưa bao giờ</h3>
            <p className="text-sm text-muted-foreground mt-1 font-body">30 câu hỏi thú vị</p>
            <div className="flex justify-center gap-1 mt-2 items-center">
              <BeerIcon size={16} className="text-warning" />
              <span className="text-xs text-warning font-body">Ai đã làm = Uống!</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="card-interactive cursor-pointer border-2 hover:border-warning/50 group"
          onClick={() => handleGameSelect('challenge')}
        >
          <CardContent className="p-6 text-center relative">
            <button
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-warning/10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setShowRules('challenge') }}
            >
              <HelpCircle className="h-4 w-4 text-warning" />
            </button>
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-warning/30">
              <Flame className="h-8 w-8 text-warning group-hover:animate-pulse" />
            </div>
            <h3 className="font-heading font-bold text-lg">Thử thách</h3>
            <p className="text-sm text-muted-foreground mt-1 font-body">25 thử thách điên rồ</p>
            <div className="flex justify-center gap-1 mt-2 items-center">
              <Skull className="h-4 w-4 text-destructive" />
              <span className="text-xs text-destructive font-body">Thất bại = Phạt!</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="card-interactive cursor-pointer border-2 hover:border-primary/50 group"
          onClick={() => handleGameSelect('dice')}
        >
          <CardContent className="p-6 text-center relative">
            <button
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setShowRules('dice') }}
            >
              <HelpCircle className="h-4 w-4 text-primary" />
            </button>
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-primary/30">
              <Dices className={`h-8 w-8 text-primary ${isSpinning ? 'animate-bounce' : ''}`} />
            </div>
            <h3 className="font-heading font-bold text-lg">Tung xúc xắc</h3>
            <p className="text-sm text-muted-foreground mt-1 font-body">May rủi quyết định!</p>
            <div className="flex justify-center gap-1 mt-2 items-center">
              <Zap className="h-4 w-4 text-warning" />
              <span className="text-xs text-primary font-body">Đôi = Chọn người!</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="card-interactive cursor-pointer border-2 hover:border-primary/50 group"
          onClick={() => setShowWheel(true)}
        >
          <CardContent className="p-6 text-center relative">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-success/30">
              <CircleDot className="h-8 w-8 text-success group-hover:animate-spin" />
            </div>
            <h3 className="font-heading font-bold text-lg">Vòng quay may mắn</h3>
            <p className="text-sm text-muted-foreground mt-1 font-body">Quay để chọn người!</p>
            <div className="flex justify-center gap-1 mt-2 items-center">
              <Users className="h-4 w-4 text-success" />
              <span className="text-xs text-success font-body">Chọn người ngẫu nhiên</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="card-interactive cursor-pointer border-2 hover:border-warning/50 group"
          onClick={() => setShowKingsCup(true)}
        >
          <CardContent className="p-6 text-center relative">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-warning/30">
              <Crown className="h-8 w-8 text-warning" />
            </div>
            <h3 className="font-heading font-bold text-lg">King's Cup</h3>
            <p className="text-sm text-muted-foreground mt-1 font-body">Mỗi lá bài 1 luật</p>
            <div className="flex justify-center gap-1 mt-2 items-center">
              <BeerIcon size={16} className="text-warning" />
              <span className="text-xs text-warning font-body">Bốc K thứ 4 = Uống!</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="card-interactive cursor-pointer border-2 hover:border-primary/50 group"
          onClick={() => setShowMostLikelyTo(true)}
        >
          <CardContent className="p-6 text-center relative">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-primary/30">
              <ThumbsUp className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-heading font-bold text-lg">Ai có khả năng nhất?</h3>
            <p className="text-sm text-muted-foreground mt-1 font-body">Đếm 3-2-1 rồi chỉ!</p>
            <div className="flex justify-center gap-1 mt-2 items-center">
              <BeerIcon size={16} className="text-primary" />
              <span className="text-xs text-primary font-body">Bị chỉ nhiều = Uống!</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="card-interactive cursor-pointer border-2 hover:border-success/50 group"
          onClick={() => setShowCategories(true)}
        >
          <CardContent className="p-6 text-center relative">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-success/30">
              <List className="h-8 w-8 text-success" />
            </div>
            <h3 className="font-heading font-bold text-lg">Categories</h3>
            <p className="text-sm text-muted-foreground mt-1 font-body">Kể tên theo chủ đề</p>
            <div className="flex justify-center gap-1 mt-2 items-center">
              <BeerIcon size={16} className="text-success" />
              <span className="text-xs text-success font-body">Hết ý = Uống!</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="card-interactive cursor-pointer border-2 hover:border-destructive/50 group"
          onClick={() => setShowHighOrLow(true)}
        >
          <CardContent className="p-6 text-center relative">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center group-hover:scale-110 transition-transform border-2 border-destructive/30">
              <TrendingUp className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="font-heading font-bold text-lg">Cao hay Thấp?</h3>
            <p className="text-sm text-muted-foreground mt-1 font-body">Đoán lá bài tiếp theo</p>
            <div className="flex justify-center gap-1 mt-2 items-center">
              <Zap className="h-4 w-4 text-destructive" />
              <span className="text-xs text-destructive font-body">Streak = số ly phạt!</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kings Cup Modal */}
      {showKingsCup && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={() => setShowKingsCup(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <KingsCup onClose={() => setShowKingsCup(false)} />
          </div>
        </div>
      )}

      {/* Most Likely To Modal */}
      {showMostLikelyTo && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={() => setShowMostLikelyTo(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <MostLikelyTo onClose={() => setShowMostLikelyTo(false)} />
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCategories && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={() => setShowCategories(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <CategoriesGame onClose={() => setShowCategories(false)} />
          </div>
        </div>
      )}

      {/* High or Low Modal */}
      {showHighOrLow && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={() => setShowHighOrLow(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <HighOrLow onClose={() => setShowHighOrLow(false)} />
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-3">
        <Button
          onClick={() => setShowPlayerRotation(true)}
          variant="stamp"
          className="rounded-full h-16 w-16 shadow-lg p-0 flex items-center justify-center"
          title="Quản lý lượt chơi"
        >
          <Users className="h-8 w-8" strokeWidth={2} />
        </Button>
        <Button
          onClick={() => setShowDrinkingCounter(true)}
          variant="stamp"
          className="rounded-full h-16 w-16 shadow-lg p-0 flex items-center justify-center"
          title="Đếm số ly"
        >
          <BeerIcon size={32} />
        </Button>
      </div>

      {/* Player Rotation Modal */}
      {showPlayerRotation && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={() => setShowPlayerRotation(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <PlayerRotation onClose={() => setShowPlayerRotation(false)} />
          </div>
        </div>
      )}

      {/* Drinking Counter Modal */}
      {showDrinkingCounter && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={() => setShowDrinkingCounter(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DrinkingCounter onClose={() => setShowDrinkingCounter(false)} />
          </div>
        </div>
      )}

      {/* Wheel Modal */}
      {showWheel && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={() => setShowWheel(false)}
        >
          <Card 
            className="card-paper max-w-md w-full mx-4 border-2 border-success/50 shadow-2xl max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="pb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWheel(false)}
                className="absolute right-2 top-2 z-10"
              >
                <X className="h-5 w-5" />
              </Button>
              <CardTitle className="text-center flex items-center justify-center gap-2 font-heading">
                <CircleDot className="h-6 w-6 text-success" />
                Vòng quay may mắn
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add participants */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newParticipant.trim()) {
                      setWheelParticipants([...wheelParticipants, { id: Date.now().toString(), name: newParticipant.trim() }])
                      setNewParticipant('')
                    }
                  }}
                  placeholder="Nhập tên người chơi..."
                  className="flex-1 px-3 py-2 border-2 border-border/60 rounded-lg text-sm font-body bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
                <Button
                  size="sm"
                  variant="stamp"
                  onClick={() => {
                    if (newParticipant.trim()) {
                      setWheelParticipants([...wheelParticipants, { id: Date.now().toString(), name: newParticipant.trim() }])
                      setNewParticipant('')
                    }
                  }}
                >
                  Thêm
                </Button>
              </div>

              {/* Participant list */}
              {wheelParticipants.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {wheelParticipants.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-success/10 text-success rounded-full text-sm font-body border border-success/30"
                    >
                      {p.name}
                      <button
                        onClick={() => setWheelParticipants(wheelParticipants.filter(x => x.id !== p.id))}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Quick add buttons */}
              <div className="flex flex-wrap gap-2 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const names = ['Người 1', 'Người 2', 'Người 3', 'Người 4']
                    setWheelParticipants(names.map((n, i) => ({ id: `demo-${i}`, name: n })))
                  }}
                >
                  Demo 4 người
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWheelParticipants([])}
                >
                  Xóa tất cả
                </Button>
              </div>

              {/* Spin Wheel */}
              <div className="relative pt-4">
                <SpinWheel
                  participants={wheelParticipants}
                  onResult={() => {}}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Game Result Overlay */}
      {gamePhase === 'revealed' && (gameContent || diceResult) && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md"
          onClick={closeGame}
        >
          <Card 
            className="card-paper max-w-lg w-full mx-4 border-2 border-warning/50 shadow-2xl animate-paper-slide"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-center flex items-center justify-center gap-2 font-heading">
                {currentGame === 'truth_or_dare' && (
                  <>
                    <MessageCircleQuestion className="h-6 w-6 text-primary" />
                    {gameContent?.content_type === 'truth' ? 'Sự thật' : 'Thách thức'}
                  </>
                )}
                {currentGame === 'never_have_i_ever' && (
                  <>
                    <Hand className="h-6 w-6 text-primary" />
                    Tôi chưa bao giờ...
                  </>
                )}
                {currentGame === 'challenge' && (
                  <>
                    <Flame className="h-6 w-6 text-warning" />
                    Thử thách
                  </>
                )}
                {currentGame === 'dice' && (
                  <>
                    <Dices className="h-6 w-6 text-primary" />
                    Kết quả xúc xắc
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {gameContent && (
                <>
                  <p className="text-2xl font-heading font-semibold leading-relaxed">{gameContent.content}</p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold font-body ${
                      gameContent.difficulty === 'easy' ? 'bg-success/10 text-success' :
                      gameContent.difficulty === 'medium' ? 'bg-warning/10 text-warning' :
                      gameContent.difficulty === 'hard' ? 'bg-destructive/10 text-destructive' :
                      gameContent.difficulty === 'extreme' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {getDifficultyLabel(gameContent.difficulty)}
                    </span>
                    {gameContent.difficulty && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-warning/10 text-warning rounded-full text-sm font-medium font-body border border-warning/30">
                        <BeerIcon size={16} />
                        {gameContent.difficulty === 'easy' && '1 shot nếu từ chối'}
                        {gameContent.difficulty === 'medium' && '2 shot nếu từ chối'}
                        {gameContent.difficulty === 'hard' && '3 shot nếu từ chối'}
                        {gameContent.difficulty === 'extreme' && '5 shot nếu từ chối'}
                      </span>
                    )}
                  </div>
                </>
              )}
              {diceResult && (
                <>
                  {/* Dice Display */}
                  <div className="flex items-center justify-center gap-6">
                    <div className={`w-24 h-24 rounded-2xl shadow-2xl flex items-center justify-center text-5xl font-black font-mono bg-gradient-to-br transition-all duration-300 animate-bounce-in [animation-delay:0.1s] [animation-fill-mode:both] ${
                      diceResult.severity === 'extreme' ? 'from-destructive to-warning text-primary-foreground animate-pulse border-4 border-destructive/50' :
                      diceResult.severity === 'spicy' ? 'from-warning to-primary text-primary-foreground border-4 border-warning/50' :
                      diceResult.severity === 'mild' ? 'from-primary/80 to-primary text-primary-foreground border-4 border-primary/50' :
                      'from-secondary to-card text-foreground border-2 border-border'
                    }`}>
                      {diceResult.dice1}
                    </div>
                    <div className={`w-24 h-24 rounded-2xl shadow-2xl flex items-center justify-center text-5xl font-black font-mono bg-gradient-to-br transition-all duration-300 animate-bounce-in [animation-delay:0.3s] [animation-fill-mode:both] ${
                      diceResult.severity === 'extreme' ? 'from-destructive to-warning text-primary-foreground animate-pulse border-4 border-destructive/50' :
                      diceResult.severity === 'spicy' ? 'from-warning to-primary text-primary-foreground border-4 border-warning/50' :
                      diceResult.severity === 'mild' ? 'from-primary/80 to-primary text-primary-foreground border-4 border-primary/50' :
                      'from-secondary to-card text-foreground border-2 border-border'
                    }`}>
                      {diceResult.dice2}
                    </div>
                  </div>
                  
                  {/* Rule Name & Badge */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`text-3xl font-heading font-black ${
                        diceResult.severity === 'extreme' ? 'text-destructive' :
                        diceResult.severity === 'spicy' ? 'text-warning' :
                        diceResult.severity === 'mild' ? 'text-primary' :
                        'text-foreground'
                      }`}>
                        {diceResult.rule_name}
                      </span>
                      {diceResult.is_double && (
                        <span className="px-2 py-1 bg-warning/10 text-warning text-xs font-bold rounded-full animate-bounce font-body border border-warning/30">
                          ĐÔI!
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-lg font-body">{diceResult.rule_description}</p>
                  </div>

                  {/* Action Card */}
                  <div className={`p-4 rounded-xl border-2 ${
                    diceResult.severity === 'extreme' ? 'bg-destructive/10 border-destructive/50' :
                    diceResult.severity === 'spicy' ? 'bg-warning/10 border-warning/50' :
                    diceResult.severity === 'mild' ? 'bg-primary/10 border-primary/50' :
                    'bg-success/10 border-success/50'
                  }`}>
                    <p className="font-heading font-bold text-lg flex items-center justify-center gap-2">
                      {diceResult.severity === 'extreme' && <Skull className="h-5 w-5 text-destructive" />}
                      {diceResult.severity === 'spicy' && <Flame className="h-5 w-5 text-warning" />}
                      {diceResult.severity === 'mild' && <BeerIcon size={20} className="text-primary" />}
                      {diceResult.severity === 'safe' && <Sparkles className="h-5 w-5 text-success" />}
                      {diceResult.action}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 font-body">
                      {diceResult.target === 'self' && 'Bạn phải thực hiện'}
                      {diceResult.target === 'choose' && 'Chọn người thực hiện'}
                      {diceResult.target === 'all' && 'Tất cả cùng chơi'}
                      {diceResult.target === 'none' && 'Không ai phải làm gì'}
                    </p>
                  </div>
                </>
              )}
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button 
                  onClick={() => currentGame && startGame(currentGame)}
                  variant="stamp"
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Câu tiếp theo
                </Button>
                <Button
                  variant="outline"
                  onClick={closeGame}
                >
                  <X className="h-4 w-4 mr-1" />
                  Đóng
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Modal */}
      {pendingGame && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => {
            setPendingGame(null)
            setGamePhase('idle')
          }}
        >
          <Card 
            className="card-paper max-w-md w-full animate-paper-slide border-2 border-warning/50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-20 w-20 mx-auto rounded-full bg-warning/10 flex items-center justify-center animate-bounce border-2 border-warning/30">
                <GameIcon type={pendingGame} className="h-10 w-10 text-warning" />
              </div>
              <h2 className="text-2xl font-heading font-bold">{GAME_INFO[pendingGame].name}</h2>
              <p className="text-warning font-medium flex items-center justify-center gap-2 font-body">
                <AlertCircle className="h-5 w-5" />
                {GAME_INFO[pendingGame].warning}
              </p>
              <div className="bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground border border-border/50">
                <p className="font-semibold mb-1 flex items-center justify-center gap-1 font-body">
                  <AlertCircle className="h-4 w-4" /> Nhớ luật chơi:
                </p>
                <p className="font-body">Từ chối/Thất bại = Phải uống phạt!</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setPendingGame(null)
                    setGamePhase('idle')
                  }}
                >
                  Để sau
                </Button>
                <Button 
                  variant="stamp"
                  className="flex-1"
                  onClick={() => startGame(pendingGame)}
                >
                  <Flame className="h-4 w-4 mr-1" />
                  Chơi thôi!
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading Suspense Overlay - Vintage Paper Style */}
      {(gamePhase === 'loading' || gamePhase === 'countdown') && activeGame && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md texture-paper">
          <div className="text-center space-y-6">
            {gamePhase === 'loading' ? (
              <>
                {/* Game-specific loading animation - Sepia tones */}
                {activeGame === 'dice' && (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-warning rounded-2xl shadow-2xl flex items-center justify-center text-4xl font-black font-mono text-primary-foreground animate-bounce border-2 border-primary/50" style={{ animationDelay: '0s' }}>
                      {Math.floor(Math.random() * 6) + 1}
                    </div>
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-warning rounded-2xl shadow-2xl flex items-center justify-center text-4xl font-black font-mono text-primary-foreground animate-bounce border-2 border-primary/50" style={{ animationDelay: '0.1s' }}>
                      {Math.floor(Math.random() * 6) + 1}
                    </div>
                  </div>
                )}
                {activeGame === 'truth_or_dare' && (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary/80 to-primary rounded-full shadow-2xl flex items-center justify-center animate-bounce border-2 border-primary/50">
                      <MessageCircleQuestion className="h-12 w-12 text-primary-foreground" />
                    </div>
                    <div className="w-24 h-24 bg-gradient-to-br from-warning/80 to-warning rounded-full shadow-2xl flex items-center justify-center animate-bounce border-2 border-warning/50" style={{ animationDelay: '0.2s' }}>
                      <Target className="h-12 w-12 text-warning-foreground" />
                    </div>
                  </div>
                )}
                {activeGame === 'never_have_i_ever' && (
                  <div className="flex items-center justify-center">
                    <div className="w-28 h-28 bg-gradient-to-br from-primary/80 to-primary rounded-full shadow-2xl flex items-center justify-center animate-bounce border-2 border-primary/50">
                      <Hand className="h-14 w-14 text-primary-foreground" />
                    </div>
                  </div>
                )}
                {activeGame === 'challenge' && (
                  <div className="flex items-center justify-center">
                    <div className="w-28 h-28 bg-gradient-to-br from-warning/80 to-warning rounded-full shadow-2xl flex items-center justify-center animate-pulse border-2 border-warning/50">
                      <Flame className="h-14 w-14 text-warning-foreground animate-bounce" />
                    </div>
                  </div>
                )}
                
                {/* Spinner - Sepia tones */}
                <div className="relative">
                  <div className={`w-24 h-24 mx-auto rounded-full border-4 border-t-4 animate-spin ${
                    activeGame === 'dice' ? 'border-primary/30 border-t-primary' :
                    activeGame === 'truth_or_dare' ? 'border-primary/30 border-t-primary' :
                    activeGame === 'never_have_i_ever' ? 'border-primary/30 border-t-primary' :
                    'border-warning/30 border-t-warning'
                  }`} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GameIcon type={activeGame} className={`h-10 w-10 animate-pulse ${
                      activeGame === 'dice' ? 'text-primary' :
                      activeGame === 'truth_or_dare' ? 'text-primary' :
                      activeGame === 'never_have_i_ever' ? 'text-primary' :
                      'text-warning'
                    }`} />
                  </div>
                </div>
                
                <p className="text-primary-foreground text-2xl font-heading font-bold animate-pulse">{loadingMessage}</p>
                <p className="text-muted-foreground font-body">{GAME_INFO[activeGame].name}</p>
                <div className="flex justify-center gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-3 h-3 rounded-full animate-bounce ${
                        activeGame === 'dice' ? 'bg-primary' :
                        activeGame === 'truth_or_dare' ? 'bg-primary' :
                        activeGame === 'never_have_i_ever' ? 'bg-primary' :
                        'bg-warning'
                      }`}
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </>
            ) : countdown > 0 ? (
              <>
                <div className={`text-9xl font-heading font-black animate-ping ${
                  activeGame === 'dice' ? 'text-primary' :
                  activeGame === 'truth_or_dare' ? 'text-primary' :
                  activeGame === 'never_have_i_ever' ? 'text-primary' :
                  'text-warning'
                }`}>
                  {countdown}
                </div>
                <p className={`text-2xl font-heading font-bold animate-pulse ${
                  activeGame === 'dice' ? 'text-primary' :
                  activeGame === 'truth_or_dare' ? 'text-primary' :
                  activeGame === 'never_have_i_ever' ? 'text-primary' :
                  'text-warning'
                }`}>
                  {activeGame === 'truth_or_dare' && 'Sự thật hay Thách thức...'}
                  {activeGame === 'never_have_i_ever' && 'Bạn đã từng chưa...'}
                  {activeGame === 'challenge' && 'Thử thách đang đến...'}
                  {activeGame === 'dice' && 'Xúc xắc đang lăn...'}
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowRules(null)}
        >
          <Card 
            className="card-paper max-w-md w-full animate-paper-slide" 
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="relative">
              <button 
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-secondary/50 transition-colors"
                onClick={() => setShowRules(null)}
              >
                <X className="h-5 w-5" />
              </button>
              <CardTitle className="font-heading">{GAME_RULES[showRules as keyof typeof GAME_RULES]?.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {GAME_RULES[showRules as keyof typeof GAME_RULES]?.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-warning/10 text-warning flex items-center justify-center text-sm font-bold font-body border border-warning/30">
                      {i + 1}
                    </span>
                    <span className="font-body">{rule}</span>
                  </li>
                ))}
              </ul>
              <Button variant="stamp" className="w-full mt-4" onClick={() => setShowRules(null)}>
                Đã hiểu! 🍻
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Adult Content Warning Modal */}
      {showAdultWarning && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowAdultWarning(false)}
        >
          <Card 
            className="card-paper max-w-md w-full animate-paper-slide border-2 border-destructive/50" 
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2 border-2 border-destructive/30">
                <span className="text-3xl">🔞</span>
              </div>
              <CardTitle className="text-destructive font-heading">Cảnh báo nội dung người lớn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-destructive/10 rounded-lg p-4 text-sm text-destructive border border-destructive/30">
                <p className="font-semibold mb-2 flex items-center gap-2 font-body">
                  <AlertCircle className="h-4 w-4" /> Lưu ý quan trọng:
                </p>
                <ul className="space-y-1 list-disc list-inside font-body">
                  <li>Nội dung 18+ chỉ dành cho người trưởng thành</li>
                  <li>Các câu hỏi có thể nhạy cảm hoặc khiêu khích</li>
                  <li>Chỉ chơi khi tất cả người tham gia đều đồng ý</li>
                  <li>Tôn trọng giới hạn của mọi người</li>
                </ul>
              </div>
              <p className="text-center text-sm text-muted-foreground font-body">
                Bạn xác nhận rằng bạn đã đủ 18 tuổi và đồng ý xem nội dung này?
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowAdultWarning(false)}
                >
                  Không, cảm ơn
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setAdultContentEnabled(true)
                    setShowAdultWarning(false)
                    toast.success('Đã bật nội dung 18+')
                  }}
                >
                  Tôi đồng ý
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
