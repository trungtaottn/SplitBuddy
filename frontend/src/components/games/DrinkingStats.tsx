import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Beer, Trophy, Crown, Medal, Award } from 'lucide-react'
import type { ApiResponse, DrinkingStats as DrinkingStatsType, LeaderboardEntry } from '@/types/api'

interface DrinkingStatsProps {
  sessionId?: string
}

const RANK_ICONS = [
  <Crown key="1" className="h-5 w-5 text-yellow-500" />,
  <Medal key="2" className="h-5 w-5 text-gray-400" />,
  <Award key="3" className="h-5 w-5 text-amber-600" />,
]

export function SessionDrinkingStats({ sessionId }: DrinkingStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['drinking-stats', sessionId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DrinkingStatsType[]>>(`/games/stats/${sessionId}`)
      return res.data.data
    },
    enabled: !!sessionId,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Beer className="h-5 w-5 text-amber-500" />
            Thống kê uống
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats || stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Beer className="h-5 w-5 text-amber-500" />
            Thống kê uống
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Chưa có dữ liệu thống kê
          </p>
        </CardContent>
      </Card>
    )
  }

  // Sort by total drinks descending
  const sortedStats = [...stats].sort((a, b) => b.total_drinks - a.total_drinks)
  const maxDrinks = sortedStats[0]?.total_drinks || 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Beer className="h-5 w-5 text-amber-500" />
          Thống kê uống
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedStats.map((stat, index) => (
            <div
              key={stat.participant_id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200' : 'bg-gray-50'
              }`}
            >
              <div className="w-6 flex justify-center">
                {index < 3 ? RANK_ICONS[index] : (
                  <span className="text-sm text-gray-400">{index + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{stat.participant_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                    style={{ width: `${(stat.total_drinks / maxDrinks) * 100}%`, minWidth: '10px' }}
                  />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-amber-600">{stat.total_drinks} 🍺</p>
                <p className="text-xs text-gray-400">
                  {stat.games_played} lượt · {stat.games_lost} thua
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function GlobalLeaderboard() {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<LeaderboardEntry[]>>('/games/leaderboard?limit=10')
      return res.data.data
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Bảng xếp hạng "Vua Nhậu"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Bảng xếp hạng "Vua Nhậu"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Chưa có dữ liệu xếp hạng. Hãy chơi game để lên bảng!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Bảng xếp hạng "Vua Nhậu" 👑
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.participant_id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.02] ${
                index === 0
                  ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 shadow-md'
                  : index === 1
                  ? 'bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300'
                  : index === 2
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'
                  : 'bg-gray-50'
              }`}
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow">
                {index < 3 ? RANK_ICONS[index] : (
                  <span className="text-sm font-bold text-gray-500">{entry.rank}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${index === 0 ? 'text-lg' : ''}`}>
                  {entry.participant_name}
                  {index === 0 && ' 👑'}
                </p>
                <p className="text-xs text-gray-500">
                  {entry.total_games} lượt chơi
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${index === 0 ? 'text-2xl text-amber-600' : 'text-lg text-gray-700'}`}>
                  {entry.total_drinks}
                </p>
                <p className="text-xs text-gray-400">shots</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SessionDrinkingStats
