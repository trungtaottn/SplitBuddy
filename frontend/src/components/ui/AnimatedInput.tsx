import { useState, useId, forwardRef, InputHTMLAttributes } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { triggerHaptic } from '@/hooks/useHaptic'

interface AnimatedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  error?: string
  success?: boolean
  helperText?: string
  showPasswordToggle?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ 
    label, 
    error, 
    success,
    helperText,
    showPasswordToggle,
    size = 'md',
    className,
    type,
    ...props 
  }, ref) => {
    const id = useId()
    const [isFocused, setIsFocused] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const hasValue = props.value !== undefined && props.value !== ''
    const isFloating = isFocused || hasValue

    const inputType = showPasswordToggle 
      ? (showPassword ? 'text' : 'password')
      : type

    const sizeClasses = {
      sm: 'h-10 text-sm',
      md: 'h-12 text-base',
      lg: 'h-14 text-lg',
    }

    const labelSizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    }

    return (
      <div className={cn('relative', className)}>
        <motion.div
          className={cn(
            'relative rounded-lg border-2 transition-colors',
            error
              ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
              : success
              ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
              : isFocused
              ? 'border-primary bg-white dark:bg-gray-900'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
          )}
          animate={error ? { x: [0, -4, 4, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          onAnimationStart={() => error && triggerHaptic('error')}
        >
          {/* Floating Label */}
          <motion.label
            htmlFor={id}
            className={cn(
              'absolute left-3 pointer-events-none transition-colors',
              labelSizeClasses[size],
              error
                ? 'text-red-500'
                : success
                ? 'text-green-600'
                : isFocused
                ? 'text-primary'
                : 'text-gray-500 dark:text-gray-400'
            )}
            animate={{
              top: isFloating ? 4 : '50%',
              y: isFloating ? 0 : '-50%',
              scale: isFloating ? 0.85 : 1,
              originX: 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {label}
          </motion.label>

          {/* Input */}
          <input
            ref={ref}
            id={id}
            type={inputType}
            className={cn(
              'w-full bg-transparent px-3 pt-5 pb-1 outline-none',
              sizeClasses[size],
              showPasswordToggle && 'pr-10'
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />

          {/* Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Password toggle */}
            {showPasswordToggle && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap')
                  setShowPassword(!showPassword)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            )}

            {/* Status icons */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </motion.div>
              )}
              {success && !error && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Helper text / Error message */}
        <AnimatePresence>
          {(error || helperText) && (
            <motion.p
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className={cn(
                'text-xs mt-1 px-1',
                error ? 'text-red-500' : 'text-gray-500'
              )}
            >
              {error || helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

AnimatedInput.displayName = 'AnimatedInput'

// Amount input with currency formatting
interface AmountInputProps extends Omit<AnimatedInputProps, 'type' | 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  currency?: string
}

export function AmountInput({ 
  value, 
  onChange, 
  currency = 'VND',
  ...props 
}: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState(value)

  const formatNumber = (num: string) => {
    // Remove non-numeric characters
    const cleaned = num.replace(/[^\d]/g, '')
    // Add thousand separators
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '')
    const formatted = formatNumber(raw)
    setDisplayValue(formatted)
    onChange(raw) // Return raw number
  }

  return (
    <div className="relative">
      <AnimatedInput
        {...props}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange as unknown as React.ChangeEventHandler<HTMLInputElement>}
      />
      <span className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
        {currency}
      </span>
    </div>
  )
}

// Increment/Decrement number input
interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label: string
  className?: string
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  label,
  className,
}: NumberStepperProps) {
  const decrement = () => {
    if (value - step >= min) {
      triggerHaptic('tap')
      onChange(value - step)
    }
  }

  const increment = () => {
    if (value + step <= max) {
      triggerHaptic('tap')
      onChange(value + step)
    }
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={decrement}
          disabled={value <= min}
          className={cn(
            'h-8 w-8 rounded-md flex items-center justify-center font-bold text-lg',
            value <= min
              ? 'text-gray-300 dark:text-gray-600'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm'
          )}
        >
          −
        </motion.button>
        <motion.span
          key={value}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-12 text-center font-bold text-lg"
        >
          {value}
        </motion.span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={increment}
          disabled={value >= max}
          className={cn(
            'h-8 w-8 rounded-md flex items-center justify-center font-bold text-lg',
            value >= max
              ? 'text-gray-300 dark:text-gray-600'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm'
          )}
        >
          +
        </motion.button>
      </div>
    </div>
  )
}

