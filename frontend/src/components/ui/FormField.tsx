import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface FormFieldProps {
  /** Field label */
  label: string
  /** Field name/id */
  name: string
  /** Error message to display */
  error?: string | null
  /** Whether field has been touched */
  touched?: boolean
  /** Show valid state indicator */
  showValid?: boolean
  /** Helper text below the field */
  helperText?: string
  /** Whether field is required */
  required?: boolean
  /** Additional class name */
  className?: string
  /** Children (input or custom content) */
  children?: React.ReactNode
}

/**
 * FormField - Wrapper component for form inputs with labels and error states
 * 
 * Features:
 * - Label with required indicator
 * - Inline error messages with icon
 * - Valid state indicator
 * - Helper text
 * - Accessible (aria-describedby)
 */
export function FormField({
  label,
  name,
  error,
  touched = false,
  showValid = false,
  helperText,
  required = false,
  className,
  children,
}: FormFieldProps) {
  const hasError = touched && error
  const isValid = touched && !error && showValid

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <Label htmlFor={name} className="flex items-center gap-1">
        <span className="font-medium">{label}</span>
        {required && <span className="text-destructive">*</span>}
      </Label>

      {/* Input wrapper */}
      <div className="relative">
        {children}

        {/* Status icon */}
        {(hasError || isValid) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {hasError && (
              <AlertCircle className="h-4 w-4 text-destructive animate-in fade-in zoom-in" />
            )}
            {isValid && (
              <CheckCircle2 className="h-4 w-4 text-success animate-in fade-in zoom-in" />
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <p
          id={`${name}-error`}
          className="text-sm text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 fade-in"
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Helper text (only show when no error) */}
      {helperText && !hasError && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label */
  label: string
  /** Error message */
  error?: string | null
  /** Whether field has been touched */
  touched?: boolean
  /** Show valid state */
  showValid?: boolean
  /** Helper text */
  helperText?: string
}

/**
 * FormInput - Complete input field with label and validation states
 */
export function FormInput({
  label,
  name,
  error,
  touched = false,
  showValid = false,
  helperText,
  required = false,
  className,
  ...inputProps
}: FormInputProps) {
  const hasError = touched && error
  const isValid = touched && !error && showValid

  return (
    <FormField
      label={label}
      name={name || ''}
      error={error}
      touched={touched}
      showValid={showValid}
      helperText={helperText}
      required={required}
      className={className}
    >
      <Input
        id={name}
        name={name}
        required={required}
        aria-invalid={!!hasError}
        aria-describedby={hasError ? `${name}-error` : undefined}
        className={cn(
          'pr-10 transition-all',
          hasError && 'border-destructive focus-visible:ring-destructive/30',
          isValid && 'border-success focus-visible:ring-success/30'
        )}
        {...inputProps}
      />
    </FormField>
  )
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Field label */
  label: string
  /** Error message */
  error?: string | null
  /** Whether field has been touched */
  touched?: boolean
  /** Show valid state */
  showValid?: boolean
  /** Helper text */
  helperText?: string
}

/**
 * FormTextarea - Textarea field with label and validation states
 */
export function FormTextarea({
  label,
  name,
  error,
  touched = false,
  showValid = false,
  helperText,
  required = false,
  className,
  ...textareaProps
}: FormTextareaProps) {
  const hasError = touched && error
  const isValid = touched && !error && showValid

  return (
    <FormField
      label={label}
      name={name || ''}
      error={error}
      touched={touched}
      showValid={showValid}
      helperText={helperText}
      required={required}
      className={className}
    >
      <textarea
        id={name}
        name={name}
        required={required}
        aria-invalid={!!hasError}
        aria-describedby={hasError ? `${name}-error` : undefined}
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border-2 border-border/60 bg-background px-4 py-3',
          'text-sm font-body text-foreground placeholder:text-muted-foreground/60',
          'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          'hover:border-border transition-all duration-200',
          hasError && 'border-destructive focus-visible:ring-destructive/30',
          isValid && 'border-success focus-visible:ring-success/30',
          className
        )}
        {...textareaProps}
      />
    </FormField>
  )
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Field label */
  label: string
  /** Error message */
  error?: string | null
  /** Whether field has been touched */
  touched?: boolean
  /** Show valid state */
  showValid?: boolean
  /** Helper text */
  helperText?: string
  /** Select options */
  children: React.ReactNode
}

/**
 * FormSelect - Select field with label and validation states
 */
export function FormSelect({
  label,
  name,
  error,
  touched = false,
  showValid = false,
  helperText,
  required = false,
  className,
  children,
  ...selectProps
}: FormSelectProps) {
  const hasError = touched && error
  const isValid = touched && !error && showValid

  return (
    <FormField
      label={label}
      name={name || ''}
      error={error}
      touched={touched}
      showValid={showValid}
      helperText={helperText}
      required={required}
      className={className}
    >
      <select
        id={name}
        name={name}
        required={required}
        aria-invalid={!!hasError}
        aria-describedby={hasError ? `${name}-error` : undefined}
        className={cn(
          'flex h-11 w-full rounded-lg border-2 border-border/60 bg-background px-4 py-2',
          'text-sm font-body text-foreground',
          'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          'hover:border-border transition-all duration-200',
          hasError && 'border-destructive focus-visible:ring-destructive/30',
          isValid && 'border-success focus-visible:ring-success/30',
          className
        )}
        {...selectProps}
      >
        {children}
      </select>
    </FormField>
  )
}

export { FormField as default }

