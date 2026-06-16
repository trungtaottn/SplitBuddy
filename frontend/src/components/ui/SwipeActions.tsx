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

