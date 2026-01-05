import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/hooks/useHaptic'

/**
 * Button - Vintage Typewriter Style
 * Features:
 * - Typewriter key press effect
 * - Stamp style for primary actions
 * - Dotted outline for secondary
 * - All uppercase with letter spacing
 */

const buttonVariants = cva(
  // Base styles - Typewriter aesthetic
  [
    'inline-flex items-center justify-center whitespace-nowrap',
    'text-sm font-semibold uppercase tracking-wider',
    'ring-offset-background transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50 disabled:grayscale',
    'touch-manipulation select-none',
  ],
  {
    variants: {
      variant: {
        // Default - Typewriter key style
        default: [
          'rounded-sm',
          'bg-gradient-to-b from-card to-secondary',
          'border-2 border-border',
          'text-foreground',
          'shadow-[inset_0_1px_0_hsl(40_35%_98%/0.5),0_3px_0_hsl(var(--muted-foreground)/0.3),0_4px_4px_hsl(var(--shadow-color)/0.1)]',
          'hover:from-background hover:to-card',
          'active:translate-y-[2px] active:shadow-[inset_0_1px_0_hsl(40_35%_98%/0.5),0_1px_0_hsl(var(--muted-foreground)/0.3)]',
        ],
        // Stamp - Ink stamp effect
        stamp: [
          'rounded-none',
          'bg-primary text-primary-foreground',
          'border-2 border-primary',
          'shadow-none',
          'transition-all duration-200 ease-out',
          'hover:rotate-[-2deg] hover:scale-[1.02] hover:shadow-[3px_3px_0_hsl(var(--foreground)/0.2)] hover:-translate-y-0.5',
          'active:rotate-0 active:scale-[0.98] active:shadow-none active:translate-y-0',
        ],
        // Destructive - Warning stamp
        destructive: [
          'rounded-none',
          'bg-destructive text-destructive-foreground',
          'border-2 border-destructive',
          'shadow-none',
          'hover:rotate-[-1deg] hover:scale-[1.02]',
          'active:rotate-0 active:scale-[0.98]',
        ],
        // Success - Approval stamp
        success: [
          'rounded-none',
          'bg-success text-success-foreground',
          'border-2 border-success',
          'shadow-none',
          'hover:rotate-[1deg] hover:scale-[1.02]',
          'active:rotate-0 active:scale-[0.98]',
        ],
        // Outline - Dotted form field style
        outline: [
          'rounded-sm',
          'bg-transparent',
          'border-2 border-dotted border-border',
          'text-foreground',
          'hover:border-solid hover:border-primary hover:bg-primary/10',
          'active:bg-primary/20',
        ],
        // Secondary - Subtle paper button
        secondary: [
          'rounded-sm',
          'bg-secondary text-secondary-foreground',
          'border border-border',
          'shadow-paper',
          'hover:bg-secondary/80 hover:shadow-lifted',
          'active:shadow-none active:translate-y-[1px]',
        ],
        // Ghost - Minimal, underline on hover
        ghost: [
          'rounded-sm',
          'bg-transparent text-foreground',
          'border-none',
          'hover:bg-accent/30',
          'active:bg-accent/50',
        ],
        // Link - Typewriter underline
        link: [
          'rounded-none',
          'bg-transparent text-primary',
          'border-none p-0 h-auto',
          'underline underline-offset-4 decoration-dotted',
          'hover:decoration-solid hover:text-primary/80',
          'normal-case tracking-normal',
        ],
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-3 py-1 text-xs',
        lg: 'h-12 px-8 py-3 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  haptic?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, haptic = true, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic) {
        triggerHaptic('click')
      }
      onClick?.(e)
    }
    
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        onClick={handleClick}
        {...props} 
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
