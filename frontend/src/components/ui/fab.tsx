import { useState, ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { haptics } from '@/utils/haptics'

/**
 * FAB - Vintage Paper Style
 * Uses sepia monochrome colors with paper texture
 */

interface FabAction {
  icon: ReactNode
  label: string
  onClick: () => void
  color?: string
}

interface FabProps {
  actions: FabAction[]
  className?: string
}

export function Fab({ actions, className }: FabProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOpen = () => {
    haptics.light()
    setIsOpen(!isOpen)
  }

  const handleAction = (action: FabAction) => {
    haptics.medium()
    setIsOpen(false)
    action.onClick()
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/10 z-40 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container */}
      <div className={cn('fixed bottom-20 right-4 z-50 md:bottom-6', className)}>
        {/* Action buttons */}
        <div className={cn(
          'absolute bottom-16 right-0 flex flex-col-reverse gap-3 transition-all duration-300',
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        )}>
          {actions.map((action, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 animate-in slide-in-from-bottom duration-200"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="bg-card border border-border px-3 py-1.5 rounded-sm shadow-paper text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                {action.label}
              </span>
              <button
                onClick={() => handleAction(action)}
                className={cn(
                  'w-11 h-11 rounded-sm shadow-paper flex items-center justify-center transition-all hover:scale-105 hover:shadow-lifted border-2',
                  action.color || 'bg-card border-primary text-primary'
                )}
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>

        {/* Main FAB button - Vintage stamp style */}
        <button
          onClick={toggleOpen}
          className={cn(
            'w-12 h-12 rounded-sm shadow-paper flex items-center justify-center transition-all duration-200',
            'bg-primary text-primary-foreground border-2 border-primary',
            'hover:shadow-lifted hover:scale-105 active:scale-95',
            isOpen && 'rotate-45 bg-muted text-muted-foreground border-muted-foreground'
          )}
        >
          {isOpen ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Plus className="h-5 w-5" strokeWidth={1.5} />}
        </button>
      </div>
    </>
  )
}

// Simple single-action FAB
interface SimpleFabProps {
  icon: ReactNode
  onClick: () => void
  label?: string
  className?: string
}

export function SimpleFab({ icon, onClick, label, className }: SimpleFabProps) {
  const handleClick = () => {
    haptics.medium()
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      title={label}
      className={cn(
        'fixed bottom-20 right-4 z-50 md:bottom-6',
        'w-12 h-12 rounded-sm shadow-paper flex items-center justify-center',
        'bg-primary text-primary-foreground border-2 border-primary',
        'hover:shadow-lifted hover:scale-105 active:scale-95 transition-all duration-200',
        className
      )}
    >
      {icon}
    </button>
  )
}
