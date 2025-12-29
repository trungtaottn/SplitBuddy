import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Trophy, Calendar, Beer, Banknote, Crown, Skull } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import type { GroupDebtSummary, ApiResponse } from '@/types/api'

export default function GroupDebtsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['groups', groupId, 'debts'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<GroupDebtSummary>>(`/groups/${groupId}/debts`)
      return res.data.data
    },
    enabled: !!groupId,
  })

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

      {/* Month Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
        </div>
      </div>

      {/* Statistics Dashboard - Ranking */}
      {(() => {
        // Filter sessions by selected month
        const filteredSessions = summary.sessions.filter((s) => {
          const sessionDate = new Date(s.session_date)
          const sessionMonth = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`
          return sessionMonth === selectedMonth
        })

        const monthName = new Date(selectedMonth + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

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
          const isLast = !isTop && index === 0
          
          const funMessages = isFirst 
            ? ["Không ai qua nổi!", "Vua nhậu!"]
            : isLast 
            ? ["Đi nhậu đi chứ!", "Bỏ anh em à?"]
            : isTop 
            ? ["Cố lên nào!", "Chiến tiếp thôi!"]
            : ["Ủa sao lười thế?", "Nhớ anh em không?"]
          
          const randomMsg = funMessages[Math.floor(Math.random() * funMessages.length)]
          
          return (
            <div
              className={`relative rounded-xl p-3 transition-all hover:scale-[1.02] ${
                isFirst ? 'ranking-glow-gold bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 shadow-md' :
                isLast ? 'ranking-glow-red bg-gradient-to-r from-red-50 via-orange-50 to-red-50' :
                'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`relative w-10 h-10 rounded-lg flex flex-col items-center justify-center ${
                  isFirst ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg animate-pulse' :
                  isTop && index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                  isTop && index === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                  isLast ? 'bg-gradient-to-br from-red-400 to-red-500' :
                  'bg-gray-200'
                }`}>
                  {isFirst ? (
                    <Crown className="h-5 w-5 text-white" />
                  ) : (
                    <span className="text-lg font-black text-white">{actualIndex + 1}</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold truncate">{member.name}</span>
                    {isFirst && <span>👑</span>}
                    {isLast && <Skull className="h-3 w-3 text-red-400" />}
                  </div>
                  <p className={`text-xs ${isFirst ? 'text-yellow-600' : isLast ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {randomMsg}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-lg">{member.count} <span className="text-base">cuộc</span></p>
                </div>
                
                {isTop && index < 3 && (
                  <span className={`text-2xl ${index === 0 ? 'animate-bounce' : ''}`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                )}
              </div>
            </div>
          )
        }

        return (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Summary Card - Enhanced */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-orange-50 to-amber-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Beer className="h-5 w-5 text-orange-500 animate-bounce" /> 
                  Tổng quan - {monthName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Hero Stat - Sessions */}
                <div className="relative rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 p-5 text-white text-center shadow-lg overflow-hidden">
                  <div className="absolute -top-4 -right-4 text-6xl opacity-20">🍺</div>
                  <p className="text-5xl font-black">{filteredSessions.length}</p>
                  <p className="text-sm opacity-90">Cuộc nhậu trong tháng</p>
                  {filteredSessions.length >= 4 && (
                    <p className="text-xs mt-1 bg-white/20 rounded-full px-2 py-0.5 inline-block">
                      🔥 Tháng sôi động!
                    </p>
                  )}
                </div>

                {/* Money Stats */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-600 font-medium">💰 Tổng chi tiêu</p>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(totalAmount.toFixed(0))}</p>
                      </div>
                      <div className="text-3xl">💸</div>
                    </div>
                  </div>
                </div>

                {/* Average Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-blue-50 p-3 border border-blue-100 text-center hover:shadow-md transition-shadow">
                    <p className="text-2xl">📊</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(avgPerSession.toFixed(0))}</p>
                    <p className="text-xs text-muted-foreground">TB/cuộc</p>
                  </div>
                  <div className="rounded-xl bg-purple-50 p-3 border border-purple-100 text-center hover:shadow-md transition-shadow">
                    <p className="text-2xl">👤</p>
                    <p className="text-lg font-bold text-purple-600">{formatCurrency(avgPerPerson.toFixed(0))}</p>
                    <p className="text-xs text-muted-foreground">TB/người</p>
                  </div>
                </div>

                {/* Fun Quote */}
                <div className="text-center pt-2 border-t">
                  <p className="text-xs text-muted-foreground italic">
                    {filteredSessions.length === 0 ? "Chưa có cuộc nhậu nào 😢" :
                     filteredSessions.length === 1 ? "Mới khởi động thôi! 🚀" :
                     filteredSessions.length <= 3 ? "Đang ấm lên rồi đấy! 🔥" :
                     "Tháng này nhậu dữ quá! 🍻🎉"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ranking Cards - Split into Top 4 and Bottom 4 */}
            <div className="space-y-4">
              {/* Top performers */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2 bg-gradient-to-r from-yellow-50 to-amber-50">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    🔥 Top tham gia ({topList.length})
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
              <Card className="overflow-hidden">
                <CardHeader className="pb-2 bg-gradient-to-r from-red-50 to-orange-50">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Skull className="h-5 w-5 text-red-500" />
                    Dưới đáy xã hội ({bottomList.length})
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
                      <p className="text-2xl mb-2">🎉</p>
                      <p className="text-sm text-muted-foreground">
                        Tất cả đều tham gia tốt!
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Nhóm có ít thành viên, ai cũng là top cả 💪
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )
      })()}

      {/* Summary Cards - filtered by month */}
      {(() => {
        // Filter sessions by selected month
        const filteredSessions = summary.sessions.filter((s) => {
          const sessionDate = new Date(s.session_date)
          const sessionMonth = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`
          return sessionMonth === selectedMonth
        })
        
        const monthName = new Date(selectedMonth + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
        
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
        // Filter sessions by selected month for the table
        const filteredTableSessions = summary.sessions.filter((s) => {
          const sessionDate = new Date(s.session_date)
          const sessionMonth = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`
          return sessionMonth === selectedMonth
        })
        
        const monthName = new Date(selectedMonth + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
        
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
                      <tr className="border-b bg-gray-50">
                        <th className="py-3 px-2 text-left font-medium sticky left-0 bg-gray-50">
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
                        <tr key={session.session_id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 sticky left-0 bg-white">
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
                            className={`py-3 px-2 text-right ${hasAmount ? '' : 'text-gray-300'}`}
                          >
                            {hasAmount ? formatCurrency(amount) : '-'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-gray-100 font-bold">
                        <td className="py-3 px-2 sticky left-0 bg-gray-100">Tổng tháng này</td>
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
        <p>💡 <strong>Số dư dương (+)</strong>: Được nhận lại tiền từ nhóm</p>
        <p>💡 <strong>Số dư âm (-)</strong>: Cần trả thêm cho nhóm</p>
      </div>
    </div>
  )
}
