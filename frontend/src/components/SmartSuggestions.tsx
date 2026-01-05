import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Lightbulb, TrendingUp, Clock, Users, Repeat, Zap,
  ArrowRight, Sparkles, History
} from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/lib/utils'
import type { Session, Bill } from '@/types/api'

// Types for suggestions
interface Suggestion {
  id: string
  type: 'quick-action' | 'insight' | 'reminder' | 'pattern'
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  priority: number // 1-10, higher = more important
}

interface SmartSuggestionsProps {
  sessions?: Session[]
  recentBills?: Bill[]
  userStats?: {
    totalOwed: number
    totalOwe: number
    frequentContacts: string[]
  }
  onCreateSession?: () => void
  onViewDebts?: () => void
  className?: string
}

export function SmartSuggestions({
  sessions = [],
  recentBills = [],
  userStats,
  onCreateSession,
  onViewDebts,
  className,
}: SmartSuggestionsProps) {
  // Generate smart suggestions based on user data
  const suggestions = useMemo<Suggestion[]>(() => {
    const result: Suggestion[] = []
    const now = new Date()
    const dayOfWeek = now.getDay()
    const hour = now.getHours()

    // 1. Time-based suggestions
    if (dayOfWeek === 5 && hour >= 17) {
      result.push({
        id: 'friday-night',
        type: 'quick-action',
        icon: <Sparkles className="h-4 w-4 text-amber-500" />,
        title: 'Cuối tuần đến rồi! 🎉',
        description: 'Thời điểm tuyệt vời để tụ tập cùng bạn bè.',
        action: onCreateSession ? {
          label: 'Tạo cuộc nhậu',
          onClick: onCreateSession,
        } : undefined,
        priority: 9,
      })
    }

    // 2. Unsettled debts reminder
    if (userStats && (userStats.totalOwed > 0 || userStats.totalOwe > 0)) {
      if (userStats.totalOwe > 0) {
        result.push({
          id: 'pay-debt',
          type: 'reminder',
          icon: <Clock className="h-4 w-4 text-red-500" />,
          title: `Bạn đang nợ ${formatCurrency(userStats.totalOwe)}`,
          description: 'Thanh toán sớm để giữ tình bạn nhé!',
          action: onViewDebts ? {
            label: 'Xem chi tiết',
            onClick: onViewDebts,
          } : undefined,
          priority: 8,
        })
      }
      
      if (userStats.totalOwed > 0) {
        result.push({
          id: 'collect-debt',
          type: 'reminder',
          icon: <TrendingUp className="h-4 w-4 text-green-500" />,
          title: `Bạn được nợ ${formatCurrency(userStats.totalOwed)}`,
          description: 'Gửi nhắc nhở để thu hồi nợ.',
          action: onViewDebts ? {
            label: 'Nhắc nợ',
            onClick: onViewDebts,
          } : undefined,
          priority: 7,
        })
      }
    }

    // 3. Recent activity patterns
    if (sessions.length > 0) {
      const recentSessions = sessions.slice(0, 5)
      const avgParticipants = recentSessions.reduce((sum, s) => sum + s.participant_count, 0) / recentSessions.length
      
      if (avgParticipants > 4) {
        result.push({
          id: 'group-pattern',
          type: 'pattern',
          icon: <Users className="h-4 w-4 text-blue-500" />,
          title: 'Bạn hay đi nhậu nhóm lớn',
          description: `Trung bình ${Math.round(avgParticipants)} người/buổi. Tạo nhóm để tiện quản lý?`,
          priority: 5,
        })
      }
    }

    // 4. No recent sessions
    if (sessions.length === 0) {
      result.push({
        id: 'first-session',
        type: 'quick-action',
        icon: <Zap className="h-4 w-4 text-primary" />,
        title: 'Bắt đầu với Split Buddy',
        description: 'Tạo cuộc nhậu đầu tiên để trải nghiệm!',
        action: onCreateSession ? {
          label: 'Tạo ngay',
          onClick: onCreateSession,
        } : undefined,
        priority: 10,
      })
    }

    // 5. Repeat pattern detection
    if (recentBills.length > 3) {
      const descriptions = recentBills.map(b => b.description.toLowerCase())
      const commonItems = findMostCommon(descriptions)
      
      if (commonItems) {
        result.push({
          id: 'frequent-item',
          type: 'insight',
          icon: <Repeat className="h-4 w-4 text-purple-500" />,
          title: `"${commonItems}" hay xuất hiện`,
          description: 'Có vẻ đây là món phổ biến trong các cuộc nhậu của bạn!',
          priority: 4,
        })
      }
    }

    // 6. Weekend planning
    if (dayOfWeek === 4 && hour >= 10) { // Thursday
      result.push({
        id: 'weekend-plan',
        type: 'quick-action',
        icon: <History className="h-4 w-4 text-indigo-500" />,
        title: 'Cuối tuần sắp đến',
        description: 'Lên kế hoạch cho cuối tuần này chưa?',
        action: onCreateSession ? {
          label: 'Lên kế hoạch',
          onClick: onCreateSession,
        } : undefined,
        priority: 6,
      })
    }

    // Sort by priority
    return result.sort((a, b) => b.priority - a.priority).slice(0, 3)
  }, [sessions, recentBills, userStats, onCreateSession, onViewDebts])

  if (suggestions.length === 0) return null

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Lightbulb className="h-4 w-4" />
        <span>Gợi ý cho bạn</span>
      </div>
      
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard 
            key={suggestion.id} 
            suggestion={suggestion}
            delay={index * 100}
          />
        ))}
      </div>
    </div>
  )
}

