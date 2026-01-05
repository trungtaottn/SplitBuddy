import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input - Vintage Typewriter Style
 * Features:
 * - Underline style (no box border)
 * - Paper background
 * - Clear focus states
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles - Underline style
          'flex h-10 w-full rounded-none border-0 border-b-2 border-border/60',
          'bg-transparent px-1 py-2',
          'text-sm text-foreground',
          // Placeholder - italic typewriter
          'placeholder:text-muted-foreground/50 placeholder:italic',
          // Focus state
          'focus-visible:outline-none focus-visible:border-primary',
          // Transitions
          'transition-colors duration-200',
          // File input
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          // Disabled
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Hover
          'hover:border-foreground/40',
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
