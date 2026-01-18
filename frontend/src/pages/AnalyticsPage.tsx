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
import { Filter, Calendar, PieChart, TrendingUp, ArrowUpRight, ArrowDownLeft, Wallet, Loader2 } from 'lucide-react'

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
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight flex items-center gap-3">
            Analytics
          </h1>
          <p className="text-zinc-400 font-medium mt-1 ml-1">Tổng quan chi tiêu và xu hướng tài chính</p>
        </div>
        
        {/* Tab Selection Pill */}
        <div className="bg-zinc-900 border border-white/5 p-1 rounded-full flex gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setTab('overview')}
            className={cn(
              "rounded-full px-4 text-xs font-bold transition-all",
              tab === 'overview' 
                ? "bg-white text-zinc-900 shadow-md transform scale-105" 
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
          >
            Tổng quan
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setTab('categories')}
            className={cn(
              "rounded-full px-4 text-xs font-bold transition-all",
              tab === 'categories' 
                ? "bg-white text-zinc-900 shadow-md transform scale-105" 
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
          >
            Danh mục
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setTab('trends')}
            className={cn(
              "rounded-full px-4 text-xs font-bold transition-all",
              tab === 'trends' 
                ? "bg-white text-zinc-900 shadow-md transform scale-105" 
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
          >
            Xu hướng
          </Button>
        </div>
      </div>

      <Card className="bg-zinc-900 border-white/5 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-white font-heading text-lg">
            <Filter className="h-4 w-4 text-indigo-400" />
            Bộ lọc thời gian
          </CardTitle>
        </CardHeader>
        <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Từ ngày</Label>
              <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-800/50 border border-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Đến ngày</Label>
              <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-800/50 border border-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer font-mono"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {spendingLoading ? (
        <Card className="bg-zinc-900 border-white/5 h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">Đang tải dữ liệu...</p>
          </div>
        </Card>
      ) : !spending ? (
         <Card className="bg-zinc-900 border-white/5 h-64 flex items-center justify-center">
          <p className="text-zinc-500">Không có dữ liệu. Vui lòng thay đổi bộ lọc.</p>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Total Spent */}
            <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 p-6 group hover:border-red-500/30 transition-all">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ArrowDownLeft className="h-20 w-20 text-red-500" />
               </div>
               <div className="flex flex-col h-full justify-between relative z-10">
                  <div className="mb-4">
                     <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-1">Tổng chi tiêu</p>
                     <h3 className="text-3xl font-heading font-bold text-white tracking-tight">{formatCurrency(spending.total_spent)}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded w-fit">
                    <ArrowDownLeft className="h-3 w-3" />
                    Đã thanh toán
                  </div>
               </div>
            </div>

            {/* Total Received */}
             <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 p-6 group hover:border-emerald-500/30 transition-all">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ArrowUpRight className="h-20 w-20 text-emerald-500" />
               </div>
               <div className="flex flex-col h-full justify-between relative z-10">
                  <div className="mb-4">
                     <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-1">Tổng thu về</p>
                     <h3 className="text-3xl font-heading font-bold text-white tracking-tight">{formatCurrency(spending.total_received)}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded w-fit">
                    <ArrowUpRight className="h-3 w-3" />
                    Được nhận
                  </div>
               </div>
            </div>

            {/* Net Balance */}
            <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 p-6 group hover:border-indigo-500/30 transition-all">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Wallet className="h-20 w-20 text-indigo-500" />
               </div>
               <div className="flex flex-col h-full justify-between relative z-10">
                  <div className="mb-4">
                     <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-1">Số dư ròng</p>
                     <p
                       className={cn(
                        "text-3xl font-heading font-bold tracking-tight",
                         Number(spending.net_balance) >= 0 ? 'text-emerald-400' : 'text-red-400',
                       )}
                     >
                       {Number(spending.net_balance) > 0 ? '+' : ''}{formatCurrency(spending.net_balance)}
                     </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-800 px-2 py-1 rounded w-fit">
                    <Wallet className="h-3 w-3" />
                    Hiện tại
                  </div>
               </div>
            </div>
          </div>

          {/* Charts Area */}
          <div className="min-h-[400px]">
            {tab === 'overview' && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-zinc-900 border-white/5 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white font-heading flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-500" />
                      Xu hướng theo tháng
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full mt-2">
                      <SpendingChart data={trends?.monthly || []} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/5 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white font-heading flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-pink-500" />
                      Top Danh mục
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="h-[300px] w-full mt-2">
                       <CategoryBreakdown data={spending.category_breakdown || []} />
                     </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === 'categories' && (
              <Card className="bg-zinc-900 border-white/5 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white font-heading flex items-center gap-2">
                    <div className="p-1.5 bg-orange-500/10 rounded-lg">
                      <PieChart className="h-4 w-4 text-orange-500" />
                    </div>
                    Chi tiết phân bổ danh mục
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="h-[400px] w-full mt-2">
                     <CategoryBreakdown data={categoryBreakdown || spending.category_breakdown || []} />
                   </div>
                </CardContent>
              </Card>
            )}

            {tab === 'trends' && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="bg-zinc-900 border-white/5 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white font-heading flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      Theo tháng
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full mt-2">
                      <MonthlyTrendsChart data={trends?.monthly || []} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/5 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white font-heading flex items-center gap-2">
                       <Calendar className="h-5 w-5 text-green-500" />
                      Theo năm
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full mt-2">
                      <YearlyTrendsChart data={trends?.yearly || []} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

