import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { formatCurrency } from '@/utils/formatCurrency'
import type { MonthlySpending } from '@/types/api'

function monthLabel(year: number, month: number) {
  return `${month.toString().padStart(2, '0')}/${year}`
}

export function SpendingChart({ data }: { data: MonthlySpending[] }) {
  const chartData = (data || []).map((m) => ({
    name: monthLabel(m.year, m.month),
    total: Number(m.total_amount),
    sessions: m.session_count,
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

