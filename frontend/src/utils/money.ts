import Decimal from 'decimal.js'

const NO_DECIMAL_CURRENCIES = new Set(['VND', 'JPY', 'KRW', 'IDR'])

export type MoneyInput = string | number | Decimal | null | undefined

export interface SplitPreviewItem {
  id: string
  name: string
  amount: string
}

export function money(value: MoneyInput): Decimal {
  if (value instanceof Decimal) return value
  if (value === null || value === undefined || value === '') return new Decimal(0)
  return new Decimal(value)
}

export function currencyScale(currency: string): number {
  return NO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2
}

export function normalizeMoney(value: MoneyInput, currency = 'VND'): string {
  return money(value).toDecimalPlaces(currencyScale(currency)).toFixed(currencyScale(currency))
}

export function addMoney(a: MoneyInput, b: MoneyInput, currency = 'VND'): string {
  return normalizeMoney(money(a).plus(money(b)), currency)
}

export function subtractMoney(a: MoneyInput, b: MoneyInput, currency = 'VND'): string {
  return normalizeMoney(money(a).minus(money(b)), currency)
}

export function multiplyMoney(a: MoneyInput, b: MoneyInput, currency = 'VND'): string {
  return normalizeMoney(money(a).times(money(b)), currency)
}

export function divideMoney(a: MoneyInput, b: MoneyInput, currency = 'VND'): string {
  const divisor = money(b)
  if (divisor.isZero()) return normalizeMoney(0, currency)
  return normalizeMoney(money(a).div(divisor), currency)
}

export function isPositiveMoney(value: MoneyInput): boolean {
  return money(value).gt(0)
}

export function absMoney(value: MoneyInput, currency = 'VND'): string {
  return normalizeMoney(money(value).abs(), currency)
}

export function compareMoney(a: MoneyInput, b: MoneyInput): number {
  return money(a).cmp(money(b))
}

export function isWithinMoneyTolerance(a: MoneyInput, b: MoneyInput, currency = 'VND'): boolean {
  const tolerance = currencyScale(currency) === 0 ? new Decimal(1) : new Decimal('0.01')
  return money(a).minus(money(b)).abs().lt(tolerance)
}

export function toDisplayNumber(value: MoneyInput): number {
  return money(value).toNumber()
}

export function splitEqual(total: MoneyInput, participantIds: string[], currency = 'VND'): Record<string, string> {
  if (participantIds.length === 0) return {}
  const scale = currencyScale(currency)
  const scaleFactor = new Decimal(10).pow(scale)
  const minorTotal = money(total).times(scaleFactor).round()
  const base = minorTotal.div(participantIds.length).floor()
  let remainder = minorTotal.minus(base.times(participantIds.length)).toNumber()

  return Object.fromEntries(
    participantIds.map((id) => {
      const extra = remainder > 0 ? 1 : 0
      remainder -= extra
      return [id, base.plus(extra).div(scaleFactor).toFixed(scale)]
    })
  )
}

export function sumMoney(values: MoneyInput[], currency = 'VND'): string {
  const total = values.reduce<Decimal>((sum, value) => sum.plus(money(value)), new Decimal(0))
  return normalizeMoney(total, currency)
}

export function normalizeMoneyInput(rawValue: string, zeroDecimal: boolean): string {
  if (zeroDecimal) return rawValue.replace(/[^\d]/g, '')
  const normalized = rawValue.replace(/,/g, '.')
  const cleaned = normalized.replace(/[^0-9.]/g, '')
  const parts = cleaned.split('.')
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned
}
