import Decimal from 'decimal.js'

const NO_DECIMAL_CURRENCIES = new Set(['VND', 'JPY', 'KRW', 'IDR'])

export function formatCurrency(amount: string | number, currency = 'VND'): string {
  const value = new Decimal(amount)
  const normalized = currency.toUpperCase()
  const maximumFractionDigits = NO_DECIMAL_CURRENCIES.has(normalized) ? 0 : 2

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: normalized,
    maximumFractionDigits,
  }).format(value.toNumber())
}

export function formatNumber(amount: string | number): string {
  const value = new Decimal(amount)
  return new Intl.NumberFormat('vi-VN').format(value.toNumber())
}
