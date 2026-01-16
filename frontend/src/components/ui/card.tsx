import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Card - Dark Luxury Style
 * Features:
 * - Geometric/Modular layout
 * - Dark background (#141414)
 * - Very subtle borders
 */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'outline' | 'interactive'
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      // Default - Modular Grid Card
      default: [
        'bg-card text-card-foreground',
        'border border-white/10',
        'shadow-xl shadow-black/20',
        'relative overflow-hidden',
        // Top highlight for 3D feel
        'before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
      ],
      // Glass - Subtly transparent for overlays
      glass: [
        'bg-card/80 backdrop-blur-md',
        'border border-white/10',
      ],
      // Outline - No background
      outline: [
        'bg-transparent text-foreground',
        'border border-white/10',
      ],
      // Interactive - Highlight on Hover
      interactive: [
        'bg-card border border-white/5 transition-all duration-300',
        'hover:border-primary/50 hover:bg-card/80',
        'cursor-pointer',
      ],
      // Legacy Mappings
      neon: ['bg-card border border-white/5'],
      yellow: ['bg-card border-l-2 border-l-yellow-500'],
      red: ['bg-card border-l-2 border-l-red-500'],
      black: ['bg-black border border-white/20'],
      paper: ['bg-card border border-white/5'],
      note: ['bg-card border border-white/5'],
      receipt: ['bg-card border border-white/5'],
      document: ['bg-card border border-white/5'],
      elevated: ['bg-card border border-white/5 shadow-xl'],
      gradient: ['bg-gradient-to-br from-card to-background border border-white/5'],
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[4px]', // Nearly sharp corners for modular look
          variants[variant as keyof typeof variants] || variants.default,
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        'flex flex-col space-y-2 p-6',
        className
      )} 
      {...props} 
    />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 
      ref={ref} 
      className={cn(
        'text-3xl font-bold font-heading leading-tight tracking-tight text-white',
        className
      )} 
      {...props} 
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p 
      ref={ref} 
      className={cn(
        'text-sm text-muted-foreground font-body leading-relaxed',
        className
      )} 
      {...props} 
    />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        'flex items-center p-6 pt-0',
        className
      )} 
      {...props} 
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
