import { useState, useRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SwipeAction {
  icon: ReactNode
  label: string
  onClick: () => void
  color: 'red' | 'green' | 'blue' | 'amber' | 'gray'
}

interface SwipeActionsProps {
  children: ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  threshold?: number
  className?: string
}

const colorStyles = {
  red: 'bg-red-500 text-white',
  green: 'bg-green-500 text-white',
  blue: 'bg-blue-500 text-white',
  amber: 'bg-amber-500 text-white',
  gray: 'bg-gray-500 text-white',
}

export function SwipeActions({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  className,
}: SwipeActionsProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    
    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current

    // Limit the swipe distance
    const maxLeft = leftActions.length * 80
    const maxRight = rightActions.length * 80
    
    const limitedDiff = Math.max(-maxRight, Math.min(maxLeft, diff))
    setTranslateX(limitedDiff)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    
    // Check if threshold is passed
    if (Math.abs(translateX) < threshold) {
      setTranslateX(0)
      return
    }

    if (translateX > threshold && leftActions.length > 0) {
      // Show left actions
      setTranslateX(leftActions.length * 80)
    } else if (translateX < -threshold && rightActions.length > 0) {
      // Show right actions
      setTranslateX(-rightActions.length * 80)
    } else {
      setTranslateX(0)
    }
  }

  const resetSwipe = () => {
    setTranslateX(0)
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left actions (shown when swiping right) */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex">
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick()
                resetSwipe()
              }}
              className={cn(
                "w-20 flex flex-col items-center justify-center gap-1 transition-transform",
                colorStyles[action.color]
              )}
              style={{
                transform: translateX > 0 ? 'translateX(0)' : `translateX(-100%)`,
              }}
            >
              {action.icon}
              <span className="text-xs">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions (shown when swiping left) */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex">
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick()
                resetSwipe()
              }}
              className={cn(
                "w-20 flex flex-col items-center justify-center gap-1 transition-transform",
                colorStyles[action.color]
              )}
              style={{
                transform: translateX < 0 ? 'translateX(0)' : 'translateX(100%)',
              }}
            >
              {action.icon}
              <span className="text-xs">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          "relative bg-white dark:bg-gray-800 z-10",
          !isDragging && "transition-transform duration-200"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

// Pull to refresh component
interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  threshold?: number
  className?: string
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing) return
    if (containerRef.current?.scrollTop !== 0) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current

    if (diff > 0) {
      e.preventDefault()
      // Apply resistance
      const resistance = 0.5
      setPullDistance(Math.min(diff * resistance, threshold * 1.5))
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    setPullDistance(0)
  }

  const progress = Math.min(pullDistance / threshold, 1)

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center overflow-hidden transition-all"
        style={{ 
          height: isRefreshing ? 48 : pullDistance,
          top: 0,
        }}
      >
        <div 
          className={cn(
            "flex items-center justify-center",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: `rotate(${progress * 360}deg)`,
            opacity: progress,
          }}
        >
          {isRefreshing ? (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <svg 
              className="w-6 h-6 text-primary" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? 48 : pullDistance}px)`,
          transition: pullDistance === 0 && !isRefreshing ? 'transform 0.2s' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Keyboard shortcuts hook
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useState(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Build shortcut string
      const parts = []
      if (e.metaKey || e.ctrlKey) parts.push('cmd')
      if (e.shiftKey) parts.push('shift')
      if (e.altKey) parts.push('alt')
      parts.push(e.key.toLowerCase())
      
      const shortcut = parts.join('+')
      
      if (shortcuts[shortcut]) {
        e.preventDefault()
        shortcuts[shortcut]()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })
}

// Floating action button
export function FloatingActionButton({
  icon,
  onClick,
  label,
  className,
}: {
  icon: ReactNode
  onClick: () => void
  label?: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-40",
        "w-14 h-14 rounded-full",
        "bg-primary text-white shadow-lg",
        "flex items-center justify-center",
        "hover:shadow-xl hover:scale-105 active:scale-95",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        className
      )}
      aria-label={label}
    >
      {icon}
    </button>
  )
}

