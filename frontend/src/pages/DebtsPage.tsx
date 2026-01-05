import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Check, Clock, Wallet, Users, Beer, Calendar, Zap, 
  ChevronDown, ChevronUp, Copy, TrendingUp,
  ArrowUpRight, ArrowDownRight, MessageSquare
} from 'lucide-react'
import FunTooltip, { FUN_MESSAGES } from '@/components/FunTooltip'
import { formatCurrency } from '@/utils/formatCurrency'
import { toast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'
import { DebtCardSkeleton, StatsSkeleton } from '@/components/ui/skeleton'
import { staggerContainer, staggerItem } from '@/components/PageTransition'
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
        ? "bg-destructive/5 border-destructive/20"
        : "bg-success/5 border-success/20"
    )}>
      {/* Status indicator */}
      {isWaiting && (
        <div className="absolute -top-2 -right-2">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning">
            <Clock className="h-3 w-3" />
            Chờ xác nhận
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar - Retro style */}
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm font-body",
            isOwe 
              ? "bg-destructive/15 text-destructive"
              : "bg-success/15 text-success"
          )}>
            {counterpartName.split(' ').pop()?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate font-heading">{counterpartName}</p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Beer className="h-3 w-3" /> {sessionName}
            </p>
          </div>
        </div>

        {/* Amount - Retro mono font */}
        <div className={cn(
          "text-right flex-shrink-0",
          isOwe ? "text-destructive" : "text-success"
        )}>
          <p className="text-lg font-bold font-mono">{formatCurrency(amount)}</p>
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
            variant="destructive"
            className="flex-1 h-8 text-xs"
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
            variant="success"
            className="flex-1 h-8 text-xs"
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
      <div className="space-y-6 animate-in fade-in duration-300">
        <h1 className="text-2xl font-heading font-semibold text-foreground">Công nợ của tôi</h1>
        
        {/* Stats skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          <StatsSkeleton />
        </div>
        
        {/* Debt cards skeleton */}
        <div className="space-y-4">
          <div className="h-8 w-32 skeleton rounded-lg" />
          <div className="grid gap-3 sm:grid-cols-2">
            <DebtCardSkeleton />
            <DebtCardSkeleton />
            <DebtCardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header - Retro Typography */}
      <h1 className="text-2xl font-heading font-semibold text-foreground">Công nợ của tôi</h1>

      {/* Tabs - Retro Style */}
      <div className="flex gap-2 border-b border-border/50">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2.5 font-body text-sm font-medium transition-all ${
            activeTab === 'sessions'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          Theo cuộc nhậu
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2.5 font-body text-sm font-medium transition-all ${
            activeTab === 'summary'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
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
          {/* Smart Netting Section - Debt Optimization Visualization */}
          {nettedDebts.length > 0 && (
            <Card className="overflow-hidden border-primary/20">
              <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-primary/10">
                <button
                  onClick={() => setIsNettingExpanded(!isNettingExpanded)}
                  className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                  <CardTitle className="text-lg flex items-center gap-2 font-heading">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    Cấn trừ nợ thông minh
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono bg-card px-2 py-1 rounded-lg border border-border/50">
                      {nettedDebts.length} giao dịch tối ưu
                    </span>
                    {isNettingExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </CardHeader>
              
              {isNettingExpanded && (
                <CardContent className="pt-4 space-y-4">
                  {/* Info banner */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground font-body">
                      Sau khi cấn trừ các khoản nợ qua lại, đây là số tiền thực tế cần thanh toán. 
                      <span className="text-primary font-medium"> Giảm {nettedDebts.length} giao dịch!</span>
                    </p>
                  </div>

                  {/* Optimized debts list with visual flow */}
                  <div className="space-y-3">
                    {nettedDebts.map((debt, index) => (
                      <div
                        key={debt.counterpartId}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md animate-in slide-in-from-bottom-2",
                          debt.netAmount > 0 
                            ? "bg-destructive/5 border-destructive/20" 
                            : "bg-success/5 border-success/20"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm font-body",
                            debt.netAmount > 0 
                              ? "bg-destructive/15 text-destructive" 
                              : "bg-success/15 text-success"
                          )}>
                            {debt.counterpartName.split(' ').pop()?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm font-heading">{debt.counterpartName}</p>
                            <p className="text-xs text-muted-foreground font-body">
                              {debt.netAmount > 0 ? (
                                <span className="flex items-center gap-1">
                                  <ArrowUpRight className="h-3 w-3 text-destructive" />
                                  Bạn cần trả
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <ArrowDownRight className="h-3 w-3 text-success" />
                                  Họ cần trả bạn
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <span className={cn(
                          "text-lg font-bold font-mono",
                          debt.netAmount > 0 ? "text-destructive" : "text-success"
                        )}>
                          {formatCurrency(Math.abs(debt.netAmount))}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary with visual comparison */}
                  <div className="pt-4 border-t border-border/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                        <p className="text-sm text-muted-foreground font-body mb-1">Tổng cần trả</p>
                        <p className="text-2xl font-bold font-mono text-destructive">
                          {formatCurrency(totalNetIOwe)}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-success/5 border border-success/20">
                        <p className="text-sm text-muted-foreground font-body mb-1">Tổng được nhận</p>
                        <p className="text-2xl font-bold font-mono text-success">
                          {formatCurrency(totalNetOwedToMe)}
                        </p>
                      </div>
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
          <motion.div 
            className="grid gap-3 sm:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {debts?.i_owe.map((debt) => (
              <motion.div
                key={debt.id}
                variants={staggerItem}
                className="animate-card-lift"
              >
                <DebtCard
                  type="owe"
                  counterpartName={debt.counterpart_name}
                  sessionName={debt.session_name}
                  amount={debt.amount}
                  status={debt.status}
                  onSettle={() => requestSettle.mutate(debt.id)}
                  isSettling={requestSettle.isPending}
                />
              </motion.div>
            ))}
          </motion.div>
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
          <motion.div 
            className="grid gap-3 sm:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {debts?.owed_to_me.map((debt) => (
              <motion.div
                key={debt.id}
                variants={staggerItem}
                className="animate-card-lift"
              >
                <DebtCard
                  type="owed"
                  counterpartName={debt.counterpart_name}
                  sessionName={debt.session_name}
                  amount={debt.amount}
                  status={debt.status}
                  onSettle={() => confirmSettle.mutate(debt.id)}
                  isSettling={confirmSettle.isPending}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
        </>
      )}
    </div>
  )
}
