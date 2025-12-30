import { useState, ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { haptics } from '@/utils/haptics'

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
          className="fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-200"
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
              <span className="bg-white px-3 py-1.5 rounded-lg shadow-md text-sm font-medium whitespace-nowrap">
                {action.label}
              </span>
              <button
                onClick={() => handleAction(action)}
                className={cn(
                  'w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110',
                  action.color || 'bg-primary text-white'
                )}
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>

        {/* Main FAB button */}
        <button
          onClick={toggleOpen}
          className={cn(
            'w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300',
            'bg-gradient-to-r from-orange-500 to-red-500 text-white',
            'hover:shadow-2xl hover:scale-105 active:scale-95',
            isOpen && 'rotate-45 bg-gray-700'
          )}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
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
        'w-14 h-14 rounded-full shadow-xl flex items-center justify-center',
        'bg-gradient-to-r from-orange-500 to-red-500 text-white',
        'hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200',
        className
      )}
    >
      {icon}
    </button>
  )
}
