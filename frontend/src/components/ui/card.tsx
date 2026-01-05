import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Card - Vintage Paper Style
 * Features:
 * - Paper stack shadow effect
 * - Corner fold decoration
 * - Aged paper aesthetic
 * - JetBrains Mono typewriter typography
 */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'paper' | 'note' | 'receipt' | 'document'
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: [
        'rounded-sm bg-card text-card-foreground',
        'border border-border',
        'shadow-paper hover:shadow-lifted transition-all duration-200',
      ],
      paper: [
        'card-paper',
      ],
      note: [
        'card-note',
      ],
      receipt: [
        'card-receipt',
      ],
      document: [
        'card-document',
      ],
    }

    return (
      <div
        ref={ref}
        className={cn(
          variants[variant],
          'relative',
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
        'flex flex-col space-y-1.5 p-5 sm:p-6',
        'border-b-2 border-dotted border-border/50',
        className
      )} 
      {...props} 
    />
  )
)
CardHeader.displayName = 'CardHeader'

/**
 * CardTitle - Typewriter heading style
 */
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 
      ref={ref} 
      className={cn(
        'text-lg sm:text-xl font-semibold leading-tight',
        'tracking-tight uppercase',
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
        'text-sm text-muted-foreground',
        'italic',
        className
      )} 
      {...props} 
    />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 sm:p-6 pt-4', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        'flex items-center p-5 sm:p-6 pt-0',
        'border-t border-dashed border-border/30 mt-4',
        className
      )} 
      {...props} 
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
