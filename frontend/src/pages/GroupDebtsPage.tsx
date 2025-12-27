import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Trophy, Calendar, Beer, Banknote, Crown, Medal, Skull } from 'lucide-react'
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

        return (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Beer className="h-5 w-5 text-orange-500" /> Tổng quan - {monthName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-2xl font-bold text-primary">{filteredSessions.length}</p>
                    <p className="text-xs text-muted-foreground">Cuộc nhậu</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(totalAmount.toFixed(0))}</p>
                    <p className="text-xs text-muted-foreground">Tổng chi tiêu</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ranking Card */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Bảng xếp hạng tham gia - {monthName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedByParticipation.map((member, index) => {
                    const isFirst = index === 0
                    const isLast = index === sortedByParticipation.length - 1 && sortedByParticipation.length > 1
                    
                    const funMessages = isFirst 
                      ? ["Vua nhậu đây rồi!", "Đệ nhất bia rượu!", "Chúa tể cuộc vui!", "Không ai qua nổi!"]
                      : isLast 
                      ? ["Ủa sao lười thế?", "Đi nhậu đi chứ!", "Bỏ anh em à?", "Nhớ anh em không?"]
                      : ["Cố lên nào!", "Sắp top 1 rồi!", "Chiến tiếp thôi!"]
                    
                    const randomMsg = funMessages[Math.floor(Math.random() * funMessages.length)]
                    
                    return (
                      <div
                        key={member.name}
                        className={`relative rounded-xl p-4 transition-all hover:scale-[1.01] ${
                          isFirst ? 'ranking-glow-gold bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50' :
                          isLast ? 'ranking-glow-red bg-gradient-to-r from-red-50 via-orange-50 to-red-50' :
                          'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Rank badge */}
                          <div className={`relative w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                            isFirst ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                            index === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                            'bg-gray-200'
                          }`}>
                            {isFirst ? (
                              <Crown className="h-6 w-6 text-white animate-pulse" />
                            ) : (
                              <span className="text-2xl font-black text-white">{index + 1}</span>
                            )}
                            {isFirst && <span className="text-[10px] text-white font-bold">VUA</span>}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold">{member.name}</span>
                              {isFirst && <Medal className="h-5 w-5 text-yellow-500" />}
                              {isLast && <Skull className="h-4 w-4 text-red-400" />}
                            </div>
                            <p className={`text-sm mt-0.5 ${isFirst ? 'text-yellow-600' : isLast ? 'text-red-500' : 'text-muted-foreground'}`}>
                              <span className="animate-marquee">{randomMsg}</span>
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm">
                                <span className="font-bold text-lg">{member.count}</span> cuộc nhậu
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Chi: <span className="font-semibold">{formatCurrency(member.totalOwed.toFixed(0))}</span>
                              </span>
                            </div>
                          </div>
                          
                          {/* Trophy for top 3 */}
                          {index < 3 && (
                            <div className={`text-4xl ${
                              index === 0 ? 'animate-bounce' : ''
                            }`}>
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
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
