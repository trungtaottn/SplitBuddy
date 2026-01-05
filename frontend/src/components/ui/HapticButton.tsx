import { forwardRef } from 'react'
import { Button, ButtonProps } from './button'
import { triggerHaptic, HapticType } from '@/hooks/useHaptic'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface HapticButtonProps extends ButtonProps {
  hapticType?: HapticType
  withScale?: boolean
}

// Button with haptic feedback and optional scale animation
export const HapticButton = forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({ hapticType = 'click', withScale = true, onClick, className, children, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      triggerHaptic(hapticType)
      onClick?.(e)
    }

    if (withScale) {
      return (
        <motion.div
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Button
            ref={ref}
            onClick={handleClick}
            className={cn('touch-manipulation', className)}
            {...props}
          >
            {children}
          </Button>
        </motion.div>
      )
    }

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        className={cn('touch-manipulation', className)}
        {...props}
      >
        {children}
      </Button>
    )
  }
)

HapticButton.displayName = 'HapticButton'

// FAB (Floating Action Button) with haptic feedback
interface HapticFABProps {
  onClick: () => void
  icon: React.ReactNode
  label?: string
  className?: string
  hapticType?: HapticType
}

export function HapticFAB({ 
  onClick, 
  icon, 
  label, 
  className,
  hapticType = 'press',
}: HapticFABProps) {
  const handleClick = () => {
    triggerHaptic(hapticType)
    onClick()
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={handleClick}
      className={cn(
        'fixed bottom-20 right-4 z-40',
        'flex items-center justify-center',
        'h-14 w-14 rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-lg shadow-primary/25',
        'touch-manipulation',
        className
      )}
      aria-label={label}
    >
      {icon}
    </motion.button>
  )
}

// Icon button with haptic feedback
interface HapticIconButtonProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
  className?: string
  hapticType?: HapticType
  size?: 'sm' | 'md' | 'lg'
}

export function HapticIconButton({ 
  onClick, 
  icon, 
  label,
  className,
  hapticType = 'tap',
  size = 'md',
}: HapticIconButtonProps) {
  const handleClick = () => {
    triggerHaptic(hapticType)
    onClick()
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={handleClick}
      className={cn(
        'flex items-center justify-center rounded-full',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'transition-colors touch-manipulation',
        sizeClasses[size],
        className
      )}
      aria-label={label}
    >
      {icon}
    </motion.button>
  )
}

// Toggle button with haptic feedback
interface HapticToggleProps {
  isOn: boolean
  onToggle: (value: boolean) => void
  label?: string
  className?: string
}

export function HapticToggle({ 
  isOn, 
  onToggle, 
  label,
  className,
}: HapticToggleProps) {
  const handleToggle = () => {
    triggerHaptic('toggle')
    onToggle(!isOn)
  }

  return (
    <motion.button
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      onClick={handleToggle}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors touch-manipulation',
        isOn ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
        className
      )}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
        animate={{ x: isOn ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  )
}

