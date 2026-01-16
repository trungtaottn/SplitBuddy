import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Crown, RotateCcw, X, Beer, Shuffle } from 'lucide-react'
import { BeerIcon } from '@/components/ui/BeerIcon'
import { soundManager } from '@/utils/sounds'

interface CardType {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  value: string
  rule: string
  description: string
  action: string
}

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

const CARD_RULES: Record<string, { rule: string; description: string; action: string }> = {
  'A': { rule: 'Waterfall', description: 'Cả bàn uống liên tục', action: 'Người bốc bài bắt đầu uống, người tiếp theo uống theo. Chỉ được dừng khi người trước dừng.' },
  '2': { rule: 'You', description: 'Chọn người uống', action: 'Chỉ định 1 người phải uống.' },
  '3': { rule: 'Me', description: 'Bạn uống', action: 'Bạn tự uống 1 ly.' },
  '4': { rule: 'Floor', description: 'Tay xuống đất', action: 'Tất cả chạm tay xuống đất. Người chậm nhất uống!' },
  '5': { rule: 'Guys', description: 'Nam uống', action: 'Tất cả nam trong bàn uống.' },
  '6': { rule: 'Chicks', description: 'Nữ uống', action: 'Tất cả nữ trong bàn uống.' },
  '7': { rule: 'Heaven', description: 'Tay lên trời', action: 'Tất cả giơ tay lên. Người chậm nhất uống!' },
  '8': { rule: 'Mate', description: 'Chọn bạn nhậu', action: 'Chọn 1 người làm "mate". Mỗi khi bạn uống, họ cũng phải uống.' },
  '9': { rule: 'Rhyme', description: 'Vần điệu', action: 'Nói 1 từ, người tiếp theo nói từ vần với nó. Ai không nghĩ ra phải uống.' },
  '10': { rule: 'Categories', description: 'Chủ đề', action: 'Chọn 1 chủ đề (VD: thương hiệu bia). Lần lượt kể tên. Ai hết ý phải uống.' },
  'J': { rule: 'Make a Rule', description: 'Tạo luật mới', action: 'Tạo 1 luật mới áp dụng cho cả game. VD: "Không được nói tên ai".' },
  'Q': { rule: 'Question Master', description: 'Vua câu hỏi', action: 'Bạn là Question Master. Ai trả lời câu hỏi của bạn phải uống (cho đến khi có Q mới).' },
  'K': { rule: 'King Cup', description: 'Ly Vua', action: 'Đổ 1 ít đồ uống vào ly King. Người bốc K thứ 4 phải uống hết ly King!' }
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
}

const SUIT_COLORS: Record<string, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-zinc-900',
  spades: 'text-zinc-900'
}

interface KingsCupProps {
  onClose?: () => void
}

