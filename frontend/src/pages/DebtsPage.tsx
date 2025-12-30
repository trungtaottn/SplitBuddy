import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Check, Clock, Wallet, Users, Beer, Calendar } from 'lucide-react'
import FunTooltip, { FUN_MESSAGES } from '@/components/FunTooltip'
import { formatCurrency } from '@/utils/formatCurrency'
import { toast } from '@/components/ui/toaster'
import type { DebtSummary, ApiResponse, SessionDebt } from '@/types/api'

type TabType = 'summary' | 'sessions'

export default function DebtsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('sessions')

  const { data: debts, isLoading } = useQuery({
    queryKey: ['debts', 'me'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DebtSummary>>('/debts/me')
      return res.data.data
    },
  })

  const { data: sessionDebts, isLoading: sessionDebtsLoading } = useQuery({
    queryKey: ['debts', 'sessions'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SessionDebt[]>>('/debts/sessions')
      return res.data.data
    },
  })

  const requestSettle = useMutation({
    mutationFn: async (debtId: string) => {
      await api.post(`/debts/${debtId}/request-settle`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Đã gửi yêu cầu xác nhận!')
    },
    onError: () => {
      toast.error('Có lỗi xảy ra')
    },
  })

  const confirmSettle = useMutation({
    mutationFn: async (debtId: string) => {
      await api.post(`/debts/${debtId}/confirm-settle`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Đã xác nhận thanh toán!')
    },
    onError: () => {
      toast.error('Có lỗi xảy ra')
    },
  })

  if (isLoading || sessionDebtsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Công nợ của tôi</h1>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2 ${
            activeTab === 'sessions'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          Theo cuộc nhậu
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2 ${
            activeTab === 'summary'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          <Wallet className="h-4 w-4" />
          Tổng hợp
        </button>
      </div>

      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {sessionDebts?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Chưa có dữ liệu công nợ</p>
              </CardContent>
            </Card>
          ) : (
            sessionDebts?.map((session) => (
              <FunTooltip key={session.session_id} messages={FUN_MESSAGES.sessionCard}>
                <Card className="hover-pulse cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Beer className="h-5 w-5 text-orange-500" /> {session.session_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> {new Date(session.session_date).toLocaleDateString('vi-VN')}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium">Thành viên</th>
                          <th className="py-2 text-right font-medium">Đã trả</th>
                          <th className="py-2 text-right font-medium">Phải trả</th>
                          <th className="py-2 text-right font-medium">Số dư</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.participants.map((p) => {
                          const balance = parseFloat(p.balance)
                          return (
                            <tr key={p.participant_id} className="border-b last:border-0">
                              <td className="py-2">{p.name}</td>
                              <td className="py-2 text-right">{formatCurrency(p.total_paid)}</td>
                              <td className="py-2 text-right">{formatCurrency(p.total_owed)}</td>
                              <td className={`py-2 text-right font-medium ${
                                balance > 0 ? 'text-green-600 dark:text-green-400' : balance < 0 ? 'text-red-600 dark:text-red-400' : ''
                              }`}>
                                {balance > 0 && '+'}
                                {formatCurrency(p.balance)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Số dư dương = được nhận lại | Số dư âm = cần trả thêm
                  </p>
                </CardContent>
              </Card>
              </FunTooltip>
            ))
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng nợ</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {debts ? formatCurrency(debts.total_i_owe) : '0đ'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Được nợ</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {debts ? formatCurrency(debts.total_owed_to_me) : '0đ'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ArrowRight className="h-5 w-5" />
              Tôi nợ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {debts?.i_owe.length === 0 ? (
              <p className="text-center text-muted-foreground">Bạn không nợ ai</p>
            ) : (
              <div className="space-y-3">
                {debts?.i_owe.map((debt) => (
                  <div
                    key={debt.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{debt.counterpart_name}</p>
                      <p className="text-sm text-muted-foreground">{debt.session_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600 dark:text-red-400">{formatCurrency(debt.amount)}</p>
                      {debt.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => requestSettle.mutate(debt.id)}
                          disabled={requestSettle.isPending}
                        >
                          Báo đã trả
                        </Button>
                      )}
                      {debt.status === 'settlement_requested' && (
                        <span className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                          <Clock className="h-4 w-4" />
                          Chờ xác nhận
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <ArrowRight className="h-5 w-5 rotate-180" />
              Nợ tôi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {debts?.owed_to_me.length === 0 ? (
              <p className="text-center text-muted-foreground">Không ai nợ bạn</p>
            ) : (
              <div className="space-y-3">
                {debts?.owed_to_me.map((debt) => (
                  <div
                    key={debt.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{debt.counterpart_name}</p>
                      <p className="text-sm text-muted-foreground">{debt.session_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(debt.amount)}</p>
                      {debt.status === 'settlement_requested' && (
                        <Button
                          size="sm"
                          onClick={() => confirmSettle.mutate(debt.id)}
                          disabled={confirmSettle.isPending}
                          className="gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Xác nhận
                        </Button>
                      )}
                      {debt.status === 'pending' && (
                        <span className="text-sm text-muted-foreground">Chưa thanh toán</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  )
}
