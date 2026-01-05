import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Beer, Plus, Minus, Trophy, AlertTriangle, X, Users } from 'lucide-react'
import { soundManager } from '@/utils/sounds'
import { BeerIcon } from '@/components/ui/BeerIcon'

interface Participant {
  id: string
  name: string
  drinks: number
}

interface DrinkingCounterProps {
  onClose?: () => void
}

const WARNING_THRESHOLD = 5
const DANGER_THRESHOLD = 8

export function DrinkingCounter({ onClose }: DrinkingCounterProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [newName, setNewName] = useState('')
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

  const addParticipant = () => {
    if (!newName.trim()) return
    setParticipants([...participants, { id: Date.now().toString(), name: newName.trim(), drinks: 0 }])
    setNewName('')
  }

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id))
  }

  const updateDrinks = (id: string, delta: number) => {
    setParticipants(participants.map(p => {
      if (p.id === id) {
        const newDrinks = Math.max(0, p.drinks + delta)
        // Play sound on drink
        if (delta > 0) {
          soundManager.playClick()
          // Warning sound at threshold
          if (newDrinks === WARNING_THRESHOLD) {
            soundManager.playDanger()
          }
        }
        return { ...p, drinks: newDrinks }
      }
      return p
    }))
  }

  const resetAll = () => {
    setParticipants(participants.map(p => ({ ...p, drinks: 0 })))
  }

  const totalDrinks = participants.reduce((sum, p) => sum + p.drinks, 0)
  const leader = participants.length > 0 
    ? participants.reduce((max, p) => p.drinks > max.drinks ? p : max, participants[0])
    : null

  const getDrinkColor = (drinks: number) => {
    if (drinks >= DANGER_THRESHOLD) return 'text-red-600 bg-red-50'
    if (drinks >= WARNING_THRESHOLD) return 'text-orange-600 bg-orange-50'
    if (drinks >= 3) return 'text-yellow-600 bg-yellow-50'
    return 'text-emerald-600 bg-emerald-50'
  }

  return (
    <Card ref={cardRef} className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between font-heading">
          <div className="flex items-center gap-3">
            <BeerIcon size={28} className="text-warning" />
            <span className="text-xl">Đếm số ly</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{participants.length}</p>
            <p className="text-xs text-blue-500">Người chơi</p>
          </div>
          <div className="p-2 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-600">{totalDrinks}</p>
            <p className="text-xs text-amber-500">Tổng ly</p>
          </div>
          <div className="p-2 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Trophy className="h-4 w-4 text-purple-500" />
              <p className="text-sm font-bold text-purple-600 truncate">
                {leader?.name || '-'}
              </p>
            </div>
            <p className="text-xs text-purple-500">Dẫn đầu</p>
          </div>
        </div>

        {/* Add participant */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
            placeholder="Thêm người chơi..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <Button size="sm" onClick={addParticipant}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick add */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const names = ['An', 'Bình', 'Chi', 'Dũng']
              setParticipants(names.map((n, i) => ({ id: `demo-${i}`, name: n, drinks: 0 })))
            }}
          >
            Demo 4 người
          </Button>
          <Button variant="outline" size="sm" onClick={resetAll}>
            Reset tất cả
          </Button>
        </div>

        {/* Participants list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {participants.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Thêm người chơi để bắt đầu</p>
            </div>
          ) : (
            participants.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${getDrinkColor(p.drinks)}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <span className="font-medium">{p.name}</span>
                  {p.drinks >= DANGER_THRESHOLD && (
                    <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateDrinks(p.id, -1)}
                    disabled={p.drinks === 0}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-bold text-lg">{p.drinks}</span>
                  <Button
                    size="sm"
                    onClick={() => updateDrinks(p.id, 1)}
                    className="h-8 w-8 p-0 bg-amber-500 hover:bg-amber-600"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Warning message */}
        {participants.some(p => p.drinks >= WARNING_THRESHOLD) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-sm text-red-600 font-medium">
              ⚠️ Uống có trách nhiệm - Đã uống không lái xe!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
