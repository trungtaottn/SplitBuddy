import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Beer, Users, Receipt, Wallet, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    icon: <Beer className="h-6 w-6" />,
    title: 'Chưa có buổi nhậu nào!',
    description: 'Tạo session đầu tiên để bắt đầu chia tiền với bạn bè.',
    illustration: (
      <div className="relative">
        <div className="text-6xl animate-float">🍺</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full blur-sm" />
      </div>
    ),
  },
  bills: {
    icon: <Receipt className="h-6 w-6" />,
    title: 'Chưa có hóa đơn nào',
    description: 'Thêm bill đầu tiên bằng nút + bên trên.',
    illustration: (
      <div className="relative">
        <div className="text-6xl animate-float">🧾</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full blur-sm" />
      </div>
    ),
  },
  debts: {
    icon: <Wallet className="h-6 w-6" />,
    title: 'Tuyệt vời! Không có nợ nần gì 🎉',
    description: 'Bạn không nợ ai và không ai nợ bạn. Tiếp tục nhậu thôi!',
    illustration: (
      <div className="relative">
        <div className="text-6xl animate-bounce-in">🎉</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-14 h-2 bg-gray-200 dark:bg-gray-700 rounded-full blur-sm" />
      </div>
    ),
  },
  groups: {
    icon: <Users className="h-6 w-6" />,
    title: 'Chưa có nhóm nào',
    description: 'Tạo nhóm để dễ dàng quản lý và chia tiền với bạn nhậu.',
    illustration: (
      <div className="relative flex -space-x-4">
        <div className="text-5xl animate-float" style={{ animationDelay: '0s' }}>👤</div>
        <div className="text-5xl animate-float" style={{ animationDelay: '0.2s' }}>👤</div>
        <div className="text-5xl animate-float" style={{ animationDelay: '0.4s' }}>👤</div>
      </div>
    ),
  },
  search: {
    icon: <Search className="h-6 w-6" />,
    title: 'Không tìm thấy kết quả',
    description: 'Thử tìm với từ khóa khác.',
    illustration: (
      <div className="relative">
        <div className="text-6xl">🔍</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full blur-sm" />
      </div>
    ),
  },
  games: {
    icon: <Sparkles className="h-6 w-6" />,
    title: 'Sẵn sàng chơi!',
    description: 'Chọn một trò chơi để bắt đầu cuộc vui.',
    illustration: (
      <div className="relative flex gap-2">
        <div className="text-4xl animate-float" style={{ animationDelay: '0s' }}>🎲</div>
        <div className="text-4xl animate-float" style={{ animationDelay: '0.3s' }}>🃏</div>
        <div className="text-4xl animate-float" style={{ animationDelay: '0.6s' }}>🎯</div>
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
    ? `Không tìm thấy "${searchTerm}"`
    : (title || config.title)
  const displayDescription = description || config.description

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      'animate-in fade-in duration-500',
      className
    )}>
      <div className="mb-6">
        {config.illustration}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {displayTitle}
      </h3>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        {displayDescription}
      </p>

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              {config.icon}
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            <>
              {action && (
                <span className="text-sm text-gray-400 self-center hidden sm:block">hoặc</span>
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
        label: 'Xóa tìm kiếm',
        onClick: onClear,
      } : undefined}
    />
  )
}
