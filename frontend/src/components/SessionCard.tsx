import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Calendar, ArrowRight, TrendingDown, TrendingUp, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/lib/utils'
import { SwipeActions } from '@/components/ui/SwipeActions'
import { triggerHaptic } from '@/hooks/useHaptic'

/**
 * SessionCard - Vintage Receipt/Note Style
 * Features:
 * - Paper card with aged effect
 * - Typewriter typography
 * - Stamp-style status badges
 */

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
  base_currency: string
  participants: Participant[]
  user_debt?: number
  user_owed?: number
  settled_amount?: number
  archived_at?: string | null
}

// Vintage Status Badges
const STATUS_CONFIG = {
  active: {
    label: 'ACTIVE',
    className: 'badge-stamp text-success border-success rotate-[-2deg]',
  },
  settled: {
    label: 'DONE',
    className: 'badge-stamp text-muted-foreground border-muted-foreground rotate-[1deg]',
  },
  pending: {
    label: 'PENDING',
    className: 'badge-stamp text-warning border-warning rotate-[-1deg]',
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
          className="relative h-7 w-7 rounded-sm border-2 border-card overflow-hidden bg-primary"
          style={{ zIndex: max - i }}
          title={p.name}
        >
          {p.avatar_url ? (
            <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-primary-foreground text-xs font-bold">
              {p.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="relative h-7 w-7 rounded-sm border-2 border-card bg-secondary flex items-center justify-center">
          <span className="text-[10px] font-semibold text-secondary-foreground">+{remaining}</span>
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
  base_currency,
  participants,
  user_debt = 0,
  user_owed = 0,
  settled_amount = 0,
  archived_at,
}: SessionCardProps) {
  const statusConfig = STATUS_CONFIG[status]
  const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const isArchived = Boolean(archived_at)

  // Calculate settlement progress
  const totalDebts = total_amount > 0 ? total_amount : 1
  const settlementProgress = Math.min(100, Math.round((settled_amount / totalDebts) * 100))
  const hasDebtInfo = user_debt > 0 || user_owed > 0

  return (
    <Link
      to={`/sessions/${id}`}
      className="block group h-full"
    >
      {/* Vintage Paper Card */}
      <div className="card-paper p-4 space-y-3 h-full flex flex-col card-lift">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors uppercase tracking-wide text-sm">
              📋 {name}
            </h3>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={cn('text-[10px]', statusConfig.className)}>
              {statusConfig.label}
            </span>
            {isArchived && (
              <span className="badge-stamp text-muted-foreground border-muted-foreground rotate-[2deg] text-[9px]">
                ARCHIVED
              </span>
            )}
          </div>
        </div>

        {/* Divider - dotted line like receipt */}
        <div className="hr-dotted" />

        {/* Participants */}
        <div className="flex items-center justify-between">
          <AvatarStack participants={participants} max={5} />
          <span className="text-xs text-muted-foreground">
            {participants.length} người
          </span>
        </div>

        {/* Settlement Progress */}
        {total_amount > 0 && status !== 'settled' && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
              <span>Progress</span>
              <span>{settlementProgress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-none overflow-hidden border border-border">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
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

        {/* Debt Info */}
        {hasDebtInfo && (
          <div className="flex flex-wrap gap-2">
            {user_debt > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive text-[10px] font-semibold uppercase">
                <TrendingDown className="h-3 w-3" strokeWidth={1.5} />
                <span>Nợ {formatCurrency(user_debt, base_currency)}</span>
              </div>
            )}
            {user_owed > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success text-[10px] font-semibold uppercase">
                <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
                <span>Được {formatCurrency(user_owed, base_currency)}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer - Total */}
        <div className="flex justify-between items-center pt-3 border-t-2 border-double border-border mt-auto">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Total</span>
            <span className="font-bold text-lg text-foreground">
              {formatCurrency(total_amount, base_currency)}
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" strokeWidth={1.5} />
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
      icon: <Trash2 className="h-5 w-5" strokeWidth={1.5} />,
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
      icon: <Pencil className="h-5 w-5" strokeWidth={1.5} />,
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
      className="rounded-sm overflow-hidden"
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
  base_currency,
}: Omit<SessionCardProps, 'location' | 'settled_amount' | 'user_debt' | 'user_owed'>) {
  const statusConfig = STATUS_CONFIG[status]
  const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'short',
  })

  return (
    <Link to={`/sessions/${id}`} className="block group">
      <div className="rounded-sm bg-card border border-border p-3 hover:shadow-paper transition-all flex items-center gap-3">
        <div className="flex -space-x-1">
          {participants.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="h-6 w-6 rounded-sm border border-card bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold"
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors uppercase tracking-wide">{name}</p>
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-sm">{formatCurrency(total_amount, base_currency)}</p>
          <span className={cn('text-[9px]', statusConfig.className)}>
            {statusConfig.label}
          </span>
        </div>
      </div>
    </Link>
  )
}
