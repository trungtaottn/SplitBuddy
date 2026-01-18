import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts'
import { formatCurrency } from '@/utils/formatCurrency'
import type { MonthlySpending, YearlySpending } from '@/types/api'

function monthLabel(year: number, month: number) {
  return `${month.toString().padStart(2, '0')}/${year}`
}

export function MonthlyTrendsChart({ data }: { data: MonthlySpending[] }) {
  const chartData = (data || []).map((m) => ({
    name: monthLabel(m.year, m.month),
    total: Number(m.total_amount),
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => (typeof v === 'number' ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip
            formatter={(value: unknown) => {
              if (typeof value === 'number') return formatCurrency(value)
              return String(value)
            }}
          />
          <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function YearlyTrendsChart({ data }: { data: YearlySpending[] }) {
  const chartData = (data || []).map((y) => ({
    name: String(y.year),
    total: Number(y.total_amount),
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => (typeof v === 'number' ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip
            formatter={(value: unknown) => {
              if (typeof value === 'number') return formatCurrency(value)
              return String(value)
            }}
          />
          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

