
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Trophy, Sparkles, Crown } from 'lucide-react'
import type { PersonaLeaderboardEntry } from '@/types/api'
import { useAuth } from '@/contexts/AuthContext'

export function Leaderboard() {
  const { user } = useAuth()
  
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: api.personas.getLeaderboard
  })

  // Get top 3
  const top3 = leaderboard?.slice(0, 3) || []
  const rest = leaderboard?.slice(3) || []

  if (isLoading) {
    return <div className="text-center text-zinc-500 py-8">Đang tải bảng xếp hạng...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {top3[1] && <Top3Card entry={top3[1]} rank={2} isMe={top3[1].user_id === user?.id} />}
        {top3[0] && <Top3Card entry={top3[0]} rank={1} isMe={top3[0].user_id === user?.id} />}
        {top3[2] && <Top3Card entry={top3[2]} rank={3} isMe={top3[2].user_id === user?.id} />}
      </div>

      <Card className="bg-zinc-900 border-white/5">
        <CardHeader className="pb-3 border-b border-white/5">
          <CardTitle className="text-white text-base font-bold flex items-center justify-between">
            <span>Bảng xếp hạng nhậu</span>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-1">
            {rest.map((entry: PersonaLeaderboardEntry) => (
              <div 
                key={entry.user_id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  entry.user_id === user?.id 
                    ? 'bg-orange-500/10 border-orange-500/20' 
                    : 'bg-zinc-800/30 border-transparent hover:bg-zinc-800'
                }`}
              >
                <div className="w-8 text-center font-heading font-bold text-zinc-500">#{entry.rank}</div>
                
                <Avatar className="h-10 w-10 border border-white/10">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback>{entry.full_name[0]}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold truncate ${entry.user_id === user?.id ? 'text-orange-500' : 'text-zinc-200'}`}>
                      {entry.full_name}
                    </p>
                    {entry.current_title && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {entry.current_title}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">Level {entry.level}</p>
                </div>
                
                <div className="text-right">
                  <p className="font-heading font-bold text-orange-400">{entry.xp.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase">XP</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Top3Card({ entry, rank, isMe }: { entry: PersonaLeaderboardEntry, rank: number, isMe: boolean }) {
  const getRankColor = (r: number) => {
    switch(r) {
      case 1: return 'text-yellow-500 from-yellow-500/20 to-yellow-500/5 border-yellow-500/30'
      case 2: return 'text-gray-300 from-gray-400/20 to-gray-400/5 border-gray-400/30'
      case 3: return 'text-amber-700 from-amber-700/20 to-amber-700/5 border-amber-700/30'
      default: return 'text-zinc-500'
    }
  }

  const colorClass = getRankColor(rank)
  const isFirst = rank === 1

  return (
    <div className={`relative flex flex-col items-center bg-gradient-to-b ${colorClass} rounded-2xl p-6 border ${isMe ? 'ring-2 ring-orange-500' : ''}`}>
      {isFirst && (
        <div className="absolute -top-4">
          <Crown className="h-8 w-8 text-yellow-500 fill-yellow-500 animate-bounce" />
        </div>
      )}
      
      <div className={`relative mb-3 ${isFirst ? 'scale-110' : ''}`}>
        <Avatar className={`h-16 w-16 border-2 ${rank === 1 ? 'border-yellow-500' : rank === 2 ? 'border-gray-400' : 'border-amber-700'}`}>
          <AvatarImage src={entry.avatar_url || undefined} />
          <AvatarFallback>{entry.full_name[0]}</AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-lg bg-zinc-950 border border-white/10 ${rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-300' : 'text-amber-700'}`}>
          #{rank}
        </div>
      </div>

      <div className="text-center mt-2">
        <p className={`font-bold truncate max-w-[120px] ${isMe ? 'text-orange-400' : 'text-white'}`}>
          {entry.full_name}
        </p>
        <p className="text-xs text-zinc-400 mb-1">Level {entry.level}</p>
        {entry.current_title && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-black/20 text-xs text-white/80 mb-2">
            <Sparkles className="h-3 w-3 mr-1" />
            {entry.current_title}
          </span>
        )}
        <div className="bg-black/20 rounded-lg px-3 py-1 mt-1">
          <span className="font-heading font-bold text-white">{entry.xp.toLocaleString()}</span>
          <span className="text-[10px] ml-1 text-white/50 uppercase">XP</span>
        </div>
      </div>
    </div>
  )
}
