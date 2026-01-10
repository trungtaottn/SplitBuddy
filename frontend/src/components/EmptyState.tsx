import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Beer, Users, Receipt, Wallet, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * EmptyState - Vintage Paper Style
 * Features:
 * - Typewriter text
 * - Paper texture background
 * - Stamp-style action buttons
 */

type EmptyStateType = 'sessions' | 'bills' | 'debts' | 'groups' | 'search' | 'games'

interface EmptyStateProps {
  type: EmptyStateType
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  searchTerm?: string
  className?: string
}

const EMPTY_STATES: Record<EmptyStateType, {
  icon: ReactNode
  title: string
  description: string
  illustration: ReactNode
}> = {
  sessions: {
    icon: <Beer className="h-5 w-5" strokeWidth={1.5} />,
    title: 'No Sessions Yet',
    description: 'Create your first session to start splitting bills with friends.',
    illustration: (
      <div className="relative">
        <div className="text-5xl">📋</div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
          ~ empty ~
        </div>
      </div>
    ),
  },
  bills: {
    icon: <Receipt className="h-5 w-5" strokeWidth={1.5} />,
    title: 'No Bills Yet',
    description: 'Add your first bill using the + button above.',
    illustration: (
      <div className="relative">
        <div className="text-5xl">🧾</div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
          ~ empty ~
        </div>
      </div>
    ),
  },
  debts: {
    icon: <Wallet className="h-5 w-5" strokeWidth={1.5} />,
    title: 'All Clear!',
    description: 'No debts to settle. You\'re all good!',
    illustration: (
      <div className="relative">
        <div className="text-5xl">✓</div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-success">
          ~ settled ~
        </div>
      </div>
    ),
  },
  groups: {
    icon: <Users className="h-5 w-5" strokeWidth={1.5} />,
    title: 'No Groups Yet',
    description: 'Create a group to manage your drinking buddies.',
    illustration: (
      <div className="relative flex gap-1">
        <span className="text-4xl opacity-30"></span>
        <span className="text-4xl opacity-50"></span>
        <span className="text-4xl opacity-30"></span>
      </div>
    ),
  },
  search: {
    icon: <Search className="h-5 w-5" strokeWidth={1.5} />,
    title: 'No Results Found',
    description: 'Try a different search term.',
    illustration: (
      <div className="relative">
        <div className="text-5xl opacity-50">🔍</div>
      </div>
    ),
  },
  games: {
    icon: <Sparkles className="h-5 w-5" strokeWidth={1.5} />,
    title: 'Ready to Play!',
    description: 'Pick a game to get the party started.',
    illustration: (
      <div className="relative flex gap-2">
        <span className="text-3xl">🎲</span>
        <span className="text-3xl">🃏</span>
        <span className="text-3xl">🎯</span>
      </div>
    ),
  },
}

export function EmptyState({
  type,
  title,
  description,
  action,
  secondaryAction,
  searchTerm,
  className,
}: EmptyStateProps) {
  const config = EMPTY_STATES[type]
  const displayTitle = searchTerm 
    ? `No results for "${searchTerm}"`
    : (title || config.title)
  const displayDescription = description || config.description

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      'animate-ink-fade',
      className
    )}>
      {/* Illustration */}
      <div className="mb-6 relative p-6 card-note inline-block">
        {config.illustration}
      </div>
      
      {/* Title - Typewriter style */}
      <h3 className="text-base font-semibold text-foreground mb-2 uppercase tracking-wider">
        {displayTitle}
      </h3>
      
      {/* Description */}
      <p className="text-sm text-muted-foreground max-w-xs mb-6 italic">
        {displayDescription}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button onClick={action.onClick} variant="stamp" className="gap-2">
              {config.icon}
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            <>
              {action && (
                <span className="text-xs text-muted-foreground self-center hidden sm:block">
                  — or —
                </span>
              )}
              <Button variant="outline" onClick={secondaryAction.onClick} className="gap-2">
                {secondaryAction.label}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function SearchEmptyState({ searchTerm, onClear }: { searchTerm: string; onClear?: () => void }) {
  return (
    <EmptyState
      type="search"
      searchTerm={searchTerm}
      action={onClear ? {
        label: 'Clear Search',
        onClick: onClear,
      } : undefined}
    />
  )
}
