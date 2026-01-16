import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
  variant?: 'default' | 'underline' | 'glass'
}

/**
 * Input - Dark Luxury Style
 * Features:
 * - Minimalist Underline
 * - Clean Typography
 * - Orange focus state
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, hasError, variant = 'default', ...props }, ref) => {
    const variants = {
      // Default: Minimalist Underline
      default: [
        'flex h-14 w-full',
        'bg-transparent',
        'border-0 border-b border-white/20',
        'hover:border-white/40', // Hover state
        'rounded-none',
        'px-0 py-4',
        'text-lg text-foreground font-body',
        'placeholder:text-muted-foreground/40 placeholder:text-base',
        'focus-visible:outline-none focus-visible:border-primary focus-visible:bg-white/5', // Focus bg
        'transition-all duration-300',
        'disabled:cursor-not-allowed disabled:opacity-50',
      ],
      // Same as default
      underline: [
        'flex h-14 w-full',
        'bg-transparent',
        'border-0 border-b border-white/20',
        'rounded-none',
        'px-0 py-4',
        'text-lg text-foreground font-body',
        'placeholder:text-muted-foreground/40',
        'focus-visible:outline-none focus-visible:border-primary',
        'transition-colors duration-300',
      ],
      // Glass: Soft box
      glass: [
        'flex h-12 w-full rounded-md',
        'bg-white/5 border border-white/10',
        'px-4 py-3',
        'text-base text-foreground font-body',
        'placeholder:text-muted-foreground/50',
        'focus-visible:outline-none focus-visible:border-primary/50 focus-visible:bg-white/10',
        'transition-all duration-300',
      ]
    }

    return (
      <input
        type={type}
        className={cn(
          variants[variant === 'glass' ? 'glass' : 'default'],
          hasError && 'border-destructive focus-visible:border-destructive animate-shake',
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
