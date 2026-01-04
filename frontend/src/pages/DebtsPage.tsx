import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowRight, Check, Clock, Wallet, Users, Beer, Calendar, Zap, 
  ChevronDown, ChevronUp, Copy, TrendingUp,
  ArrowUpRight, ArrowDownRight, MessageSquare
} from 'lucide-react'
import FunTooltip, { FUN_MESSAGES } from '@/components/FunTooltip'
import { formatCurrency } from '@/utils/formatCurrency'
import { toast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'
import type { DebtSummary, ApiResponse, SessionDebt } from '@/types/api'

type TabType = 'summary' | 'sessions'

interface NettedDebt {
  counterpartId: string
  counterpartName: string
  netAmount: number // positive = I owe them, negative = they owe me
}

// DebtCard Component - Mobile-optimized card for individual debts
function DebtCard({
  type,
  counterpartName,
  sessionName,
  amount,
  status,
  onSettle,
  isSettling,
}: {
  type: 'owe' | 'owed'
  counterpartName: string
  sessionName: string
  amount: string
  status: string
  onSettle: () => void
  isSettling: boolean
}) {
  const isOwe = type === 'owe'
  const isPending = status === 'pending'
  const isWaiting = status === 'settlement_requested'

  const copyToClipboard = () => {
    const text = isOwe 
      ? `Tôi nợ ${counterpartName}: ${formatCurrency(amount)} (từ ${sessionName})`
      : `${counterpartName} nợ tôi: ${formatCurrency(amount)} (từ ${sessionName})`
    navigator.clipboard.writeText(text)
    toast.success('Đã copy!')
  }

  const shareReminder = () => {
    const text = isOwe
      ? `Chào ${counterpartName}, mình sẽ chuyển ${formatCurrency(amount)} cho bạn nha! 🍺`
      : `Chào ${counterpartName}, nhắc nhẹ khoản ${formatCurrency(amount)} từ cuộc nhậu "${sessionName}" nha! 🍺`
    
    if (navigator.share) {
      navigator.share({ text })
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Đã copy tin nhắn nhắc nợ!')
    }
  }

  return (
    <div className={cn(
      "relative rounded-xl border p-4 transition-all hover:shadow-md",
      isOwe 
        ? "bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 border-red-100 dark:border-red-800/50"
        : "bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 border-green-100 dark:border-green-800/50"
    )}>
      {/* Status indicator */}
      {isWaiting && (
        <div className="absolute -top-2 -right-2">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            Chờ xác nhận
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
            isOwe 
              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          )}>
            {counterpartName.split(' ').pop()?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{counterpartName}</p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Beer className="h-3 w-3" /> {sessionName}
            </p>
          </div>
        </div>

        {/* Amount */}
        <div className={cn(
          "text-right flex-shrink-0",
          isOwe ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
        )}>
          <p className="text-lg font-bold">{formatCurrency(amount)}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-8 text-xs"
          onClick={copyToClipboard}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-8 text-xs"
          onClick={shareReminder}
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Nhắc nợ
        </Button>
        
        {/* Action button based on type and status */}
        {isOwe && isPending && (
          <Button
            size="sm"
            variant="default"
            className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600"
            onClick={onSettle}
            disabled={isSettling}
          >
            <Check className="h-3 w-3 mr-1" />
            Đã trả
          </Button>
        )}
        {!isOwe && isWaiting && (
          <Button
            size="sm"
            variant="default"
            className="flex-1 h-8 text-xs bg-green-500 hover:bg-green-600"
            onClick={onSettle}
            disabled={isSettling}
          >
            <Check className="h-3 w-3 mr-1" />
            Xác nhận
          </Button>
        )}
      </div>
    </div>
  )
}

export default function DebtsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('sessions')
  const [isNettingExpanded, setIsNettingExpanded] = useState(false)

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

  // Calculate netted debts (smart settlement)
  const nettedDebts = useMemo<NettedDebt[]>(() => {
    if (!debts) return []
    
    const netMap = new Map<string, { name: string; amount: number }>()
    
    // I owe them (+)
    debts.i_owe.forEach(debt => {
      const current = netMap.get(debt.counterpart_id) || { name: debt.counterpart_name, amount: 0 }
      current.amount += parseFloat(debt.amount)
      netMap.set(debt.counterpart_id, current)
    })
    
    // They owe me (-)
    debts.owed_to_me.forEach(debt => {
      const current = netMap.get(debt.counterpart_id) || { name: debt.counterpart_name, amount: 0 }
      current.amount -= parseFloat(debt.amount)
      netMap.set(debt.counterpart_id, current)
    })
    
    // Convert to array and filter out zero balances
    return Array.from(netMap.entries())
      .map(([id, data]) => ({
        counterpartId: id,
        counterpartName: data.name,
        netAmount: data.amount
      }))
      .filter(d => Math.abs(d.netAmount) > 0.01)
      .sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount))
  }, [debts])

  const totalNetIOwe = nettedDebts.filter(d => d.netAmount > 0).reduce((sum, d) => sum + d.netAmount, 0)
  const totalNetOwedToMe = nettedDebts.filter(d => d.netAmount < 0).reduce((sum, d) => sum + Math.abs(d.netAmount), 0)

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
            <Card className="bg-gray-50 dark:bg-gray-800/50">
              <CardContent className="py-12 text-center">
                <Beer className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-muted-foreground">Chưa có dữ liệu công nợ</p>
                <p className="text-sm text-gray-400 mt-1">Tham gia cuộc nhậu và thêm hoá đơn để bắt đầu</p>
              </CardContent>
            </Card>
          ) : (
            sessionDebts?.map((session) => {
              // Calculate session totals
              const totalPaid = session.participants.reduce((sum, p) => sum + parseFloat(p.total_paid), 0)
              
              return (
                <FunTooltip key={session.session_id} messages={FUN_MESSAGES.sessionCard}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Beer className="h-5 w-5 text-orange-500" /> {session.session_name}
                        </CardTitle>
                        <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                          {formatCurrency(totalPaid)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-4 w-4" /> 
                        {new Date(session.session_date).toLocaleDateString('vi-VN', { 
                          weekday: 'short', day: '2-digit', month: '2-digit' 
                        })}
                        <span className="mx-2">•</span>
                        <Users className="h-4 w-4" />
                        {session.participants.length} người
                      </p>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {/* Mobile-friendly card grid */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        {session.participants.map((p) => {
                          const balance = parseFloat(p.balance)
                          const isPositive = balance > 0
                          const isNegative = balance < 0
                          
                          return (
                            <div 
                              key={p.participant_id} 
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border",
                                isPositive && "bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-800/30",
                                isNegative && "bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-800/30",
                                !isPositive && !isNegative && "bg-gray-50 dark:bg-gray-800/50"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                  isPositive && "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
                                  isNegative && "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
                                  !isPositive && !isNegative && "bg-gray-100 text-gray-600 dark:bg-gray-700"
                                )}>
                                  {p.name.split(' ').pop()?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{p.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Trả: {formatCurrency(p.total_paid)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right flex-shrink-0">
                                <p className={cn(
                                  "font-bold text-sm",
                                  isPositive && "text-green-600 dark:text-green-400",
                                  isNegative && "text-red-600 dark:text-red-400",
                                  !isPositive && !isNegative && "text-gray-500"
                                )}>
                                  {isPositive && '+'}
                                  {formatCurrency(p.balance)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {isPositive ? 'Được nhận' : isNegative ? 'Cần trả' : 'Huề'}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </FunTooltip>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <>
          {/* Smart Netting Section */}
          {nettedDebts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <button
                  onClick={() => setIsNettingExpanded(!isNettingExpanded)}
                  className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Cấn trừ nợ thông minh
                    <span className="text-sm font-normal text-muted-foreground">
                      ({nettedDebts.length} người • Nợ: {formatCurrency(totalNetIOwe)} | Được nợ: {formatCurrency(totalNetOwedToMe)})
                    </span>
                  </CardTitle>
                  {isNettingExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              </CardHeader>
              
              {isNettingExpanded && (
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Sau khi cấn trừ các khoản nợ qua lại, đây là số tiền thực tế cần thanh toán:
                  </p>
                  <div className="space-y-3">
                    {nettedDebts.map((debt) => (
                      <div
                        key={debt.counterpartId}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            debt.netAmount > 0 
                              ? 'bg-red-100 dark:bg-red-900/30' 
                              : 'bg-green-100 dark:bg-green-900/30'
                          }`}>
                            <span className={`font-bold text-sm ${
                              debt.netAmount > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {debt.counterpartName.split(' ').pop()?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{debt.counterpartName}</p>
                            <p className="text-xs text-muted-foreground">
                              {debt.netAmount > 0 ? 'Bạn nợ' : 'Nợ bạn'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <ArrowRight className={`h-4 w-4 ${
                            debt.netAmount > 0 ? 'text-red-500' : 'text-green-500 rotate-180'
                          }`} />
                          <span className={`text-lg font-bold ${
                            debt.netAmount > 0 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {formatCurrency(Math.abs(debt.netAmount))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Tổng cần trả</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(totalNetIOwe)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Tổng được nhận</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(totalNetOwedToMe)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng nợ (gốc)</p>
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
                  <p className="text-sm text-muted-foreground">Được nợ (gốc)</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {debts ? formatCurrency(debts.total_owed_to_me) : '0đ'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

      {/* Debts I Owe - Mobile Optimized Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-600 dark:text-red-400">
            <ArrowUpRight className="h-5 w-5" />
            Tôi cần trả
          </h2>
          {debts && debts.i_owe.length > 0 && (
            <span className="text-sm text-muted-foreground">{debts.i_owe.length} khoản</span>
          )}
        </div>
        
        {debts?.i_owe.length === 0 ? (
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="py-8 text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="text-green-700 dark:text-green-300 font-medium">Bạn không nợ ai! 🎉</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {debts?.i_owe.map((debt) => (
              <DebtCard
                key={debt.id}
                type="owe"
                counterpartName={debt.counterpart_name}
                sessionName={debt.session_name}
                amount={debt.amount}
                status={debt.status}
                onSettle={() => requestSettle.mutate(debt.id)}
                isSettling={requestSettle.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Debts Owed To Me - Mobile Optimized Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-green-600 dark:text-green-400">
            <ArrowDownRight className="h-5 w-5" />
            Được nhận lại
          </h2>
          {debts && debts.owed_to_me.length > 0 && (
            <span className="text-sm text-muted-foreground">{debts.owed_to_me.length} khoản</span>
          )}
        </div>

        {debts?.owed_to_me.length === 0 ? (
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-muted-foreground">Không ai nợ bạn</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {debts?.owed_to_me.map((debt) => (
              <DebtCard
                key={debt.id}
                type="owed"
                counterpartName={debt.counterpart_name}
                sessionName={debt.session_name}
                amount={debt.amount}
                status={debt.status}
                onSettle={() => confirmSettle.mutate(debt.id)}
                isSettling={confirmSettle.isPending}
              />
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}
