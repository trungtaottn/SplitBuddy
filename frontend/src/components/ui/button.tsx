import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/hooks/useHaptic'
import { buttonVariants } from './button-variants'

/**
 * Button - Dark Luxury / Portfolio Style
 * Features:
 * - Pill shape (rounded-full)
 * - Bold, Uppercase, Tracking-wide typography
 * - Orange/Red Gradient for primary
 */

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

export { Button }
