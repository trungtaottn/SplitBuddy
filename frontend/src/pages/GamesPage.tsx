import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dices, Sparkles, MessageCircleQuestion, Flame, RotateCcw, Beer, HelpCircle, X, Skull, Zap, AlertCircle, Target, Hand } from 'lucide-react'
import { toast } from '@/components/ui/toaster'
import type { ApiResponse } from '@/types/api'

type GameType = 'truth_or_dare' | 'never_have_i_ever' | 'challenge' | 'dice'

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

export default function GamesPage() {
  const [currentGame, setCurrentGame] = useState<GameType | null>(null)
  const [gameContent, setGameContent] = useState<GameContent | null>(null)
  const [diceResult, setDiceResult] = useState<DiceResult | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [showRules, setShowRules] = useState<string | null>(null)
  
  // New states for effects
  const [pendingGame, setPendingGame] = useState<GameType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)

  // Countdown effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Loading message rotation
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingMessage(SUSPENSE_MESSAGES[Math.floor(Math.random() * SUSPENSE_MESSAGES.length)])
      }, 800)
      return () => clearInterval(interval)
    }
  }, [isLoading])

  const startGame = async (gameType: GameType) => {
    setPendingGame(null)
    setIsLoading(true)
    setIsRevealed(false)
    setLoadingMessage(SUSPENSE_MESSAGES[Math.floor(Math.random() * SUSPENSE_MESSAGES.length)])
    
    // Suspense delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsLoading(false)
    setCountdown(3)
    
    // Wait for countdown
    await new Promise(resolve => setTimeout(resolve, 3500))
    
    // Now fetch and reveal
    if (gameType === 'truth_or_dare') truthOrDare.mutate()
    else if (gameType === 'never_have_i_ever') neverHaveIEver.mutate()
    else if (gameType === 'challenge') challenge.mutate()
    else if (gameType === 'dice') rollDice.mutate()
  }

  const handleGameSelect = (gameType: GameType) => {
    if (currentGame === gameType) {
      // Already playing this game, just get next question
      startGame(gameType)
    } else {
      // Show confirmation
      setPendingGame(gameType)
    }
  }

  const truthOrDare = useMutation({
    mutationFn: async () => {
      const res = await api.get<ApiResponse<GameContent>>('/games/truth-or-dare')
      return res.data.data
    },
    onSuccess: (data) => {
      setGameContent(data)
      setDiceResult(null)
      setCurrentGame('truth_or_dare')
      setIsRevealed(true)
    },
    onError: () => toast.error('Không thể lấy câu hỏi')
  })

  const neverHaveIEver = useMutation({
    mutationFn: async () => {
      const res = await api.get<ApiResponse<GameContent>>('/games/never-have-i-ever')
      return res.data.data
    },
    onSuccess: (data) => {
      setGameContent(data)
      setDiceResult(null)
      setCurrentGame('never_have_i_ever')
      setIsRevealed(true)
    },
    onError: () => toast.error('Không thể lấy câu hỏi')
  })

  const challenge = useMutation({
    mutationFn: async () => {
      const res = await api.get<ApiResponse<GameContent>>('/games/challenges')
      return res.data.data
    },
    onSuccess: (data) => {
      setGameContent(data)
      setDiceResult(null)
      setCurrentGame('challenge')
      setIsRevealed(true)
    },
    onError: () => toast.error('Không thể lấy thử thách')
  })

  const rollDice = useMutation({
    mutationFn: async () => {
      setIsSpinning(true)
      await new Promise(resolve => setTimeout(resolve, 1500))
      const res = await api.get<ApiResponse<DiceResult>>('/games/dice')
      return res.data.data
    },
    onSuccess: (data) => {
      setDiceResult(data)
      setGameContent(null)
      setCurrentGame('dice')
      setIsSpinning(false)
      setIsRevealed(true)
    },
    onError: () => {
      toast.error('Không thể tung xúc xắc')
      setIsSpinning(false)
    }
  })

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      case 'extreme': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyLabel = (difficulty: string | null) => {
    switch (difficulty) {
      case 'easy': return 'Dễ'
      case 'medium': return 'Trung bình'
      case 'hard': return 'Khó'
      case 'extreme': return 'Cực khó'
      default: return 'Không xác định'
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-2">
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
              <span className="text-3xl">🙅</span>
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
      </div>

      {/* Game Result Overlay */}
      {isRevealed && (gameContent || diceResult) && !isLoading && countdown === 0 && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
          <Card className="max-w-lg w-full mx-4 border-2 border-orange-300 shadow-2xl animate-in zoom-in-95">
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
                    <div className={`w-24 h-24 rounded-2xl shadow-2xl flex items-center justify-center text-5xl font-black bg-gradient-to-br transition-all duration-300 ${
                      diceResult.severity === 'extreme' ? 'from-red-500 to-orange-500 text-white animate-pulse border-4 border-red-300' :
                      diceResult.severity === 'spicy' ? 'from-orange-400 to-yellow-400 text-white border-4 border-orange-300' :
                      diceResult.severity === 'mild' ? 'from-blue-400 to-cyan-400 text-white border-4 border-blue-300' :
                      'from-gray-100 to-white text-gray-800 border-2 border-gray-200'
                    }`}>
                      {diceResult.dice1}
                    </div>
                    <div className={`w-24 h-24 rounded-2xl shadow-2xl flex items-center justify-center text-5xl font-black bg-gradient-to-br transition-all duration-300 ${
                      diceResult.severity === 'extreme' ? 'from-red-500 to-orange-500 text-white animate-pulse border-4 border-red-300' :
                      diceResult.severity === 'spicy' ? 'from-orange-400 to-yellow-400 text-white border-4 border-orange-300' :
                      diceResult.severity === 'mild' ? 'from-blue-400 to-cyan-400 text-white border-4 border-blue-300' :
                      'from-gray-100 to-white text-gray-800 border-2 border-gray-200'
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
                        'text-gray-600'
                      }`}>
                        {diceResult.rule_name}
                      </span>
                      {diceResult.is_double && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full animate-bounce">
                          ĐÔI!
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-lg">{diceResult.rule_description}</p>
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
                    <p className="text-sm text-gray-500 mt-1">
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
                  onClick={() => {
                    setGameContent(null)
                    setDiceResult(null)
                    setCurrentGame(null)
                    setIsRevealed(false)
                  }}
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
              <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-600">
                <p className="font-semibold mb-1 flex items-center justify-center gap-1">
                  <AlertCircle className="h-4 w-4" /> Nhớ luật chơi:
                </p>
                <p>Từ chối/Thất bại = Phải uống phạt!</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setPendingGame(null)}
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
      {(isLoading || countdown > 0) && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md">
          <div className="text-center space-y-6">
            {isLoading ? (
              <>
                {/* Animated Dice Rolling */}
                <div className="flex items-center justify-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-2xl flex items-center justify-center text-4xl font-black text-white animate-bounce" style={{ animationDelay: '0s' }}>
                    {Math.floor(Math.random() * 6) + 1}
                  </div>
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-2xl flex items-center justify-center text-4xl font-black text-white animate-bounce" style={{ animationDelay: '0.1s' }}>
                    {Math.floor(Math.random() * 6) + 1}
                  </div>
                </div>
                <div className="relative">
                  <div className="w-24 h-24 mx-auto rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Dices className="h-10 w-10 text-orange-400 animate-pulse" />
                  </div>
                </div>
                <p className="text-white text-2xl font-bold animate-pulse">{loadingMessage}</p>
                <div className="flex justify-center gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </>
            ) : countdown > 0 ? (
              <>
                <div className="text-9xl font-black text-white animate-ping">
                  {countdown}
                </div>
                <p className="text-2xl text-orange-400 font-bold animate-pulse">
                  Chuẩn bị đón nhận số phận...
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
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
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
    </div>
  )
}
