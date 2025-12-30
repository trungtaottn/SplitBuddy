import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUp, ArrowDown, RotateCcw, X, Beer, Zap } from 'lucide-react'
import { soundManager } from '@/utils/sounds'

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const VALUE_ORDER: Record<string, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠'
}

const SUIT_COLORS: Record<string, string> = {
  hearts: 'text-red-500', diamonds: 'text-red-500',
  clubs: 'text-gray-800', spades: 'text-gray-800'
}

interface CardType {
  suit: typeof SUITS[number]
  value: string
}

interface HighOrLowProps {
  onClose?: () => void
}

export function HighOrLow({ onClose }: HighOrLowProps) {
  const [deck, setDeck] = useState<CardType[]>([])
  const [currentCard, setCurrentCard] = useState<CardType | null>(null)
  const [nextCard, setNextCard] = useState<CardType | null>(null)
  const [streak, setStreak] = useState(0)
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [isRevealing, setIsRevealing] = useState(false)
  const [totalDrinks, setTotalDrinks] = useState(0)

  const createDeck = (): CardType[] => {
    const newDeck: CardType[] = []
    for (const suit of SUITS) {
      for (const value of VALUES) {
        newDeck.push({ suit, value })
      }
    }
    // Shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]]
    }
    return newDeck
  }

  const startGame = () => {
    const newDeck = createDeck()
    const firstCard = newDeck.pop()!
    setDeck(newDeck)
    setCurrentCard(firstCard)
    setNextCard(null)
    setStreak(0)
    setResult(null)
    setTotalDrinks(0)
    soundManager.playClick()
  }

  const makeGuess = (guess: 'high' | 'low') => {
    if (!currentCard || deck.length === 0 || isRevealing) return

    setIsRevealing(true)
    soundManager.playClick()

    setTimeout(() => {
      const newDeck = [...deck]
      const drawnCard = newDeck.pop()!
      setDeck(newDeck)
      setNextCard(drawnCard)

      const currentValue = VALUE_ORDER[currentCard.value]
      const nextValue = VALUE_ORDER[drawnCard.value]

      let isCorrect = false
      if (guess === 'high' && nextValue > currentValue) isCorrect = true
      if (guess === 'low' && nextValue < currentValue) isCorrect = true
      if (nextValue === currentValue) isCorrect = true // Same = safe

      if (isCorrect) {
        setStreak(prev => prev + 1)
        setResult('correct')
        soundManager.playSuccess()
      } else {
        const drinks = Math.max(1, streak)
        setTotalDrinks(prev => prev + drinks)
        setStreak(0)
        setResult('wrong')
        soundManager.playDanger()
      }

      // Move to next card after delay
      setTimeout(() => {
        setCurrentCard(drawnCard)
        setNextCard(null)
        setResult(null)
        setIsRevealing(false)
      }, 1500)
    }, 500)
  }

  const renderCard = (card: CardType | null, isNext = false) => {
    if (!card) return null
    
    return (
      <div className={`w-24 h-36 bg-white rounded-xl shadow-xl border-2 p-2 flex flex-col transition-all ${
        isNext && result === 'correct' ? 'border-green-400 ring-4 ring-green-200' :
        isNext && result === 'wrong' ? 'border-red-400 ring-4 ring-red-200' :
        'border-gray-200'
      }`}>
        <div className={`text-lg font-bold ${SUIT_COLORS[card.suit]}`}>
          {card.value}{SUIT_SYMBOLS[card.suit]}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className={`text-4xl ${SUIT_COLORS[card.suit]}`}>
            {SUIT_SYMBOLS[card.suit]}
          </span>
        </div>
        <div className={`text-lg font-bold text-right rotate-180 ${SUIT_COLORS[card.suit]}`}>
          {card.value}{SUIT_SYMBOLS[card.suit]}
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Cao hay Thấp?
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Còn lại:</span>
            <span className="font-bold">{deck.length}/52</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="font-bold">Streak: {streak}</span>
          </div>
          <div className="flex items-center gap-2">
            <Beer className="h-4 w-4 text-amber-500" />
            <span className="font-bold">{totalDrinks}</span>
          </div>
        </div>

        {/* Card Display */}
        <div className="flex items-center justify-center gap-4 min-h-[180px]">
          {currentCard ? (
            <>
              {renderCard(currentCard)}
              {nextCard && (
                <>
                  <div className="text-2xl">→</div>
                  {renderCard(nextCard, true)}
                </>
              )}
            </>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">🃏</div>
              <p className="text-muted-foreground">Bấm bắt đầu để chơi!</p>
            </div>
          )}
        </div>

        {/* Result Message */}
        {result && (
          <div className={`text-center p-3 rounded-lg ${
            result === 'correct' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {result === 'correct' ? (
              <p className="text-green-700 font-bold">✅ Đúng rồi! Streak +1</p>
            ) : (
              <p className="text-red-700 font-bold">
                ❌ Sai! Uống {Math.max(1, streak)} ly! 🍺
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {currentCard && !isRevealing && deck.length > 0 && (
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => makeGuess('low')}
              className="flex-1 gap-2 bg-blue-500 hover:bg-blue-600"
              size="lg"
            >
              <ArrowDown className="h-5 w-5" />
              Thấp hơn
            </Button>
            <Button
              onClick={() => makeGuess('high')}
              className="flex-1 gap-2 bg-red-500 hover:bg-red-600"
              size="lg"
            >
              <ArrowUp className="h-5 w-5" />
              Cao hơn
            </Button>
          </div>
        )}

        {/* Start/Reset Button */}
        {(!currentCard || deck.length === 0) && (
          <Button onClick={startGame} className="w-full gap-2" size="lg">
            <RotateCcw className="h-5 w-5" />
            {currentCard ? 'Chơi lại' : 'Bắt đầu'}
          </Button>
        )}

        {/* Streak Bonus Info */}
        {streak >= 3 && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <p className="text-sm text-yellow-700">
              🔥 Streak {streak}! Sai = uống {streak} ly!
            </p>
          </div>
        )}

        {/* Rules */}
        <div className="p-3 bg-gray-50 border rounded-lg text-xs text-muted-foreground">
          <p className="font-medium mb-1">Luật chơi:</p>
          <ul className="space-y-0.5">
            <li>• Đoán lá tiếp cao hơn hay thấp hơn</li>
            <li>• Đoán đúng: Streak +1</li>
            <li>• Đoán sai: Uống số ly = streak (tối thiểu 1)</li>
            <li>• Bằng nhau = An toàn</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
