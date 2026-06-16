import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap',
    'rounded-full',
    'font-bold tracking-wider uppercase text-xs',
    'transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    'touch-manipulation select-none cursor-pointer',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(0,100%,60%)]',
          'text-white',
          'hover:brightness-110 hover:shadow-[0_0_25px_hsl(10,100%,50%,0.5)]',
          'border-0',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground',
          'hover:bg-secondary/80',
        ],
        destructive: [
          'bg-destructive text-destructive-foreground',
          'hover:bg-destructive/90',
        ],
        outline: [
          'bg-transparent border border-white/20 text-foreground',
          'hover:border-white hover:bg-white/5',
        ],
        ghost: [
          'bg-transparent text-foreground/70',
          'hover:text-foreground hover:bg-white/5',
        ],
        link: [
          'text-primary underline-offset-4 hover:underline p-0 h-auto',
        ],
        stamp: [
          'bg-gradient-to-r from-[hsl(20,100%,50%)] to-[hsl(0,100%,60%)]',
          'text-white shadow-lg',
          'hover:brightness-110',
        ],
      },
      size: {
        default: 'h-12 px-8',
        sm: 'h-9 px-4 text-[10px]',
        lg: 'h-14 px-10 text-sm',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
