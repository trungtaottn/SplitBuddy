import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, RotateCcw, Shuffle, X, Users, Crown, SkipForward } from 'lucide-react'
import { soundManager } from '@/utils/sounds'

interface Player {
  id: string
  name: string
  played: number
}

interface PlayerRotationProps {
  onClose?: () => void
  onPlayerSelected?: (player: Player) => void
}

export function PlayerRotation({ onClose, onPlayerSelected }: PlayerRotationProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [newName, setNewName] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose?.()
      }
    }

    if (onClose) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const addPlayer = () => {
    if (!newName.trim()) return
    setPlayers([...players, { id: Date.now().toString(), name: newName.trim(), played: 0 }])
    setNewName('')
  }

  const removePlayer = (id: string) => {
    const newPlayers = players.filter(p => p.id !== id)
    setPlayers(newPlayers)
    if (currentIndex >= newPlayers.length) {
      setCurrentIndex(Math.max(0, newPlayers.length - 1))
    }
  }

  const nextPlayer = () => {
    if (players.length === 0) return
    
    setIsAnimating(true)
    soundManager.playClick()
    
    // Mark current player as played
    const updatedPlayers = players.map((p, i) => 
      i === currentIndex ? { ...p, played: p.played + 1 } : p
    )
    setPlayers(updatedPlayers)
    
    // Move to next player
    const nextIndex = (currentIndex + 1) % players.length
    setCurrentIndex(nextIndex)
    
    // Notify parent
    if (onPlayerSelected) {
      onPlayerSelected(updatedPlayers[nextIndex])
    }
    
    setTimeout(() => setIsAnimating(false), 300)
  }

  const skipPlayer = () => {
    if (players.length === 0) return
    soundManager.playClick()
    const nextIndex = (currentIndex + 1) % players.length
    setCurrentIndex(nextIndex)
  }

  const shufflePlayers = () => {
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    setPlayers(shuffled)
    setCurrentIndex(0)
    soundManager.playDiceRoll()
  }

  const resetRound = () => {
    setPlayers(players.map(p => ({ ...p, played: 0 })))
    setCurrentIndex(0)
  }

  const currentPlayer = players[currentIndex]
  const roundComplete = players.length > 0 && players.every(p => p.played > 0)

  return (
    <Card ref={cardRef} className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between font-heading">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" strokeWidth={2} />
            <span className="text-xl">Lượt chơi</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current player display */}
        {currentPlayer && (
          <div className={`text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border-2 border-blue-200 transition-all ${isAnimating ? 'scale-105' : ''}`}>
            <p className="text-sm text-blue-600 mb-1">Lượt của</p>
            <div className="flex items-center justify-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              <p className="text-3xl font-bold text-blue-800">{currentPlayer.name}</p>
            </div>
            <p className="text-xs text-blue-500 mt-2">
              Đã chơi {currentPlayer.played} lượt
            </p>
          </div>
        )}

        {/* Round complete notification */}
        {roundComplete && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-sm text-green-700 font-medium">
              🎉 Hoàn thành 1 vòng! Bấm reset để bắt đầu vòng mới.
            </p>
          </div>
        )}

        {/* Control buttons */}
        {players.length > 0 && (
          <div className="flex gap-2 justify-center">
            <Button onClick={nextPlayer} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Tiếp theo
            </Button>
            <Button variant="outline" onClick={skipPlayer}>
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={shufflePlayers}>
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={resetRound}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Add player */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            placeholder="Thêm người chơi..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <Button size="sm" onClick={addPlayer}>
            Thêm
          </Button>
        </div>

        {/* Quick add */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const names = ['An', 'Bình', 'Chi', 'Dũng', 'Em', 'Phong']
              setPlayers(names.map((n, i) => ({ id: `demo-${i}`, name: n, played: 0 })))
              setCurrentIndex(0)
            }}
          >
            Demo 6 người
          </Button>
        </div>

        {/* Player queue */}
        {players.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Thứ tự ({players.length} người):</p>
            <div className="flex flex-wrap gap-1">
              {players.map((p, i) => (
                <span
                  key={p.id}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                    i === currentIndex 
                      ? 'bg-blue-500 text-white font-bold scale-110' 
                      : p.played > 0 
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {i === currentIndex && <Crown className="h-3 w-3" />}
                  {p.name}
                  {p.played > 0 && <span className="opacity-50">({p.played})</span>}
                  <button
                    onClick={() => removePlayer(p.id)}
                    className="hover:text-red-500 ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {players.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Thêm người chơi để quản lý lượt</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
