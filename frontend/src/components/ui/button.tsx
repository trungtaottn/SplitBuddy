import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/hooks/useHaptic'

const buttonVariants = cva(
  // Base styles - Minimalist Retro
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] touch-manipulation font-body',
  {
    variants: {
      variant: {
        // Primary - Burnt Orange with warm shadow
        default: 'bg-primary text-primary-foreground hover:brightness-110 shadow-sm hover:shadow-md',
        // Destructive - Brick Red
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-110 shadow-sm hover:shadow-md',
        // Success - Sage Green
        success: 'bg-success text-success-foreground hover:brightness-110 shadow-sm hover:shadow-md',
        // Outline - Warm border
        outline: 'border-2 border-primary/30 bg-transparent text-foreground hover:bg-primary/10 hover:border-primary/50',
        // Secondary - Soft warm gray
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70 shadow-sm',
        // Ghost - Minimal
        ghost: 'hover:bg-accent/50 hover:text-accent-foreground',
        // Link - Underline style
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
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