export function KingsCup({ onClose }: KingsCupProps) {
  const [deck, setDeck] = useState<CardType[]>([])
  const [currentCard, setCurrentCard] = useState<CardType | null>(null)
  const [kingsDrawn, setKingsDrawn] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  // Initialize deck
  useEffect(() => {
    shuffleDeck()
  }, [])

  const createDeck = (): CardType[] => {
    const newDeck: CardType[] = []
    for (const suit of SUITS) {
      for (const value of VALUES) {
        const ruleData = CARD_RULES[value]
        newDeck.push({
          suit,
          value,
          rule: ruleData.rule,
          description: ruleData.description,
          action: ruleData.action
        })
      }
    }
    return newDeck
  }

  const shuffleDeck = () => {
    const newDeck = createDeck()
    // Fisher-Yates shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]]
    }
    setDeck(newDeck)
    setCurrentCard(null)
    setKingsDrawn(0)
    setGameOver(false)
    soundManager.playClick()
  }

  const drawCard = () => {
    if (deck.length === 0 || isFlipping || gameOver) return

    setIsFlipping(true)
    soundManager.playClick()

    setTimeout(() => {
      const newDeck = [...deck]
      const drawnCard = newDeck.pop()!
      setDeck(newDeck)
      setCurrentCard(drawnCard)

      // Check for King
      if (drawnCard.value === 'K') {
        const newKingsCount = kingsDrawn + 1
        setKingsDrawn(newKingsCount)
        if (newKingsCount === 4) {
          setGameOver(true)
          soundManager.playDanger()
        } else {
          soundManager.playSuccess()
        }
      } else {
        soundManager.playReveal()
      }

      setIsFlipping(false)
    }, 300)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between font-heading">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-warning" />
            King's Cup
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={shuffleDeck} title="Xáo bài mới">
              <Shuffle className="h-4 w-4" />
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
        {/* Stats */}
        <div className="flex justify-between text-sm font-body">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Còn lại:</span>
            <span className="font-bold font-mono">{deck.length}/52</span>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-warning" />
            <span className="font-bold font-mono">{kingsDrawn}/4</span>
          </div>
        </div>

        {/* King Cup Progress */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                i <= kingsDrawn
                  ? 'bg-warning border-warning text-warning-foreground'
                  : 'bg-secondary border-border text-muted-foreground'
              }`}
            >
              <Crown className="h-4 w-4" />
            </div>
          ))}
        </div>

        {/* Card Display Area */}
        <div className="relative h-64 flex items-center justify-center">
          {/* Card Back (Deck) */}
          {deck.length > 0 && !gameOver && (
            <div
              onClick={drawCard}
              className={`absolute cursor-pointer transition-all duration-300 ${
                isFlipping ? 'scale-95 opacity-50' : 'hover:scale-105'
              }`}
            >
              <div className="w-32 h-48 bg-gradient-to-br from-primary to-warning rounded-xl shadow-xl flex items-center justify-center border-4 border-card">
                <Crown className="h-12 w-12 text-primary-foreground/80" />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2 font-body">Bấm để bốc bài</p>
            </div>
          )}

          {/* Current Card */}
          {currentCard && (
            <div className={`absolute transition-all duration-500 ${isFlipping ? 'rotate-y-180 opacity-0' : ''}`}>
              <div className={`w-32 h-48 bg-white rounded-xl shadow-xl border-2 p-3 flex flex-col ${
                currentCard.value === 'K' ? 'border-yellow-500 ring-4 ring-yellow-500/20' : 'border-zinc-200'
              }`}>
                {/* Card Value Top */}
                <div className={`text-2xl font-bold ${SUIT_COLORS[currentCard.suit]}`}>
                  {currentCard.value}
                  <span className="ml-1">{SUIT_SYMBOLS[currentCard.suit]}</span>
                </div>
                
                {/* Card Center */}
                <div className="flex-1 flex items-center justify-center">
                  <span className={`text-6xl ${SUIT_COLORS[currentCard.suit]}`}>
                    {SUIT_SYMBOLS[currentCard.suit]}
                  </span>
                </div>
                
                {/* Card Value Bottom */}
                <div className={`text-2xl font-bold text-right rotate-180 ${SUIT_COLORS[currentCard.suit]}`}>
                  {currentCard.value}
                  <span className="ml-1">{SUIT_SYMBOLS[currentCard.suit]}</span>
                </div>
              </div>
            </div>
          )}

          {/* Game Over */}
          {gameOver && (
            <div className="text-center space-y-4">
              <div className="flex justify-center gap-2">
                <Crown className="h-16 w-16 text-warning animate-bounce" />
                <BeerIcon size={64} animated className="text-warning" />
              </div>
              <p className="text-xl font-heading font-bold text-warning">UỐNG LY KING!</p>
              <Button onClick={shuffleDeck} variant="stamp" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Chơi lại
              </Button>
            </div>
          )}

          {/* Empty Deck */}
          {deck.length === 0 && !gameOver && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Hết bài!</p>
              <Button onClick={shuffleDeck} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Xáo bài mới
              </Button>
            </div>
          )}
        </div>

        {/* Current Rule Display */}
        {currentCard && !gameOver && (
          <div className={`p-4 rounded-xl border ${
            currentCard.value === 'K' 
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' 
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold">{currentCard.rule}</span>
              <span className="text-sm text-muted-foreground">({currentCard.description})</span>
            </div>
            <p className="text-sm">{currentCard.action}</p>
            {currentCard.value === 'K' && (
              <div className="mt-2 flex items-center gap-2 text-yellow-700">
                <Beer className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {kingsDrawn === 4 ? 'Uống hết ly King!' : `Đổ vào ly King (${kingsDrawn}/4)`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Quick Rules Reference */}
        {!currentCard && !gameOver && deck.length === 52 && (
          <div className="text-xs text-zinc-400 space-y-1 p-3 bg-zinc-900 border border-white/5 rounded-lg">
            <p className="font-bold text-white mb-2">Luật nhanh:</p>
            <div className="grid grid-cols-2 gap-1">
              <span>A: Waterfall</span>
              <span>2: Chọn người</span>
              <span>3: Tự uống</span>
              <span>4: Floor</span>
              <span>5: Nam uống</span>
              <span>6: Nữ uống</span>
              <span>7: Heaven</span>
              <span>8: Mate</span>
              <span>9: Vần</span>
              <span>10: Chủ đề</span>
              <span>J: Tạo luật</span>
              <span>Q: Hỏi</span>
              <span className="col-span-2 font-bold text-yellow-500">K: Ly King (4 = uống!)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
