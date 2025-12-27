import Decimal from 'decimal.js'

export function formatCurrency(amount: string | number): string {
  const value = new Decimal(amount)
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value.toNumber())
}

export function formatNumber(amount: string | number): string {
  const value = new Decimal(amount)
  return new Intl.NumberFormat('vi-VN').format(value.toNumber())
}
