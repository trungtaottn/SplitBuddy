import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { formatCurrency } from '@/utils/formatCurrency'
import type { CategorySpending } from '@/types/api'

const COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#10b981',
]

export function CategoryBreakdown({ data }: { data: CategorySpending[] }) {
  const chartData = (data || []).map((c) => ({
    name: c.category_name || 'Khác',
    value: Number(c.total_amount),
    bills: c.bill_count,
  }))

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={110} label>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: unknown) => {
              if (typeof value === 'number') return formatCurrency(value)
              return String(value)
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

