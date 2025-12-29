import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dices, Sparkles, MessageCircleQuestion, Flame, RotateCcw, Beer, HelpCircle, X, Skull, Zap } from 'lucide-react'
import { toast } from '@/components/ui/toaster'
import type { ApiResponse } from '@/types/api'

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
  message: string
}

const GAME_RULES = {
  truth_or_dare: {
    title: '🎯 Luật chơi Sự thật hay Thách thức',
    rules: [
      'Chọn Sự thật hoặc Thách thức',
      'Không trả lời = Uống 2 shot',
      'Từ chối thách thức = Uống 3 shot',
      'Nói dối bị phát hiện = Uống 5 shot 🔥'
    ]
  },
  never_have_i_ever: {
    title: '🙅 Luật chơi Tôi chưa bao giờ',
    rules: [
      'Đọc câu "Tôi chưa bao giờ..."',
      'Ai ĐÃ TỪNG làm điều đó phải UỐNG',
      'Uống = Thừa nhận đã làm',
      'Không uống = Chưa bao giờ làm'
    ]
  },
  challenge: {
    title: '🔥 Luật chơi Thử thách',
    rules: [
      'Hoàn thành thử thách được đưa ra',
      'Thất bại = Uống theo độ khó',
      'Dễ: 1 shot | Trung bình: 2 shot',
      'Khó: 3 shot | Cực khó: 5 shot 💀'
    ]
  },
  dice: {
    title: '🎲 Luật chơi Xúc xắc',
    rules: [
      'Tung 2 xúc xắc và làm theo kết quả',
      'Ra đôi = Chọn người uống',
      'Tổng 7 = Cả bàn cùng uống',
      'Tổng 2 hoặc 12 = Người quay uống gấp đôi'
    ]
  }
}

export default function GamesPage() {
  const [currentGame, setCurrentGame] = useState<'truth_or_dare' | 'never_have_i_ever' | 'challenge' | 'dice' | null>(null)
  const [gameContent, setGameContent] = useState<GameContent | null>(null)
  const [diceResult, setDiceResult] = useState<DiceResult | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [showRules, setShowRules] = useState<string | null>(null)

  const truthOrDare = useMutation({
    mutationFn: async () => {
      const res = await api.get<ApiResponse<GameContent>>('/games/truth-or-dare')
      return res.data.data
    },
    onSuccess: (data) => {
      setGameContent(data)
      setCurrentGame('truth_or_dare')
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
      setCurrentGame('never_have_i_ever')
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
      setCurrentGame('challenge')
    },
    onError: () => toast.error('Không thể lấy thử thách')
  })

  const rollDice = useMutation({
    mutationFn: async () => {
      setIsSpinning(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      const res = await api.get<ApiResponse<DiceResult>>('/games/dice')
      return res.data.data
    },
    onSuccess: (data) => {
      setDiceResult(data)
      setCurrentGame('dice')
      setIsSpinning(false)
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
        <p className="text-xs text-orange-500 mt-1">⚠️ Uống có trách nhiệm - Đã uống không lái xe</p>
      </div>

      {/* Game Selection */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-2 border-2 hover:border-pink-400 group"
          onClick={() => truthOrDare.mutate()}
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
          onClick={() => neverHaveIEver.mutate()}
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
          onClick={() => challenge.mutate()}
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
          onClick={() => rollDice.mutate()}
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

      {/* Game Result */}
      {(gameContent || diceResult) && (
        <Card className="border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              {currentGame === 'truth_or_dare' && (
                <>
                  <MessageCircleQuestion className="h-6 w-6 text-pink-500" />
                  {gameContent?.content_type === 'truth' ? '🤔 Sự thật' : '🎯 Thách thức'}
                </>
              )}
              {currentGame === 'never_have_i_ever' && (
                <>🙅 Tôi chưa bao giờ...</>
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
                <p className="text-2xl font-semibold leading-relaxed animate-fade-in">{gameContent.content}</p>
                <div className="flex items-center justify-center gap-3">
                  <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${getDifficultyColor(gameContent.difficulty)}`}>
                    {getDifficultyLabel(gameContent.difficulty)}
                  </span>
                  {gameContent.difficulty && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                      <Beer className="h-4 w-4" />
                      {gameContent.difficulty === 'easy' && '1 shot nếu từ chối'}
                      {gameContent.difficulty === 'medium' && '2 shot nếu từ chối'}
                      {gameContent.difficulty === 'hard' && '3 shot nếu từ chối'}
                      {gameContent.difficulty === 'extreme' && '5 shot nếu từ chối 💀'}
                    </span>
                  )}
                </div>
              </>
            )}
            {diceResult && (
              <>
                <div className="flex items-center justify-center gap-6 text-7xl">
                  <span className={`bg-white rounded-xl shadow-xl p-5 border-2 ${diceResult.is_double ? 'border-yellow-400 animate-pulse' : 'border-gray-200'}`}>
                    {['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceResult.dice1 - 1]}
                  </span>
                  <span className={`bg-white rounded-xl shadow-xl p-5 border-2 ${diceResult.is_double ? 'border-yellow-400 animate-pulse' : 'border-gray-200'}`}>
                    {['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceResult.dice2 - 1]}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${diceResult.is_double ? 'text-yellow-600' : diceResult.total === 7 ? 'text-red-600' : 'text-gray-800'}`}>
                  {diceResult.message}
                </p>
                {diceResult.total === 2 || diceResult.total === 12 ? (
                  <p className="text-red-500 font-medium animate-bounce">🔥 Uống gấp đôi!</p>
                ) : null}
              </>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (currentGame === 'truth_or_dare') truthOrDare.mutate()
                  else if (currentGame === 'never_have_i_ever') neverHaveIEver.mutate()
                  else if (currentGame === 'challenge') challenge.mutate()
                  else if (currentGame === 'dice') rollDice.mutate()
                }}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Câu tiếp theo
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setGameContent(null)
                  setDiceResult(null)
                  setCurrentGame(null)
                }}
                className="text-gray-500"
              >
                Đổi trò chơi
              </Button>
            </div>
          </CardContent>
        </Card>
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
