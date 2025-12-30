import { Link } from 'react-router-dom'
import { MapPin, Calendar, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/lib/utils'

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
}

const STATUS_CONFIG = {
  active: {
    label: 'Đang diễn ra',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  settled: {
    label: 'Đã xong',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  },
  pending: {
    label: 'Chờ thanh toán',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
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
          className="relative h-8 w-8 rounded-full border-2 border-white dark:border-gray-800 overflow-hidden bg-gradient-to-br from-orange-400 to-pink-500"
          style={{ zIndex: max - i }}
          title={p.name}
        >
          {p.avatar_url ? (
            <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-white text-xs font-bold">
              {p.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="relative h-8 w-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">+{remaining}</span>
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
}: SessionCardProps) {
  const statusConfig = STATUS_CONFIG[status]
  const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <Link
      to={`/sessions/${id}`}
      className="block group"
    >
      <div className="rounded-xl border bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/50 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
              🍺 {name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
              {location && (
                <span className="flex items-center gap-1 max-w-[120px]">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{location}</span>
                </span>
              )}
              <span className="flex items-center gap-1 flex-shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </span>
            </div>
          </div>
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', statusConfig.className)}>
            {statusConfig.label}
          </span>
        </div>

        {/* Participants */}
        <AvatarStack participants={participants} max={5} />

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(total_amount)}
          </span>
          <div className="flex items-center gap-2 text-sm">
            {user_debt > 0 && (
              <span className="text-red-500 dark:text-red-400">
                Bạn nợ {formatCurrency(user_debt)}
              </span>
            )}
            {user_owed > 0 && (
              <span className="text-green-500 dark:text-green-400">
                Được nợ {formatCurrency(user_owed)}
              </span>
            )}
            {user_debt === 0 && user_owed === 0 && status !== 'settled' && (
              <span className="text-gray-400"></span>
            )}
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </Link>
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
      <div className="rounded-lg border bg-white dark:bg-gray-800 p-3 hover:shadow-sm transition-all flex items-center gap-3">
        <div className="flex -space-x-1">
          {participants.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="h-6 w-6 rounded-full border border-white dark:border-gray-800 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold"
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-sm">{formatCurrency(total_amount)}</p>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded', statusConfig.className)}>
            {statusConfig.label}
          </span>
        </div>
      </div>
    </Link>
  )
}
