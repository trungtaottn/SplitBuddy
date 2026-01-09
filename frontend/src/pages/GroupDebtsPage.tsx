import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Trophy, Calendar, Beer, Banknote, Crown, Skull, ArrowRight, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import type { GroupDebtSummary, SimplifiedDebtSummary, ApiResponse } from '@/types/api'
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext'

export default function GroupDebtsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { isEnabled, isLoading: featuresLoading } = useFeatureFlags()
  
  // Check if feature is enabled
  const isGroupDebtsEnabled = isEnabled('group_debts')
  const isSimplifiedDebtsEnabled = isEnabled('group_debts_simplified')
  
  // Redirect if feature is disabled
  useEffect(() => {
    if (!featuresLoading && !isGroupDebtsEnabled) {
      navigate('/groups', { replace: true })
    }
  }, [featuresLoading, isGroupDebtsEnabled, navigate])
  
  const [filterType, setFilterType] = useState<'month' | 'range'>('month')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [endDate, setEndDate] = useState(() => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`
  })
  const [isSettlementExpanded, setIsSettlementExpanded] = useState(false)

  // Only fetch if feature is enabled
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['groups', groupId, 'debts'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<GroupDebtSummary>>(`/groups/${groupId}/debts`)
      return res.data.data
    },
    enabled: !!groupId && isGroupDebtsEnabled && !featuresLoading,
  })

  // Query for simplified/netted debts - only if feature is enabled
  const { data: simplifiedDebts } = useQuery({
    queryKey: ['groups', groupId, 'debts', 'simplified'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SimplifiedDebtSummary>>(`/groups/${groupId}/debts/simplified`)
      return res.data.data
    },
    enabled: !!groupId && isSimplifiedDebtsEnabled && !featuresLoading,
  })

  // Show loading while checking features
  if (featuresLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // Redirect handled by useEffect, but also prevent render
  if (!isGroupDebtsEnabled) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không thể tải dữ liệu công nợ nhóm</p>
        <Button onClick={() => navigate(-1)} className="mt-4">Quay lại</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Công nợ nhóm: {summary.group_name}</h1>
          <p className="text-sm text-muted-foreground">
            {summary.members.length} thành viên • {summary.sessions.length} cuộc nhậu
          </p>
        </div>
      </div>

      {/* Date Filter */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Filter Type Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setFilterType('month')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                filterType === 'month' 
                  ? 'bg-white dark:bg-gray-700 shadow text-primary font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Theo tháng
            </button>
            <button
              onClick={() => setFilterType('range')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                filterType === 'range' 
                  ? 'bg-white dark:bg-gray-700 shadow text-primary font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Khoảng ngày
            </button>
          </div>

          {/* Month Picker - Custom Select */}
          {filterType === 'month' && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              >
                {(() => {
                  const months = []
                  const now = new Date()
                  // Show last 12 months
                  for (let i = 0; i < 12; i++) {
                    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
                    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                    const label = date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
                    months.push({ value, label })
                  }
                  return months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))
                })()}
              </select>
            </div>
          )}

          {/* Date Range Picker */}
          {filterType === 'range' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Từ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Đến:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Simplified Debts - Debt Netting */}
      {simplifiedDebts && simplifiedDebts.simplified_debts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button 
              onClick={() => setIsSettlementExpanded(!isSettlementExpanded)}
              className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Cấn trừ nợ thông minh
                <span className="text-sm font-normal text-muted-foreground">
                  ({simplifiedDebts.total_transactions} giao dịch • {formatCurrency(simplifiedDebts.total_amount)})
                </span>
              </CardTitle>
              {isSettlementExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </CardHeader>
          
          {isSettlementExpanded && (
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Thay vì thanh toán riêng từng cuộc, chỉ cần {simplifiedDebts.total_transactions} giao dịch để tất toán:
              </p>
              <div className="space-y-3">
                {simplifiedDebts.simplified_debts.map((debt, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-foreground font-bold text-sm">
                          {debt.from_user_name.split(' ').pop()?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{debt.from_user_name}</p>
                        <p className="text-xs text-muted-foreground">Nợ</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <ArrowRight className="h-5 w-5 text-primary" />
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(debt.amount)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium text-sm">{debt.to_user_name}</p>
                        <p className="text-xs text-muted-foreground">Nhận</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">
                          {debt.to_user_name.split(' ').pop()?.charAt(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tổng cần thanh toán:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(simplifiedDebts.total_amount)}
                </span>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Statistics Dashboard - Ranking */}
      {(() => {
        // Filter sessions by selected month or date range
        const filteredSessions = summary.sessions.filter((s) => {
          const sessionDate = new Date(s.session_date)
          if (filterType === 'month') {
            const sessionMonth = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`
            return sessionMonth === selectedMonth
          } else {
            const start = new Date(startDate)
            const end = new Date(endDate)
            return sessionDate >= start && sessionDate <= end
          }
        })

        const monthName = filterType === 'month' 
          ? new Date(selectedMonth + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
          : `${new Date(startDate).toLocaleDateString('vi-VN')} - ${new Date(endDate).toLocaleDateString('vi-VN')}`

        // If no sessions in this month, don't show anything
        if (filteredSessions.length === 0) {
          return null
        }

        // Calculate participation count for each member in filtered sessions
        const participationCount: Record<string, { name: string; count: number; totalOwed: number }> = {}
        summary.members.forEach((m) => {
          participationCount[m.user_id] = { name: m.name, count: 0, totalOwed: 0 }
        })

        filteredSessions.forEach((session) => {
          session.member_amounts.forEach((ma) => {
            if (participationCount[ma.user_id] && parseFloat(ma.amount_owed) > 0) {
              participationCount[ma.user_id].count += 1
              participationCount[ma.user_id].totalOwed += parseFloat(ma.amount_owed)
            }
          })
        })

        const sortedByParticipation = Object.values(participationCount).sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count
          return b.totalOwed - a.totalOwed
        })

        const totalAmount = filteredSessions.reduce((sum, s) => sum + parseFloat(s.total_amount), 0)

        // Calculate additional stats
        const avgPerSession = totalAmount / filteredSessions.length
        const activeMembers = sortedByParticipation.filter(m => m.count > 0)
        const avgPerPerson = activeMembers.length > 0 ? totalAmount / activeMembers.length : 0

        // Smart split into Top and Bottom
        // Logic: 
        // - ≤4 users: Top shows all, Bottom shows encouraging message
        // - 5-8 users: Top 4, Bottom shows remaining (no overlap)
        // - >8 users: Top 4, Bottom 4 (from end, no overlap)
        const totalUsers = sortedByParticipation.length
        const midPoint = Math.ceil(totalUsers / 2)
        
        let topList: typeof sortedByParticipation
        let bottomList: typeof sortedByParticipation
        
        if (totalUsers <= 4) {
          topList = sortedByParticipation
          bottomList = []
        } else if (totalUsers <= 8) {
          topList = sortedByParticipation.slice(0, midPoint)
          bottomList = sortedByParticipation.slice(midPoint).reverse()
        } else {
          topList = sortedByParticipation.slice(0, 4)
          bottomList = sortedByParticipation.slice(-4).reverse()
        }

        const RankingItem = ({ member, index, isTop }: { member: typeof sortedByParticipation[0]; index: number; isTop: boolean }) => {
          const actualIndex = isTop ? index : sortedByParticipation.length - 4 + (3 - index)
          const isFirst = isTop && index === 0
          
          return (
            <div
              className={`relative rounded-lg p-3 border transition-all hover:bg-accent/50 ${
                isFirst ? 'bg-primary/5 border-primary/20' : 'bg-card'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`relative w-10 h-10 rounded-lg flex items-center justify-center ${
                  isFirst ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {isFirst ? (
                    <Crown className="h-5 w-5" />
                  ) : (
                    <span className="text-lg font-bold">{actualIndex + 1}</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{member.name}</span>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(member.totalOwed.toFixed(0))}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-lg">{member.count}</p>
                  <p className="text-xs text-muted-foreground">cuộc</p>
                </div>
              </div>
            </div>
          )
        }

        return (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Summary Card - Enhanced */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Beer className="h-5 w-5 text-primary" /> 
                  Tổng quan - {monthName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Hero Stat - Sessions */}
                <div className="relative rounded-xl bg-primary p-5 text-primary-foreground text-center overflow-hidden">
                  <p className="text-5xl font-black">{filteredSessions.length}</p>
                  <p className="text-sm opacity-90">Cuộc nhậu trong kỳ</p>
                </div>

                {/* Money Stats */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Tổng chi tiêu</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalAmount.toFixed(0))}</p>
                    </div>
                    <Banknote className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>

                {/* Average Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-lg font-bold">{formatCurrency(avgPerSession.toFixed(0))}</p>
                    <p className="text-xs text-muted-foreground">TB/cuộc</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-lg font-bold">{formatCurrency(avgPerPerson.toFixed(0))}</p>
                    <p className="text-xs text-muted-foreground">TB/người</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ranking Cards - Split into Top 4 and Bottom 4 */}
            <div className="space-y-4">
              {/* Top performers */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Top tham gia ({topList.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="space-y-2">
                    {topList.map((member, index) => (
                      <RankingItem key={member.name} member={member} index={index} isTop={true} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Bottom performers - always show */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Skull className="h-5 w-5 text-muted-foreground" />
                    Ít tham gia ({bottomList.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  {bottomList.length > 0 ? (
                    <div className="space-y-2">
                      {bottomList.map((member, index) => (
                        <RankingItem key={member.name} member={member} index={index} isTop={false} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-2xl mb-2"></p>
                      <p className="text-sm text-muted-foreground">
                        Tất cả đều tham gia tốt!
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Nhóm có ít thành viên, ai cũng là top cả
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )
      })()}

      {/* Summary Cards - filtered by month or date range */}
      {(() => {
        // Filter sessions by selected month or date range
        const filteredSessions = summary.sessions.filter((s) => {
          const sessionDate = new Date(s.session_date)
          if (filterType === 'month') {
            const sessionMonth = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`
            return sessionMonth === selectedMonth
          } else {
            const start = new Date(startDate)
            const end = new Date(endDate)
            return sessionDate >= start && sessionDate <= end
          }
        })
        
        const monthName = filterType === 'month'
          ? new Date(selectedMonth + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
          : `${new Date(startDate).toLocaleDateString('vi-VN')} - ${new Date(endDate).toLocaleDateString('vi-VN')}`
        
        // Calculate member totals for this month only
        const memberMonthTotals: Record<string, { paid: number; owed: number }> = {}
        summary.members.forEach((m) => {
          memberMonthTotals[m.user_id] = { paid: 0, owed: 0 }
        })
        
        // Note: We only have amount_owed per session, not amount_paid per session
        // So for now, we show "-" if no sessions in this month
        filteredSessions.forEach((session) => {
          session.member_amounts.forEach((ma) => {
            if (memberMonthTotals[ma.user_id]) {
              memberMonthTotals[ma.user_id].owed += parseFloat(ma.amount_owed) || 0
            }
          })
        })
        
        if (filteredSessions.length === 0) {
          return (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Tổng hợp số dư - {monthName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center py-4 text-muted-foreground">
                  Không có dữ liệu trong tháng này
                </p>
              </CardContent>
            </Card>
          )
        }
        
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Tổng hợp số dư - {monthName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {summary.members.map((member) => {
                  const monthData = memberMonthTotals[member.user_id] || { paid: 0, owed: 0 }
                  return (
                    <div key={member.user_id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{member.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          {monthData.owed > 0 ? formatCurrency(monthData.owed.toFixed(0)) : '-'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Debt Matrix Table */}
      {(() => {
        // Filter sessions by selected month or date range for the table
        const filteredTableSessions = summary.sessions.filter((s) => {
          const sessionDate = new Date(s.session_date)
          if (filterType === 'month') {
            const sessionMonth = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`
            return sessionMonth === selectedMonth
          } else {
            const start = new Date(startDate)
            const end = new Date(endDate)
            return sessionDate >= start && sessionDate <= end
          }
        })
        
        const monthName = filterType === 'month'
          ? new Date(selectedMonth + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
          : `${new Date(startDate).toLocaleDateString('vi-VN')} - ${new Date(endDate).toLocaleDateString('vi-VN')}`
        
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bảng chi tiết công nợ - {monthName}</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTableSessions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Không có cuộc nhậu nào trong tháng này
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 dark:bg-gray-800">
                        <th className="py-3 px-2 text-left font-medium sticky left-0 bg-gray-50 dark:bg-gray-800">
                          Cuộc nhậu
                        </th>
                        <th className="py-3 px-2 text-right font-medium">Tổng</th>
                        {summary.members.map((member) => (
                          <th key={member.user_id} className="py-3 px-2 text-right font-medium min-w-[100px]">
                            {member.name.split(' ').pop()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTableSessions.map((session) => (
                        <tr key={session.session_id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-3 px-2 sticky left-0 bg-white dark:bg-gray-900">
                            <div>
                              <p className="font-medium">{session.session_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(session.session_date).toLocaleDateString('vi-VN')}
                              </p>
                              {session.payers && session.payers.length > 0 && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                  <Banknote className="h-3 w-3" /> {session.payers.map(p => `${p.name}: ${formatCurrency(p.amount_paid)}`).join(', ')}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right font-medium text-primary">
                            {formatCurrency(session.total_amount)}
                          </td>
                      {summary.members.map((member) => {
                        const memberAmount = session.member_amounts.find(
                          (ma) => ma.user_id === member.user_id
                        )
                        const amount = memberAmount?.amount_owed || '0'
                        const hasAmount = parseFloat(amount) > 0
                        return (
                          <td
                            key={member.user_id}
                            className={`py-3 px-2 text-right ${hasAmount ? '' : 'text-gray-300 dark:text-gray-600'}`}
                          >
                            {hasAmount ? formatCurrency(amount) : '-'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-gray-100 dark:bg-gray-800 font-bold">
                        <td className="py-3 px-2 sticky left-0 bg-gray-100 dark:bg-gray-800">Tổng tháng này</td>
                        <td className="py-3 px-2 text-right text-primary">
                          {formatCurrency(
                            filteredTableSessions
                              .reduce((sum, s) => sum + parseFloat(s.total_amount), 0)
                              .toString()
                          )}
                        </td>
                        {summary.members.map((member) => {
                          // Calculate total owed for this month only
                          const monthTotal = filteredTableSessions.reduce((sum, session) => {
                            const ma = session.member_amounts.find(m => m.user_id === member.user_id)
                            return sum + (ma ? parseFloat(ma.amount_owed) : 0)
                          }, 0)
                          return (
                            <td key={member.user_id} className="py-3 px-2 text-right">
                              {monthTotal > 0 ? formatCurrency(monthTotal.toFixed(0)) : '-'}
                            </td>
                          )
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Legend */}
      <div className="text-sm text-muted-foreground">
        <p><strong>Số dư dương (+)</strong>: Được nhận lại tiền từ nhóm</p>
        <p><strong>Số dư âm (-)</strong>: Cần trả thêm cho nhóm</p>
      </div>
    </div>
  )
}
