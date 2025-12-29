import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dices, Sparkles, MessageCircleQuestion, Flame, RotateCcw } from 'lucide-react'
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

export default function GamesPage() {
  const [currentGame, setCurrentGame] = useState<'truth_or_dare' | 'never_have_i_ever' | 'challenge' | 'dice' | null>(null)
  const [gameContent, setGameContent] = useState<GameContent | null>(null)
  const [diceResult, setDiceResult] = useState<DiceResult | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)

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
          <Sparkles className="h-8 w-8 text-yellow-500" />
          Trò chơi nhậu
        </h1>
        <p className="text-muted-foreground mt-2">Chọn một trò chơi để bắt đầu!</p>
      </div>

      {/* Game Selection */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-2 hover:border-pink-300"
          onClick={() => truthOrDare.mutate()}
        >
          <CardContent className="p-6 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-pink-100 flex items-center justify-center">
              <MessageCircleQuestion className="h-8 w-8 text-pink-500" />
            </div>
            <h3 className="font-bold text-lg">Sự thật hay Thách thức</h3>
            <p className="text-sm text-muted-foreground mt-1">Truth or Dare</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-2 hover:border-blue-300"
          onClick={() => neverHaveIEver.mutate()}
        >
          <CardContent className="p-6 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-2xl">🙅</span>
            </div>
            <h3 className="font-bold text-lg">Tôi chưa bao giờ</h3>
            <p className="text-sm text-muted-foreground mt-1">Never Have I Ever</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-2 hover:border-orange-300"
          onClick={() => challenge.mutate()}
        >
          <CardContent className="p-6 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
              <Flame className="h-8 w-8 text-orange-500" />
            </div>
            <h3 className="font-bold text-lg">Thử thách</h3>
            <p className="text-sm text-muted-foreground mt-1">Random Challenge</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-2 hover:border-purple-300"
          onClick={() => rollDice.mutate()}
        >
          <CardContent className="p-6 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
              <Dices className={`h-8 w-8 text-purple-500 ${isSpinning ? 'animate-spin' : ''}`} />
            </div>
            <h3 className="font-bold text-lg">Tung xúc xắc</h3>
            <p className="text-sm text-muted-foreground mt-1">Roll Dice</p>
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
                <p className="text-xl font-medium">{gameContent.content}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(gameContent.difficulty)}`}>
                  {getDifficultyLabel(gameContent.difficulty)}
                </span>
              </>
            )}
            {diceResult && (
              <>
                <div className="flex items-center justify-center gap-4 text-6xl">
                  <span className="bg-white rounded-lg shadow-lg p-4 border-2 border-gray-200">
                    {['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceResult.dice1 - 1]}
                  </span>
                  <span className="bg-white rounded-lg shadow-lg p-4 border-2 border-gray-200">
                    {['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceResult.dice2 - 1]}
                  </span>
                </div>
                <p className="text-2xl font-bold">{diceResult.message}</p>
              </>
            )}
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
              Chơi lại
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
