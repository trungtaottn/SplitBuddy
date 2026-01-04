import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input - Minimalist Retro Style
 * Features:
 * - Warm border colors
 * - Soft rounded corners
 * - Clear focus states with accent color
 * - Smooth transitions
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          'flex h-11 w-full rounded-lg border-2 border-border/60 bg-background px-4 py-2',
          'text-sm font-body text-foreground',
          // Placeholder
          'placeholder:text-muted-foreground/60',
          // Focus state - warm accent
          'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          // Transitions
          'transition-all duration-200',
          // File input
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          // Disabled
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          // Hover
          'hover:border-border',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