function SuggestionCard({ 
  suggestion, 
  delay = 0 
}: { 
  suggestion: Suggestion
  delay?: number
}) {
  const typeStyles = {
    'quick-action': 'border-primary/20 bg-primary/5',
    'insight': 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20',
    'reminder': 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
    'pattern': 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
  }

  return (
    <div 
      className={cn(
        "rounded-xl border p-4 transition-all hover:shadow-md",
        "animate-in slide-in-from-bottom fade-in duration-300",
        typeStyles[suggestion.type]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
          {suggestion.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
            {suggestion.title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {suggestion.description}
          </p>
          
          {suggestion.action && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
              onClick={suggestion.action.onClick}
            >
              {suggestion.action.label}
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Quick action pills for common tasks
export function QuickActions({
  onCreateSession,
  onViewDebts,
  onPlayGames,
  className,
}: {
  onCreateSession?: () => void
  onViewDebts?: () => void
  onPlayGames?: () => void
  className?: string
}) {
  const actions = [
    { label: '🍺 Tạo cuộc nhậu', onClick: onCreateSession },
    { label: '💰 Xem công nợ', onClick: onViewDebts },
    { label: '🎲 Chơi game', onClick: onPlayGames },
  ].filter(a => a.onClick)

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium",
            "bg-white dark:bg-gray-800 border shadow-sm",
            "hover:shadow-md hover:border-primary/50 transition-all",
            "active:scale-95"
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

// Helper function to find most common item
function findMostCommon(items: string[]): string | null {
  const counts = new Map<string, number>()
  
  items.forEach(item => {
    // Normalize and count
    const normalized = item.toLowerCase().trim()
    counts.set(normalized, (counts.get(normalized) || 0) + 1)
  })

  let maxCount = 0
  let maxItem = null

  counts.forEach((count, item) => {
    if (count > maxCount && count >= 2) {
      maxCount = count
      maxItem = item
    }
  })

  return maxItem
}

// Bill amount predictor based on history
export function useBillPrediction(recentBills: Bill[]) {
  return useMemo(() => {
    if (recentBills.length < 3) return null

    const amounts = recentBills.map(b => parseFloat(b.amount))
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const rounded = Math.round(avg / 10000) * 10000 // Round to nearest 10k

    return {
      suggestedAmount: rounded,
      confidence: amounts.length >= 5 ? 'high' : 'medium',
    }
  }, [recentBills])
}

