import { useState, useCallback, useMemo } from 'react'

type ValidationRule<T> = {
  validate: (value: T) => boolean
  message: string
}

type FieldConfig<T> = {
  required?: boolean
  requiredMessage?: string
  rules?: ValidationRule<T>[]
}

type FieldState = {
  touched: boolean
  dirty: boolean
  error: string | null
  isValid: boolean
}

type FormConfig<T extends Record<string, unknown>> = {
  [K in keyof T]: FieldConfig<T[K]>
}

type FormState<T extends Record<string, unknown>> = {
  [K in keyof T]: FieldState
}

type UseFormValidationReturn<T extends Record<string, unknown>> = {
  values: T
  errors: { [K in keyof T]: string | null }
  touched: { [K in keyof T]: boolean }
  isValid: boolean
  isDirty: boolean
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void
  setFieldTouched: <K extends keyof T>(field: K) => void
  validateField: <K extends keyof T>(field: K) => boolean
  validateForm: () => boolean
  reset: () => void
  getFieldProps: <K extends keyof T>(field: K) => {
    value: T[K]
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
    onBlur: () => void
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }
}

/**
 * Custom hook for form validation with inline errors
 * Supports:
 * - Required fields
 * - Custom validation rules
 * - Touched/dirty state tracking
 * - Debounced validation
 * - ARIA accessibility
 */
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  config: Partial<FormConfig<T>> = {}
): UseFormValidationReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [fieldStates, setFieldStates] = useState<FormState<T>>(() => {
    const initial: Partial<FormState<T>> = {}
    for (const key of Object.keys(initialValues) as (keyof T)[]) {
      initial[key] = {
        touched: false,
        dirty: false,
        error: null,
        isValid: true,
      }
    }
    return initial as FormState<T>
  })

  const validateFieldValue = useCallback(<K extends keyof T>(
    field: K,
    value: T[K]
  ): string | null => {
    const fieldConfig = config[field]
    if (!fieldConfig) return null

    // Check required
    if (fieldConfig.required) {
      const isEmpty = value === '' || value === null || value === undefined ||
        (Array.isArray(value) && value.length === 0)
      if (isEmpty) {
        return fieldConfig.requiredMessage || 'Trường này bắt buộc'
      }
    }

    // Check custom rules
    if (fieldConfig.rules) {
      for (const rule of fieldConfig.rules) {
        if (!rule.validate(value)) {
          return rule.message
        }
      }
    }

    return null
  }, [config])

  const setFieldValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setFieldStates(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        dirty: true,
      }
    }))
  }, [])

  const setFieldTouched = useCallback(<K extends keyof T>(field: K) => {
    setFieldStates(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        touched: true,
      }
    }))
    // Validate on blur
    const error = validateFieldValue(field, values[field])
    setFieldStates(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        error,
        isValid: error === null,
      }
    }))
  }, [validateFieldValue, values])

  const validateField = useCallback(<K extends keyof T>(field: K): boolean => {
    const error = validateFieldValue(field, values[field])
    setFieldStates(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        touched: true,
        error,
        isValid: error === null,
      }
    }))
    return error === null
  }, [validateFieldValue, values])

  const validateForm = useCallback((): boolean => {
    let isValid = true
    const newStates = { ...fieldStates }

    for (const field of Object.keys(values) as (keyof T)[]) {
      const error = validateFieldValue(field, values[field])
      newStates[field] = {
        ...newStates[field],
        touched: true,
        error,
        isValid: error === null,
      }
      if (error) isValid = false
    }

    setFieldStates(newStates)
    return isValid
  }, [fieldStates, validateFieldValue, values])

  const reset = useCallback(() => {
    setValues(initialValues)
    const resetStates: Partial<FormState<T>> = {}
    for (const key of Object.keys(initialValues) as (keyof T)[]) {
      resetStates[key] = {
        touched: false,
        dirty: false,
        error: null,
        isValid: true,
      }
    }
    setFieldStates(resetStates as FormState<T>)
  }, [initialValues])

  const getFieldProps = useCallback(<K extends keyof T>(field: K) => {
    const state = fieldStates[field]
    return {
      value: values[field],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const newValue = e.target.type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : e.target.value
        setFieldValue(field, newValue as T[K])
      },
      onBlur: () => setFieldTouched(field),
      'aria-invalid': state.touched && !state.isValid,
      'aria-describedby': state.error ? `${String(field)}-error` : undefined,
    }
  }, [fieldStates, values, setFieldValue, setFieldTouched])

  // Derived state
  const errors = useMemo(() => {
    const result: { [K in keyof T]: string | null } = {} as { [K in keyof T]: string | null }
    for (const key of Object.keys(fieldStates) as (keyof T)[]) {
      result[key] = fieldStates[key].error
    }
    return result
  }, [fieldStates])

  const touched = useMemo(() => {
    const result: { [K in keyof T]: boolean } = {} as { [K in keyof T]: boolean }
    for (const key of Object.keys(fieldStates) as (keyof T)[]) {
      result[key] = fieldStates[key].touched
    }
    return result
  }, [fieldStates])

  const isValid = useMemo(() => {
    return Object.values(fieldStates).every(state => (state as FieldState).isValid)
  }, [fieldStates])

  const isDirty = useMemo(() => {
    return Object.values(fieldStates).some(state => (state as FieldState).dirty)
  }, [fieldStates])

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setFieldValue,
    setFieldTouched,
    validateField,
    validateForm,
    reset,
    getFieldProps,
  }
}

// Common validation rules
const toFiniteNumber = (value: string | number): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const normalized = value.trim()
  if (normalized === '') return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export const validationRules = {
  email: {
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Email không hợp lệ',
  },
  minLength: (min: number) => ({
    validate: (value: string) => value.length >= min,
    message: `Tối thiểu ${min} ký tự`,
  }),
  maxLength: (max: number) => ({
    validate: (value: string) => value.length <= max,
    message: `Tối đa ${max} ký tự`,
  }),
  positiveNumber: {
    validate: (value: string | number) => {
      const num = toFiniteNumber(value)
      return num !== null && num > 0
    },
    message: 'Phải là số dương',
  },
  minValue: (min: number) => ({
    validate: (value: string | number) => {
      const num = toFiniteNumber(value)
      return num !== null && num >= min
    },
    message: `Giá trị tối thiểu là ${min}`,
  }),
  maxValue: (max: number) => ({
    validate: (value: string | number) => {
      const num = toFiniteNumber(value)
      return num !== null && num <= max
    },
    message: `Giá trị tối đa là ${max}`,
  }),
  pattern: (regex: RegExp, message: string) => ({
    validate: (value: string) => regex.test(value),
    message,
  }),
}
