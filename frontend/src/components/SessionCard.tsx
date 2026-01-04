import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Calendar, ArrowRight, TrendingDown, TrendingUp, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/lib/utils'
import { SwipeActions } from '@/components/ui/SwipeActions'
import { triggerHaptic } from '@/hooks/useHaptic'

interface Participant {
  id: string
  name: string
  avatar_url?: string | null
}

interface SessionCardProps {
  id: string
  name: string
  location?: string | null
  date: string
  status: 'active' | 'settled' | 'pending'
  total_amount: number
  participants: Participant[]
  user_debt?: number
  user_owed?: number
  settled_amount?: number
}

// Minimalist Retro Status Colors
const STATUS_CONFIG = {
  active: {
    label: 'Đang diễn ra',
    className: 'bg-success/15 text-success dark:bg-success/20',
  },
  settled: {
    label: 'Đã xong',
    className: 'bg-muted text-muted-foreground',
  },
  pending: {
    label: 'Chờ thanh toán',
    className: 'bg-warning/15 text-warning dark:bg-warning/20',
  },
}

function AvatarStack({ participants, max = 4 }: { participants: Participant[]; max?: number }) {
  const displayed = participants.slice(0, max)
  const remaining = participants.length - max

  return (
    <div className="flex -space-x-2">
      {displayed.map((p, i) => (
        <div
          key={p.id}
          className="relative h-8 w-8 rounded-full border-2 border-card overflow-hidden bg-primary"
          style={{ zIndex: max - i }}
          title={p.name}
        >
          {p.avatar_url ? (
            <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-primary-foreground text-xs font-bold font-body">
              {p.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="relative h-8 w-8 rounded-full border-2 border-card bg-secondary flex items-center justify-center">
          <span className="text-xs font-medium text-secondary-foreground">+{remaining}</span>
        </div>
      )}
    </div>
  )
}

export function SessionCard({
  id,
  name,
  location,
  date,
  status,
  total_amount,
  participants,
  user_debt = 0,
  user_owed = 0,
  settled_amount = 0,
}: SessionCardProps) {
  const statusConfig = STATUS_CONFIG[status]
  const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  // Calculate settlement progress
  const totalDebts = total_amount > 0 ? total_amount : 1
  const settlementProgress = Math.min(100, Math.round((settled_amount / totalDebts) * 100))
  const hasDebtInfo = user_debt > 0 || user_owed > 0

  return (
    <Link
      to={`/sessions/${id}`}
      className="block group h-full"
    >
      {/* Minimalist Retro Card - Warm shadows, soft corners */}
      <div className="rounded-xl bg-card border border-border/40 p-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-primary/30 hover:-translate-y-1 space-y-3 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="font-heading font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              🍺 {name}
            </h3>
            <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
              {location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', statusConfig.className)}>
            {statusConfig.label}
          </span>
        </div>

        {/* Participants */}
        <div className="flex items-center justify-between">
          <AvatarStack participants={participants} max={5} />
          {participants.length > 5 && (
            <span className="text-xs text-muted-foreground">+{participants.length - 5}</span>
          )}
        </div>

        {/* Settlement Progress - Retro style bar */}
        {total_amount > 0 && status !== 'settled' && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tiến độ thanh toán</span>
              <span className="font-mono">{settlementProgress}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  settlementProgress === 100 
                    ? "bg-success" 
                    : settlementProgress > 50 
                      ? "bg-warning" 
                      : "bg-primary"
                )}
                style={{ width: `${settlementProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Debt Info - Retro badges */}
        {hasDebtInfo && (
          <div className="flex flex-wrap gap-2">
            {user_debt > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
                <TrendingDown className="h-3 w-3" />
                <span className="font-mono">Nợ {formatCurrency(user_debt)}</span>
              </div>
            )}
            {user_owed > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-success/10 text-success text-xs font-medium">
                <TrendingUp className="h-3 w-3" />
                <span className="font-mono">Được {formatCurrency(user_owed)}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer - Total with mono font */}
        <div className="flex justify-between items-center pt-3 border-t border-border/50 mt-auto">
          <span className="font-bold text-lg font-mono text-foreground">
            {formatCurrency(total_amount)}
          </span>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  )
}

// Swipeable version of SessionCard for mobile
interface SwipeableSessionCardProps extends SessionCardProps {
  onDelete?: () => void
  enableSwipe?: boolean
}

export function SwipeableSessionCard({
  onDelete,
  enableSwipe = true,
  ...props
}: SwipeableSessionCardProps) {
  const navigate = useNavigate()
  
  if (!enableSwipe) {
    return <SessionCard {...props} />
  }

  const rightActions = onDelete ? [
    {
      icon: <Trash2 className="h-5 w-5" />,
      label: 'Xóa',
      onClick: () => {
        triggerHaptic('heavy')
        onDelete()
      },
      color: 'red' as const,
    },
  ] : []

  const leftActions = [
    {
      icon: <Pencil className="h-5 w-5" />,
      label: 'Sửa',
      onClick: () => {
        triggerHaptic('tap')
        navigate(`/sessions/${props.id}`)
      },
      color: 'blue' as const,
    },
  ]

  return (
    <SwipeActions
      leftActions={leftActions}
      rightActions={rightActions}
      className="rounded-xl overflow-hidden"
    >
      <SessionCard {...props} />
    </SwipeActions>
  )
}

export function SessionCardCompact({
  id,
  name,
  date,
  status,
  total_amount,
  participants,
}: Omit<SessionCardProps, 'location' | 'settled_amount' | 'user_debt' | 'user_owed'>) {
  const statusConfig = STATUS_CONFIG[status]
  const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'short',
  })

  return (
    <Link to={`/sessions/${id}`} className="block group">
      <div className="rounded-lg bg-card border border-border/40 p-3 hover:shadow-sm transition-all flex items-center gap-3">
        <div className="flex -space-x-1">
          {participants.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="h-6 w-6 rounded-full border border-card bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold"
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors font-heading">{name}</p>
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-sm font-mono">{formatCurrency(total_amount)}</p>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', statusConfig.className)}>
            {statusConfig.label}
          </span>
        </div>
      </div>
    </Link>
  )
}
