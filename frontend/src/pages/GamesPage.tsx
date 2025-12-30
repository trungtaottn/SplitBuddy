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
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
          </Button>
          <select
            value={selectedDifficulty || ''}
            onChange={(e) => setSelectedDifficulty(e.target.value || null)}
            className="text-xs border rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          >
            <option value="">Tất cả độ khó</option>
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
            <option value="extreme">Cực khó</option>
          </select>
          <button
            onClick={() => adultContentEnabled ? setAdultContentEnabled(false) : setShowAdultWarning(true)}
            className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${
              adultContentEnabled 
                ? 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300' 
                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            title={adultContentEnabled ? 'Tắt nội dung 18+' : 'Bật nội dung 18+'}
          >
            🔞 18+
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-yellow-500 animate-pulse" />
          Trò chơi nhậu
        </h1>
        <p className="text-muted-foreground mt-2">Chọn một trò chơi để bắt đầu cuộc vui! 🍻</p>
        <p className="text-xs text-orange-500 mt-1">Uống có trách nhiệm - Đã uống không lái xe</p>
      </div>

      {/* Game Selection */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-2 border-2 hover:border-pink-400 group"
          onClick={() => handleGameSelect('truth_or_dare')}
        >
          <CardContent className="p-6 text-center relative">
            <button
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-pink-100 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setShowRules('truth_or_dare') }}
            >
              <HelpCircle className="h-4 w-4 text-pink-400" />
            </button>
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageCircleQuestion className="h-8 w-8 text-pink-500" />
            </div>
            <h3 className="font-bold text-lg">Sự thật hay Thách thức</h3>
            <p className="text-sm text-muted-foreground mt-1">55 câu hỏi & thử thách</p>
            <div className="flex justify-center gap-1 mt-2">
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Dễ</span>
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Khó</span>
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">18+</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-2 border-2 hover:border-blue-400 group"
          onClick={() => handleGameSelect('never_have_i_ever')}
        >
          <CardContent className="p-6 text-center relative">
            <button
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setShowRules('never_have_i_ever') }}
            >
              <HelpCircle className="h-4 w-4 text-blue-400" />
            </button>
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Hand className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="font-bold text-lg">Tôi chưa bao giờ</h3>
            <p className="text-sm text-muted-foreground mt-1">30 câu hỏi thú vị</p>
            <div className="flex justify-center gap-1 mt-2">
              <Beer className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-amber-600">Ai đã làm = Uống!</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-2 border-2 hover:border-orange-400 group"
          onClick={() => handleGameSelect('challenge')}
        >
          <CardContent className="p-6 text-center relative">
            <button
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-orange-100 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setShowRules('challenge') }}
            >
              <HelpCircle className="h-4 w-4 text-orange-400" />
            </button>
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-100 to-red-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Flame className="h-8 w-8 text-orange-500 group-hover:animate-pulse" />
            </div>
            <h3 className="font-bold text-lg">Thử thách</h3>
            <p className="text-sm text-muted-foreground mt-1">25 thử thách điên rồ</p>
            <div className="flex justify-center gap-1 mt-2">
              <Skull className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-600">Thất bại = Phạt!</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-2 border-2 hover:border-purple-400 group"
          onClick={() => handleGameSelect('dice')}
        >
          <CardContent className="p-6 text-center relative">
            <button
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-purple-100 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setShowRules('dice') }}
            >
              <HelpCircle className="h-4 w-4 text-purple-400" />
            </button>
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-indigo-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Dices className={`h-8 w-8 text-purple-500 ${isSpinning ? 'animate-bounce' : ''}`} />
            </div>
            <h3 className="font-bold text-lg">Tung xúc xắc</h3>
            <p className="text-sm text-muted-foreground mt-1">May rủi quyết định!</p>
            <div className="flex justify-center gap-1 mt-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-purple-600">Đôi = Chọn người!</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-2 border-2 hover:border-emerald-400 group"
          onClick={() => setShowWheel(true)}
        >
          <CardContent className="p-6 text-center relative">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CircleDot className="h-8 w-8 text-emerald-500 group-hover:animate-spin" />
            </div>
            <h3 className="font-bold text-lg">Vòng quay may mắn</h3>
            <p className="text-sm text-muted-foreground mt-1">Quay để chọn người!</p>
            <div className="flex justify-center gap-1 mt-2">
              <Users className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-emerald-600">Chọn người ngẫu nhiên</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-2 border-2 hover:border-yellow-400 group"
          onClick={() => setShowKingsCup(true)}
        >
          <CardContent className="p-6 text-center relative">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-100 to-amber-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Crown className="h-8 w-8 text-yellow-500" />
            </div>
            <h3 className="font-bold text-lg">King's Cup</h3>
            <p className="text-sm text-muted-foreground mt-1">Mỗi lá bài 1 luật</p>
            <div className="flex justify-center gap-1 mt-2">
              <Beer className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-yellow-600">Bốc K thứ 4 = Uống!</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-2 border-2 hover:border-indigo-400 group"
          onClick={() => setShowMostLikelyTo(true)}
        >
          <CardContent className="p-6 text-center relative">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ThumbsUp className="h-8 w-8 text-indigo-500" />
            </div>
            <h3 className="font-bold text-lg">Ai có khả năng nhất?</h3>
            <p className="text-sm text-muted-foreground mt-1">Đếm 3-2-1 rồi chỉ!</p>
            <div className="flex justify-center gap-1 mt-2">
              <Beer className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-indigo-600">Bị chỉ nhiều = Uống!</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-2 border-2 hover:border-teal-400 group"
          onClick={() => setShowCategories(true)}
        >
          <CardContent className="p-6 text-center relative">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-100 to-cyan-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <List className="h-8 w-8 text-teal-500" />
            </div>
            <h3 className="font-bold text-lg">Categories</h3>
            <p className="text-sm text-muted-foreground mt-1">Kể tên theo chủ đề</p>
            <div className="flex justify-center gap-1 mt-2">
              <Beer className="h-4 w-4 text-teal-500" />
              <span className="text-xs text-teal-600">Hết ý = Uống!</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-2 border-2 hover:border-rose-400 group"
          onClick={() => setShowHighOrLow(true)}
        >
          <CardContent className="p-6 text-center relative">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-100 to-red-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="h-8 w-8 text-rose-500" />
            </div>
            <h3 className="font-bold text-lg">Cao hay Thấp?</h3>
            <p className="text-sm text-muted-foreground mt-1">Đoán lá bài tiếp theo</p>
            <div className="flex justify-center gap-1 mt-2">
              <Zap className="h-4 w-4 text-rose-500" />
              <span className="text-xs text-rose-600">Streak = số ly phạt!</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kings Cup Modal */}
      {showKingsCup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
          <KingsCup onClose={() => setShowKingsCup(false)} />
        </div>
      )}

      {/* Most Likely To Modal */}
      {showMostLikelyTo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
          <MostLikelyTo onClose={() => setShowMostLikelyTo(false)} />
        </div>
      )}

      {/* Categories Modal */}
      {showCategories && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
          <CategoriesGame onClose={() => setShowCategories(false)} />
        </div>
      )}

      {/* High or Low Modal */}
      {showHighOrLow && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
          <HighOrLow onClose={() => setShowHighOrLow(false)} />
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
        <Button
          onClick={() => setShowPlayerRotation(true)}
          className="rounded-full h-12 w-12 bg-blue-500 hover:bg-blue-600 shadow-lg"
          title="Quản lý lượt chơi"
        >
          <Users className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => setShowDrinkingCounter(true)}
          className="rounded-full h-14 w-14 bg-amber-500 hover:bg-amber-600 shadow-lg"
          title="Đếm số ly"
        >
          <Beer className="h-6 w-6" />
        </Button>
      </div>

      {/* Player Rotation Modal */}
      {showPlayerRotation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
          <PlayerRotation onClose={() => setShowPlayerRotation(false)} />
        </div>
      )}

      {/* Drinking Counter Modal */}
      {showDrinkingCounter && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
          <DrinkingCounter onClose={() => setShowDrinkingCounter(false)} />
        </div>
      )}

      {/* Wheel Modal */}
      {showWheel && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
          <Card className="max-w-md w-full mx-4 border-2 border-emerald-300 shadow-2xl max-h-[90vh] overflow-y-auto relative">
            <CardHeader className="pb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWheel(false)}
                className="absolute right-2 top-2 z-10"
              >
                <X className="h-5 w-5" />
              </Button>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <CircleDot className="h-6 w-6 text-emerald-500" />
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
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <Button
                  size="sm"
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
                      className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm"
                    >
                      {p.name}
                      <button
                        onClick={() => setWheelParticipants(wheelParticipants.filter(x => x.id !== p.id))}
                        className="hover:text-red-500"
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
          <Card className="max-w-lg w-full mx-4 border-2 border-orange-300 shadow-2xl animate-reveal-pop [animation-fill-mode:both]">
            <CardHeader className="pb-2">
              <CardTitle className="text-center flex items-center justify-center gap-2">
                {currentGame === 'truth_or_dare' && (
                  <>
                    <MessageCircleQuestion className="h-6 w-6 text-pink-500" />
                    {gameContent?.content_type === 'truth' ? 'Sự thật' : 'Thách thức'}
                  </>
                )}
                {currentGame === 'never_have_i_ever' && (
                  <>
                    <Hand className="h-6 w-6 text-blue-500" />
                    Tôi chưa bao giờ...
                  </>
                )}
                {currentGame === 'challenge' && (
                  <>
                    <Flame className="h-6 w-6 text-orange-500" />
                    Thử thách
                  </>
                )}
                {currentGame === 'dice' && (
                  <>
                    <Dices className="h-6 w-6 text-purple-500" />
                    Kết quả xúc xắc
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {gameContent && (
                <>
                  <p className="text-2xl font-semibold leading-relaxed">{gameContent.content}</p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${getDifficultyColor(gameContent.difficulty)}`}>
                      {getDifficultyLabel(gameContent.difficulty)}
                    </span>
                    {gameContent.difficulty && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                        <Beer className="h-4 w-4" />
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
                    <div className={`w-24 h-24 rounded-2xl shadow-2xl flex items-center justify-center text-5xl font-black bg-gradient-to-br transition-all duration-300 animate-bounce-in [animation-delay:0.1s] [animation-fill-mode:both] ${
                      diceResult.severity === 'extreme' ? 'from-red-500 to-orange-500 text-white animate-pulse border-4 border-red-300' :
                      diceResult.severity === 'spicy' ? 'from-orange-400 to-yellow-400 text-white border-4 border-orange-300' :
                      diceResult.severity === 'mild' ? 'from-blue-400 to-cyan-400 text-white border-4 border-blue-300' :
                      'from-gray-100 dark:from-gray-800 to-white dark:to-gray-700 text-gray-800 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600'
                    }`}>
                      {diceResult.dice1}
                    </div>
                    <div className={`w-24 h-24 rounded-2xl shadow-2xl flex items-center justify-center text-5xl font-black bg-gradient-to-br transition-all duration-300 animate-bounce-in [animation-delay:0.3s] [animation-fill-mode:both] ${
                      diceResult.severity === 'extreme' ? 'from-red-500 to-orange-500 text-white animate-pulse border-4 border-red-300' :
                      diceResult.severity === 'spicy' ? 'from-orange-400 to-yellow-400 text-white border-4 border-orange-300' :
                      diceResult.severity === 'mild' ? 'from-blue-400 to-cyan-400 text-white border-4 border-blue-300' :
                      'from-gray-100 dark:from-gray-800 to-white dark:to-gray-700 text-gray-800 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600'
                    }`}>
                      {diceResult.dice2}
                    </div>
                  </div>
                  
                  {/* Rule Name & Badge */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`text-3xl font-black ${
                        diceResult.severity === 'extreme' ? 'text-red-600' :
                        diceResult.severity === 'spicy' ? 'text-orange-600' :
                        diceResult.severity === 'mild' ? 'text-blue-600' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {diceResult.rule_name}
                      </span>
                      {diceResult.is_double && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full animate-bounce">
                          ĐÔI!
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">{diceResult.rule_description}</p>
                  </div>

                  {/* Action Card */}
                  <div className={`p-4 rounded-xl border-2 ${
                    diceResult.severity === 'extreme' ? 'bg-red-50 border-red-300' :
                    diceResult.severity === 'spicy' ? 'bg-orange-50 border-orange-300' :
                    diceResult.severity === 'mild' ? 'bg-blue-50 border-blue-300' :
                    'bg-green-50 border-green-300'
                  }`}>
                    <p className="font-bold text-lg flex items-center justify-center gap-2">
                      {diceResult.severity === 'extreme' && <Skull className="h-5 w-5 text-red-500" />}
                      {diceResult.severity === 'spicy' && <Flame className="h-5 w-5 text-orange-500" />}
                      {diceResult.severity === 'mild' && <Beer className="h-5 w-5 text-blue-500" />}
                      {diceResult.severity === 'safe' && <Sparkles className="h-5 w-5 text-green-500" />}
                      {diceResult.action}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                  className="gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full animate-in zoom-in-95 border-2 border-orange-300 shadow-2xl">
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center animate-bounce">
                <GameIcon type={pendingGame} className="h-10 w-10 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold">{GAME_INFO[pendingGame].name}</h2>
              <p className="text-orange-600 font-medium flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {GAME_INFO[pendingGame].warning}
              </p>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300">
                <p className="font-semibold mb-1 flex items-center justify-center gap-1">
                  <AlertCircle className="h-4 w-4" /> Nhớ luật chơi:
                </p>
                <p>Từ chối/Thất bại = Phải uống phạt!</p>
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
                  className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
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

      {/* Loading Suspense Overlay */}
      {(gamePhase === 'loading' || gamePhase === 'countdown') && activeGame && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md">
          <div className="text-center space-y-6">
            {gamePhase === 'loading' ? (
              <>
                {/* Game-specific loading animation */}
                {activeGame === 'dice' && (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl shadow-2xl flex items-center justify-center text-4xl font-black text-white animate-bounce" style={{ animationDelay: '0s' }}>
                      {Math.floor(Math.random() * 6) + 1}
                    </div>
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl shadow-2xl flex items-center justify-center text-4xl font-black text-white animate-bounce" style={{ animationDelay: '0.1s' }}>
                      {Math.floor(Math.random() * 6) + 1}
                    </div>
                  </div>
                )}
                {activeGame === 'truth_or_dare' && (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full shadow-2xl flex items-center justify-center animate-bounce">
                      <MessageCircleQuestion className="h-12 w-12 text-white" />
                    </div>
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-full shadow-2xl flex items-center justify-center animate-bounce" style={{ animationDelay: '0.2s' }}>
                      <Target className="h-12 w-12 text-white" />
                    </div>
                  </div>
                )}
                {activeGame === 'never_have_i_ever' && (
                  <div className="flex items-center justify-center">
                    <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full shadow-2xl flex items-center justify-center animate-bounce">
                      <Hand className="h-14 w-14 text-white" />
                    </div>
                  </div>
                )}
                {activeGame === 'challenge' && (
                  <div className="flex items-center justify-center">
                    <div className="w-28 h-28 bg-gradient-to-br from-orange-500 to-red-500 rounded-full shadow-2xl flex items-center justify-center animate-pulse">
                      <Flame className="h-14 w-14 text-white animate-bounce" />
                    </div>
                  </div>
                )}
                
                {/* Spinner */}
                <div className="relative">
                  <div className={`w-24 h-24 mx-auto rounded-full border-4 border-t-4 animate-spin ${
                    activeGame === 'dice' ? 'border-purple-500/30 border-t-purple-500' :
                    activeGame === 'truth_or_dare' ? 'border-pink-500/30 border-t-pink-500' :
                    activeGame === 'never_have_i_ever' ? 'border-blue-500/30 border-t-blue-500' :
                    'border-orange-500/30 border-t-orange-500'
                  }`} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GameIcon type={activeGame} className={`h-10 w-10 animate-pulse ${
                      activeGame === 'dice' ? 'text-purple-400' :
                      activeGame === 'truth_or_dare' ? 'text-pink-400' :
                      activeGame === 'never_have_i_ever' ? 'text-blue-400' :
                      'text-orange-400'
                    }`} />
                  </div>
                </div>
                
                <p className="text-white text-2xl font-bold animate-pulse">{loadingMessage}</p>
                <p className="text-gray-400 dark:text-gray-500">{GAME_INFO[activeGame].name}</p>
                <div className="flex justify-center gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-3 h-3 rounded-full animate-bounce ${
                        activeGame === 'dice' ? 'bg-purple-500' :
                        activeGame === 'truth_or_dare' ? 'bg-pink-500' :
                        activeGame === 'never_have_i_ever' ? 'bg-blue-500' :
                        'bg-orange-500'
                      }`}
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </>
            ) : countdown > 0 ? (
              <>
                <div className={`text-9xl font-black animate-ping ${
                  activeGame === 'dice' ? 'text-purple-400' :
                  activeGame === 'truth_or_dare' ? 'text-pink-400' :
                  activeGame === 'never_have_i_ever' ? 'text-blue-400' :
                  'text-orange-400'
                }`}>
                  {countdown}
                </div>
                <p className={`text-2xl font-bold animate-pulse ${
                  activeGame === 'dice' ? 'text-purple-400' :
                  activeGame === 'truth_or_dare' ? 'text-pink-400' :
                  activeGame === 'never_have_i_ever' ? 'text-blue-400' :
                  'text-orange-400'
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRules(null)}>
          <Card className="max-w-md w-full animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <CardHeader className="relative">
              <button 
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setShowRules(null)}
              >
                <X className="h-5 w-5" />
              </button>
              <CardTitle>{GAME_RULES[showRules as keyof typeof GAME_RULES]?.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {GAME_RULES[showRules as keyof typeof GAME_RULES]?.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-4" onClick={() => setShowRules(null)}>
                Đã hiểu! 🍻
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Adult Content Warning Modal */}
      {showAdultWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAdultWarning(false)}>
          <Card className="max-w-md w-full animate-in zoom-in-95 border-2 border-pink-300 dark:border-pink-700" onClick={e => e.stopPropagation()}>
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-2">
                <span className="text-3xl">🔞</span>
              </div>
              <CardTitle className="text-pink-600 dark:text-pink-400">Cảnh báo nội dung người lớn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4 text-sm text-pink-800 dark:text-pink-300">
                <p className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Lưu ý quan trọng:
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Nội dung 18+ chỉ dành cho người trưởng thành</li>
                  <li>Các câu hỏi có thể nhạy cảm hoặc khiêu khích</li>
                  <li>Chỉ chơi khi tất cả người tham gia đều đồng ý</li>
                  <li>Tôn trọng giới hạn của mọi người</li>
                </ul>
              </div>
              <p className="text-center text-sm text-muted-foreground">
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
                  className="flex-1 bg-pink-500 hover:bg-pink-600"
                  onClick={() => {
                    setAdultContentEnabled(true)
                    setShowAdultWarning(false)
                    toast.success('Đã bật nội dung 18+')
                  }}
                >
                  Tôi đồng ý 🔞
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
