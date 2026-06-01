import { describe, expect, it } from 'vitest'
import {
  addMoney,
  divideMoney,
  isWithinMoneyTolerance,
  multiplyMoney,
  splitEqual,
  sumMoney,
} from './money'

describe('money helpers', () => {
  it('adds decimal strings without float drift', () => {
    expect(addMoney('0.10', '0.20', 'USD')).toBe('0.30')
  })

  it('splits equal VND amounts by minor-unit remainder', () => {
    expect(splitEqual('100000', ['a', 'b', 'c'], 'VND')).toEqual({
      a: '33334',
      b: '33333',
      c: '33333',
    })
  })

  it('splits equal decimal currencies to exact display scale', () => {
    expect(splitEqual('0.10', ['a', 'b', 'c'], 'USD')).toEqual({
      a: '0.04',
      b: '0.03',
      c: '0.03',
    })
  })

  it('supports weighted split composition', () => {
    const totalWeight = '4'
    expect(multiplyMoney('100', divideMoney('1', totalWeight, 'USD'), 'USD')).toBe('25.00')
    expect(multiplyMoney('100', divideMoney('2', totalWeight, 'USD'), 'USD')).toBe('50.00')
  })

  it('sums custom splits and applies currency tolerance', () => {
    const total = sumMoney(['33.33', '33.33', '33.34'], 'USD')
    expect(total).toBe('100.00')
    expect(isWithinMoneyTolerance(total, '100', 'USD')).toBe(true)
  })
})
