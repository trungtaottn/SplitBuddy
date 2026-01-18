import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/hooks/useHaptic'

/**
 * Button - Dark Luxury / Portfolio Style
 * Features:
 * - Pill shape (rounded-full)
 * - Bold, Uppercase, Tracking-wide typography
 * - Orange/Red Gradient for primary
 */

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center whitespace-nowrap',
    'rounded-full', // Pill shape
    'font-bold tracking-wider uppercase text-xs', // Editorial Typography
    'transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    'touch-manipulation select-none cursor-pointer',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        // Luxury Primary: Gradient Orange->Red
        default: [
          'bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(0,100%,60%)]',
          'text-white',
          'hover:brightness-110 hover:shadow-[0_0_25px_hsl(10,100%,50%,0.5)]',
          'border-0',
        ],
        // Secondary: Dark Gray
        secondary: [
          'bg-secondary text-secondary-foreground',
          'hover:bg-secondary/80',
        ],
        // Destructive
        destructive: [
          'bg-destructive text-destructive-foreground',
          'hover:bg-destructive/90',
        ],
        // Outline: Minimal White Border
        outline: [
          'bg-transparent border border-white/20 text-foreground',
          'hover:border-white hover:bg-white/5',
        ],
        // Ghost: Text only
        ghost: [
          'bg-transparent text-foreground/70',
          'hover:text-foreground hover:bg-white/5',
        ],
        // Link
        link: [
          'text-primary underline-offset-4 hover:underline p-0 h-auto',
        ],
        // Stamp mapping to Luxury Primary
        stamp: [
          'bg-gradient-to-r from-[hsl(20,100%,50%)] to-[hsl(0,100%,60%)]',
          'text-white shadow-lg',
          'hover:brightness-110',
        ],
      },
      size: {
        default: 'h-12 px-8', // Taller and wider for luxury feel
        sm: 'h-9 px-4 text-[10px]',
        lg: 'h-14 px-10 text-sm',
        icon: 'h-11 w-11', // Optimized for touch target (44px)
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
