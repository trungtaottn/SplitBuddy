import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Beer, Target, Hand, Flame, Dices } from 'lucide-react'
import type { ApiResponse, GameHistoryEntry } from '@/types/api'

interface GameHistoryProps {
  sessionId: string
}

const GAME_ICONS: Record<string, React.ReactNode> = {
  truth_or_dare: <Target className="h-4 w-4 text-pink-500" />,
  never_have_i_ever: <Hand className="h-4 w-4 text-blue-500" />,
  challenge: <Flame className="h-4 w-4 text-orange-500" />,
  dice: <Dices className="h-4 w-4 text-purple-500" />,
}

const GAME_NAMES: Record<string, string> = {
  truth_or_dare: 'Sự thật/Thách thức',
  never_have_i_ever: 'Tôi chưa bao giờ',
  challenge: 'Thử thách',
  dice: 'Xúc xắc',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-500 border border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
  hard: 'bg-red-500/10 text-red-500 border border-red-500/20',
  extreme: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
}

export function GameHistory({ sessionId }: GameHistoryProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['game-history', sessionId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<GameHistoryEntry[]>>(`/games/history/${sessionId}?limit=20`)
      return res.data.data
    },
    enabled: !!sessionId,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Lịch sử chơi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-zinc-800 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Lịch sử chơi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Chưa có lượt chơi nào trong session này
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Lịch sử chơi ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900 border border-white/5 hover:bg-zinc-800/80 transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">
                {GAME_ICONS[entry.game_type] || <Beer className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">
                    {GAME_NAMES[entry.game_type] || entry.game_type}
                  </span>
                  {entry.difficulty && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[entry.difficulty] || 'bg-zinc-800 text-zinc-400'}`}>
                      {entry.difficulty}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 line-clamp-2">{entry.content_text}</p>
                {entry.player_name && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                       {entry.player_name}
                    </span>
                    {entry.drink_count && entry.drink_count > 0 && (
                      <span className="text-xs text-orange-600 flex items-center gap-0.5">
                        <Beer className="h-3 w-3" />
                        {entry.drink_count} shot
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 flex-shrink-0">
                {new Date(entry.created_at).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default GameHistory
