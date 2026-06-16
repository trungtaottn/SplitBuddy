import { describe, expect, it } from 'vitest'
import { validationRules } from './useFormValidation'

describe('validationRules numeric validators', () => {
  it('reject partial numeric strings', () => {
    expect(validationRules.positiveNumber.validate('12abc')).toBe(false)
    expect(validationRules.minValue(10).validate('10px')).toBe(false)
    expect(validationRules.maxValue(20).validate('19.5vnd')).toBe(false)
  })

  it('accept finite trimmed numeric strings', () => {
    expect(validationRules.positiveNumber.validate(' 12.50 ')).toBe(true)
    expect(validationRules.minValue(10).validate('10')).toBe(true)
    expect(validationRules.maxValue(20).validate('19.5')).toBe(true)
  })

  it('reject blank and non-finite values', () => {
    expect(validationRules.positiveNumber.validate('')).toBe(false)
    expect(validationRules.positiveNumber.validate('   ')).toBe(false)
    expect(validationRules.positiveNumber.validate(Number.POSITIVE_INFINITY)).toBe(false)
    expect(validationRules.positiveNumber.validate(Number.NaN)).toBe(false)
  })
})
