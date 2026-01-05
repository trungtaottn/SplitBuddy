import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
}

/**
 * Input - Vintage Typewriter Style
 * Features:
 * - Underline style (no box border)
 * - Paper background
 * - Clear focus states with underline draw animation
 * - Label float animation
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, hasError, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)

    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            // Base styles - Underline style
            'flex h-10 w-full rounded-none border-0 border-b-2 border-border/60',
            'bg-transparent px-1 py-2',
            'text-sm text-foreground',
            // Placeholder - italic typewriter
            'placeholder:text-muted-foreground/50 placeholder:italic',
            // Focus state with underline draw
            'focus-visible:outline-none focus-visible:border-primary',
            'relative',
            // Transitions
            'transition-all duration-300',
            // File input
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            // Disabled
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Hover
            'hover:border-foreground/40',
            // Error state
            hasError && 'animate-input-shake border-destructive',
            className
          )}
          ref={ref}
          onFocus={(e) => {
            setIsFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            props.onBlur?.(e)
          }}
          {...props}
        />
        {/* Animated underline on focus */}
        {isFocused && (
          <div 
            className="absolute bottom-0 left-0 h-0.5 bg-primary animate-underline-draw"
            style={{
              animation: 'underlineDraw 0.4s ease-out forwards',
            }}
          />
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
