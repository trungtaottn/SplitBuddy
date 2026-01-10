import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/formatCurrency'
import { SpendingChart } from '@/components/analytics/SpendingChart'
import { CategoryBreakdown } from '@/components/analytics/CategoryBreakdown'
import { MonthlyTrendsChart, YearlyTrendsChart } from '@/components/analytics/TrendsChart'
import type { ApiResponse, SpendingAnalyticsResponse, SpendingTrendsResponse, CategorySpending } from '@/types/api'

type Tab = 'overview' | 'categories' | 'trends'

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [from, setFrom] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return isoDate(d)
  })
  const [to, setTo] = useState<string>(() => isoDate(new Date()))

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return params.toString()
  }, [from, to])

  const { data: spending, isLoading: spendingLoading } = useQuery({
    queryKey: ['analytics', 'spending', from, to],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SpendingAnalyticsResponse>>(`/analytics/spending?${queryString}`)
      return res.data.data
    },
  })

  const { data: categoryBreakdown } = useQuery({
    queryKey: ['analytics', 'categories', from, to],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CategorySpending[]>>(`/analytics/categories?${queryString}`)
      return res.data.data
    },
  })

  const { data: trends } = useQuery({
    queryKey: ['analytics', 'trends', from, to],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SpendingTrendsResponse>>(`/analytics/trends?${queryString}`)
      return res.data.data
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Tổng quan chi tiêu và xu hướng</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <Label>Từ ngày</Label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label>Đến ngày</Label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button variant={tab === 'overview' ? 'default' : 'outline'} onClick={() => setTab('overview')}>
              Overview
            </Button>
            <Button variant={tab === 'categories' ? 'default' : 'outline'} onClick={() => setTab('categories')}>
              Categories
            </Button>
            <Button variant={tab === 'trends' ? 'default' : 'outline'} onClick={() => setTab('trends')}>
              Trends
            </Button>
          </div>
        </CardContent>
      </Card>

      {spendingLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Đang tải...</CardContent>
        </Card>
      ) : !spending ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Không có dữ liệu. Vui lòng thử lại.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Tổng đã trả</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(spending.total_spent)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Tổng được nhận</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(spending.total_received)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Cân bằng</p>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    Number(spending.net_balance) >= 0 ? 'text-success' : 'text-destructive',
                  )}
                >
                  {formatCurrency(spending.net_balance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {tab === 'overview' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Xu hướng theo tháng</CardTitle>
                </CardHeader>
                <CardContent>
                  <SpendingChart data={trends?.monthly || []} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Top categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <CategoryBreakdown data={spending.category_breakdown || []} />
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'categories' && (
            <Card>
              <CardHeader>
                <CardTitle>Phân bổ theo danh mục</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryBreakdown data={categoryBreakdown || spending.category_breakdown || []} />
              </CardContent>
            </Card>
          )}

          {tab === 'trends' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonthlyTrendsChart data={trends?.monthly || []} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Yearly</CardTitle>
                </CardHeader>
                <CardContent>
                  <YearlyTrendsChart data={trends?.yearly || []} />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

