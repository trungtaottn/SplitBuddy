import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Check, Clock, Wallet, Users, Beer, Calendar, Zap, 
  ChevronDown, ChevronUp, Copy, TrendingUp,
  ArrowUpRight, ArrowDownRight, MessageSquare, QrCode
} from 'lucide-react'
import FunTooltip, { FUN_MESSAGES } from '@/components/FunTooltip'
import { formatCurrency } from '@/utils/formatCurrency'
import { absMoney, addMoney, compareMoney, subtractMoney, sumMoney } from '@/utils/money'
import { toast } from '@/components/ui/toaster'
import { showError } from '@/utils/errorHandler'
import { cn } from '@/lib/utils'
import { DebtCardSkeleton, StatsSkeleton } from '@/components/ui/skeleton'
import { staggerContainer, staggerItem } from '@/components/PageTransition'
import { QRCodeGenerator } from '@/components/QRCodeGenerator'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import type { DebtSummary, ApiResponse, SessionDebt } from '@/types/api'

type TabType = 'summary' | 'sessions'

interface NettedDebt {
  counterpartId: string
  counterpartName: string
  netAmount: string // positive = I owe them, negative = they owe me
}

// DebtCard Component - Modern Dark Luxury style
function DebtCard({
  type,
  counterpartName,
  sessionName,
  amount,
  status,
  isGuest,
  onSettle,
  onSettleGuest,
  onShowPayQr,
  canShowPayQr,
  isSettling,
}: {
  type: 'owe' | 'owed'
  counterpartName: string
  sessionName: string
  amount: string
  status: string
  isGuest: boolean
  onSettle: () => void
  onSettleGuest?: () => void
  onShowPayQr?: () => void
  canShowPayQr?: boolean
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
    toast.success('Đã sao chép!')
  }

  const shareReminder = () => {
    const text = isOwe
      ? `Chào ${counterpartName}, mình sẽ chuyển ${formatCurrency(amount)} cho bạn nha! 🍺`
      : `Chào ${counterpartName}, nhắc nhẹ khoản ${formatCurrency(amount)} từ cuộc nhậu "${sessionName}" nha! 🍺`
    
    if (navigator.share) {
      navigator.share({ text })
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Đã sao chép tin nhắn nhắc nợ!')
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-5 transition-all hover:bg-zinc-900 hover:border-white/10 hover:shadow-lg">
      {/* Background Gradient Accents */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full pointer-events-none transition-opacity group-hover:opacity-20",
        isOwe ? "bg-red-600" : "bg-emerald-600"
      )} />

      {/* Status indicator */}
      {isWaiting && (
        <div className="absolute top-4 right-4 animate-pulse">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
            <Clock className="h-3 w-3" />
            Chờ xác nhận
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
        <div className="flex items-center gap-4 min-w-0">
          {/* Avatar - Minimal Modern */}
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-offset-2 ring-offset-[#0E0E0E]",
            isOwe 
              ? "bg-gradient-to-br from-red-500 to-red-700 text-white ring-red-500/20"
              : "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white ring-emerald-500/20"
          )}>
            {counterpartName.split(' ').pop()?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-base truncate font-heading text-white tracking-tight">{counterpartName}</p>
            <p className="text-xs text-zinc-400 truncate flex items-center gap-1.5 mt-0.5 font-medium">
              <Beer className="h-3 w-3" /> {sessionName}
            </p>
          </div>
        </div>

        {/* Amount */}
        {!isWaiting && (
          <div className={cn(
            "text-right flex-shrink-0",
            isOwe ? "text-red-500" : "text-emerald-500"
          )}>
            <p className="text-xl font-bold font-mono tracking-tight">{formatCurrency(amount)}</p>
          </div>
        )}
      </div>

      {/* Quick Actions - Pill Buttons */}
      <div className="flex flex-wrap gap-2 relative z-10">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 h-9 rounded-full text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-white/5"
          onClick={copyToClipboard}
        >
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          Sao chép
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 h-9 rounded-full text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-white/5"
          onClick={shareReminder}
        >
          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
          Nhắc nợ
        </Button>
        
        {type === 'owe' && canShowPayQr && onShowPayQr && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-9 rounded-full text-xs font-medium border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50"
            onClick={onShowPayQr}
          >
            <QrCode className="h-3.5 w-3.5 mr-1.5" />
            QR
          </Button>
        )}
        
        {/* Action button based on type and status */}
        {isOwe && isPending && (
          <Button
            size="sm"
            className="flex-1 h-9 rounded-full text-xs font-bold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-900/20 border-0"
            onClick={onSettle}
            disabled={isSettling}
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Đã trả
          </Button>
        )}
        {!isOwe && isWaiting && (
          <Button
            size="sm"
            className="flex-1 h-9 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-900/20 border-0"
            onClick={onSettle}
            disabled={isSettling}
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Xác nhận
          </Button>
        )}
        {/* Guest debt - can settle directly without waiting for request */}
        {!isOwe && isPending && isGuest && onSettleGuest && (
          <Button
            size="sm"
            className="flex-1 h-9 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-900/20 border-0"
            onClick={onSettleGuest}
            disabled={isSettling}
            title="Khách ngoài nhóm - tất toán trực tiếp"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Tất toán
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
  const [qrModal, setQrModal] = useState<{ open: boolean; amount: string; note: string }>({
    open: false,
    amount: '',
    note: '',
  })
  const [payToModal, setPayToModal] = useState<{
    open: boolean
    name: string
    bankName?: string | null
    accountNumber?: string | null
    accountHolder?: string | null
    qrImageUrl?: string | null
  }>({ open: false, name: '' })

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
    
    const netMap = new Map<string, { name: string; amount: string }>()
    
    // I owe them (+)
    debts.i_owe.forEach(debt => {
      const current = netMap.get(debt.counterpart_id) || { name: debt.counterpart_name, amount: '0' }
      current.amount = addMoney(current.amount, debt.amount)
      netMap.set(debt.counterpart_id, current)
    })
    
    // They owe me (-)
    debts.owed_to_me.forEach(debt => {
      const current = netMap.get(debt.counterpart_id) || { name: debt.counterpart_name, amount: '0' }
      current.amount = subtractMoney(current.amount, debt.amount)
      netMap.set(debt.counterpart_id, current)
    })
    
    // Convert to array and filter out zero balances
    return Array.from(netMap.entries())
      .map(([id, data]) => ({
        counterpartId: id,
        counterpartName: data.name,
        netAmount: data.amount
      }))
      .filter(d => compareMoney(absMoney(d.netAmount), '0.01') > 0)
      .sort((a, b) => compareMoney(absMoney(b.netAmount), absMoney(a.netAmount)))
  }, [debts])

  const totalNetIOwe = sumMoney(nettedDebts.filter(d => compareMoney(d.netAmount, '0') > 0).map(d => d.netAmount))
  const totalNetOwedToMe = sumMoney(nettedDebts.filter(d => compareMoney(d.netAmount, '0') < 0).map(d => absMoney(d.netAmount)))

  const requestSettle = useMutation({
    mutationFn: async (debtId: string) => {
      await api.post(`/debts/${debtId}/request-settle`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
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
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Đã xác nhận thanh toán!')
    },
    onError: () => {
      toast.error('Có lỗi xảy ra')
    },
  })

  const settleGuestDebt = useMutation({
    mutationFn: async (debtId: string) => {
      await api.post(`/debts/${debtId}/settle-guest`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Đã tất toán nợ từ khách!')
    },
    onError: (error: unknown) => {
      showError(error, 'Không thể tất toán nợ. Vui lòng thử lại.')
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
      {/* Page Header */}
      <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Công nợ của tôi</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-xl border border-white/5 w-fit">
        <button
          onClick={() => setActiveTab('sessions')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all",
            activeTab === 'sessions'
              ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-900/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Users className="h-4 w-4" />
          Theo cuộc nhậu
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all",
            activeTab === 'summary'
              ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-900/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Wallet className="h-4 w-4" />
          Tổng hợp
        </button>
      </div>

      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {sessionDebts?.length === 0 ? (
            <Card className="bg-card dark:bg-card/50 border-white/5">
              <CardContent className="py-12 text-center">
                <Beer className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Chưa có dữ liệu công nợ</p>
                <p className="text-sm text-gray-500 mt-1">Tham gia cuộc nhậu và thêm hoá đơn để bắt đầu</p>
              </CardContent>
            </Card>
          ) : (
            sessionDebts?.map((session) => {
              // Calculate session totals
              const totalPaid = sumMoney(session.participants.map((p) => p.total_paid))
              
              return (
                <FunTooltip key={session.session_id} messages={FUN_MESSAGES.sessionCard}>
                  <Card className="overflow-hidden bg-zinc-900 border-white/5 hover:border-orange-500/30 transition-all shadow-md group">
                    <CardHeader className="pb-4 bg-gradient-to-br from-zinc-800/50 to-transparent border-b border-white/5">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg text-white font-heading">
                            <Beer className="h-5 w-5 text-orange-500" /> {session.session_name}
                          </CardTitle>
                          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2 font-medium">
                            <Calendar className="h-3.5 w-3.5" /> 
                            {new Date(session.session_date).toLocaleDateString('vi-VN', { 
                              weekday: 'short', day: '2-digit', month: '2-digit' 
                            })}
                            <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                            <Users className="h-3.5 w-3.5" />
                            {session.participants.length} người
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Tổng chi</p>
                           <span className="text-base font-bold font-mono text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">
                            {formatCurrency(totalPaid)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 bg-zinc-900/50">
                      {/* Mobile-friendly card grid */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        {session.participants.map((p) => {
                          const isPositive = compareMoney(p.balance, '0') > 0
                          const isNegative = compareMoney(p.balance, '0') < 0
                          
                          return (
                            <div 
                              key={p.participant_id} 
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all hover:bg-zinc-800",
                                isPositive && "bg-emerald-500/5 border-emerald-500/10",
                                isNegative && "bg-red-500/5 border-red-500/10",
                                !isPositive && !isNegative && "bg-zinc-900 border-white/5"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                  "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-offset-1 ring-offset-[#0E0E0E]",
                                  isPositive && "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white ring-emerald-500/20",
                                  isNegative && "bg-gradient-to-br from-red-500 to-red-700 text-white ring-red-500/20",
                                  !isPositive && !isNegative && "bg-zinc-800 text-zinc-400 ring-white/5"
                                )}>
                                  {p.name.split(' ').pop()?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate text-zinc-200">{p.name}</p>
                                  <p className="text-[11px] text-zinc-500">
                                    Trả: {formatCurrency(p.total_paid)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right flex-shrink-0">
                                <p className={cn(
                                  "font-bold text-sm font-mono tracking-tight",
                                  isPositive && "text-emerald-500",
                                  isNegative && "text-red-500",
                                  !isPositive && !isNegative && "text-zinc-500"
                                )}>
                                  {isPositive && '+'}
                                  {formatCurrency(p.balance)}
                                </p>
                                <p className="text-[10px] uppercase font-bold tracking-wider mt-0.5 opacity-80">
                                  {isPositive ? <span className="text-emerald-600">Được nhận</span> : isNegative ? <span className="text-red-600">Cần trả</span> : <span className="text-zinc-600">Huề</span>}
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
            <Card className="overflow-hidden border-orange-500/20 bg-zinc-900/50">
              <CardHeader className="pb-2 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-b border-orange-500/10">
                <button
                  onClick={() => setIsNettingExpanded(!isNettingExpanded)}
                  className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                  <CardTitle className="text-lg flex items-center gap-2 font-heading text-white">
                    <div className="p-2 rounded-lg bg-orange-500/10 ring-1 ring-orange-500/20">
                      <Zap className="h-4 w-4 text-orange-500" />
                    </div>
                    Cấn trừ nợ thông minh
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono bg-black/40 text-orange-400 px-2.5 py-1 rounded-lg border border-orange-500/20 shadow-sm">
                      {nettedDebts.length} giao dịch tối ưu
                    </span>
                    {isNettingExpanded ? (
                      <ChevronUp className="h-5 w-5 text-zinc-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-zinc-400" />
                    )}
                  </div>
                </button>
              </CardHeader>
              
              {isNettingExpanded && (
                <CardContent className="pt-4 space-y-4">
                  {/* Info banner */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                    <TrendingUp className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-400 font-body leading-relaxed">
                      Hệ thống đã tự động tính toán bù trừ các khoản nợ. 
                      <span className="text-orange-400 font-medium block mt-1"> Bạn chỉ cần thanh toán số tiền thực tế này thay vì nhiều giao dịch nhỏ lẻ.</span>
                    </p>
                  </div>

                  {/* Optimized debts list with visual flow */}
                  <div className="space-y-3">
                    {nettedDebts.map((debt, index) => (
                      <div
                        key={debt.counterpartId}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all hover:bg-zinc-800/80 animate-in slide-in-from-bottom-2",
                          compareMoney(debt.netAmount, '0') > 0
                            ? "bg-red-500/5 border-red-500/20" 
                            : "bg-emerald-500/5 border-emerald-500/20"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm font-body ring-2 ring-offset-2 ring-offset-[#0E0E0E]",
                            compareMoney(debt.netAmount, '0') > 0
                              ? "bg-gradient-to-br from-red-500 to-red-700 text-white ring-red-500/20" 
                              : "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white ring-emerald-500/20"
                          )}>
                            {debt.counterpartName.split(' ').pop()?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm font-heading text-white">{debt.counterpartName}</p>
                            <p className="text-xs text-zinc-400 font-body mt-0.5">
                              {compareMoney(debt.netAmount, '0') > 0 ? (
                                <span className="flex items-center gap-1.5">
                                  <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                                  Bạn cần trả
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5">
                                  <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />
                                  Họ cần trả bạn
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className={cn(
                            "text-lg font-bold font-mono tracking-tight block",
                            compareMoney(debt.netAmount, '0') > 0 ? "text-red-500" : "text-emerald-500"
                          )}>
                            {formatCurrency(absMoney(debt.netAmount))}
                          </span>
                          
                          <div className="mt-2 flex justify-end">
                            {/* Settlement action for netted debts */}
                            {compareMoney(debt.netAmount, '0') > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] rounded-full px-3 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50"
                                onClick={() => {
                                  const relatedDebts = debts?.i_owe.filter(
                                    d => d.counterpart_id === debt.counterpartId && d.status === 'pending'
                                  ) || []
                                  relatedDebts.forEach(d => requestSettle.mutate(d.id))
                                }}
                                disabled={requestSettle.isPending}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Đã trả
                              </Button>
                            ) : (
                              (() => {
                                const relatedDebts = debts?.owed_to_me.filter(
                                  d => d.counterpart_id === debt.counterpartId
                                ) || []
                                const pendingDebts = relatedDebts.filter(d => d.status === 'pending')
                                const waitingDebts = relatedDebts.filter(d => d.status === 'settlement_requested')
                                const guestDebts = pendingDebts.filter(d => d.is_guest)
                                
                                return (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[10px] rounded-full px-3 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/50"
                                      onClick={() => {
                                        setQrModal({
                                          open: true,
                                          amount: absMoney(debt.netAmount, 'VND'),
                                          note: `Thanh toan no - ${debt.counterpartName}`,
                                        })
                                      }}
                                    >
                                      <QrCode className="h-3 w-3 mr-1" />
                                      VietQR
                                    </Button>
                                    {waitingDebts.length > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] rounded-full px-3 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/50 animate-pulse"
                                        onClick={() => {
                                          waitingDebts.forEach(d => confirmSettle.mutate(d.id))
                                        }}
                                        disabled={confirmSettle.isPending}
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Xác nhận ({waitingDebts.length})
                                      </Button>
                                    )}
                                    {guestDebts.length > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] rounded-full px-3 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/50"
                                        onClick={() => {
                                          guestDebts.forEach(d => settleGuestDebt.mutate(d.id))
                                        }}
                                        disabled={settleGuestDebt.isPending}
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Khách
                                      </Button>
                                    )}
                                  </div>
                                )
                              })()
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary with visual comparison */}
                  <div className="pt-4 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                        <p className="text-xs uppercase tracking-widest text-red-400/70 font-bold mb-2">Tổng cần trả</p>
                        <p className="text-2xl font-bold font-mono text-red-500 tracking-tight">
                          {formatCurrency(totalNetIOwe)}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <p className="text-xs uppercase tracking-widest text-emerald-400/70 font-bold mb-2">Tổng được nhận</p>
                        <p className="text-2xl font-bold font-mono text-emerald-500 tracking-tight">
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
            <Card className="bg-zinc-900/50 border-white/5 hover:border-red-500/20 transition-colors group">
              <CardContent className="flex items-center gap-5 p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 group-hover:bg-red-500/20 transition-colors">
                  <Wallet className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Tổng nợ (gốc)</p>
                  <p className="text-3xl font-bold text-red-500 tracking-tighter">
                    {debts ? formatCurrency(debts.total_i_owe) : '0đ'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-white/5 hover:border-emerald-500/20 transition-colors group">
              <CardContent className="flex items-center gap-5 p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                  <Wallet className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Được nợ (gốc)</p>
                  <p className="text-3xl font-bold text-emerald-500 tracking-tighter">
                    {debts ? formatCurrency(debts.total_owed_to_me) : '0đ'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Debts I Owe - Mobile Optimized Cards */}
          <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-500">
            <ArrowUpRight className="h-5 w-5" />
            Tôi cần trả
          </h2>
          {debts && debts.i_owe.length > 0 && (
            <span className="text-sm text-muted-foreground">{debts.i_owe.length} khoản</span>
          )}
        </div>
        
        {debts?.i_owe.length === 0 ? (
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="py-8 text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="text-green-500 font-medium">Bạn không nợ ai!</p>
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
                  isGuest={debt.is_guest}
                  canShowPayQr={
                    !!debt.counterpart_qr_image_url ||
                    (!!debt.counterpart_bank_name && !!debt.counterpart_account_number)
                  }
                  onShowPayQr={() =>
                    setPayToModal({
                      open: true,
                      name: debt.counterpart_name,
                      bankName: debt.counterpart_bank_name,
                      accountNumber: debt.counterpart_account_number,
                      accountHolder: debt.counterpart_account_holder_name,
                      qrImageUrl: debt.counterpart_qr_image_url,
                    })
                  }
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
          <h2 className="flex items-center gap-2 text-lg font-semibold text-green-500">
            <ArrowDownRight className="h-5 w-5" />
            Được nhận lại
          </h2>
          {debts && debts.owed_to_me.length > 0 && (
            <span className="text-sm text-muted-foreground">{debts.owed_to_me.length} khoản</span>
          )}
        </div>

        {debts?.owed_to_me.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
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
                  isGuest={debt.is_guest}
                  onSettle={() => confirmSettle.mutate(debt.id)}
                  onSettleGuest={() => settleGuestDebt.mutate(debt.id)}
                  isSettling={confirmSettle.isPending || settleGuestDebt.isPending}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
        </>
      )}

      {/* VietQR Modal */}
      <ResponsiveModal
        isOpen={qrModal.open}
        onClose={() => setQrModal({ open: false, amount: '', note: '' })}
        title="VietQR"
        desktopClassName="max-w-3xl"
      >
        <QRCodeGenerator initialAmount={qrModal.amount} initialNote={qrModal.note} />
      </ResponsiveModal>

      {/* Pay-to Modal (show counterpart uploaded QR / bank info) */}
      <ResponsiveModal
        isOpen={payToModal.open}
        onClose={() => setPayToModal({ open: false, name: '' })}
        title={`Trả cho ${payToModal.name}`}
        desktopClassName="max-w-xl"
      >
        <div className="space-y-3">
          {payToModal.qrImageUrl ? (
            <div className="rounded-lg border p-3 bg-white">
              <img
                src={payToModal.qrImageUrl}
                alt="Bank QR"
                className="w-full h-64 object-contain"
              />
            </div>
          ) : (
            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              Người này chưa upload ảnh QR ngân hàng. Bạn có thể chuyển khoản thủ công theo thông tin bên dưới (nếu có).
            </div>
          )}

          {(payToModal.bankName || payToModal.accountNumber || payToModal.accountHolder) && (
            <div className="text-sm">
              {payToModal.bankName && (
                <p>
                  <span className="font-medium">Ngân hàng:</span> {payToModal.bankName}
                </p>
              )}
              {payToModal.accountNumber && (
                <p>
                  <span className="font-medium">Số TK:</span> {payToModal.accountNumber}
                </p>
              )}
              {payToModal.accountHolder && (
                <p>
                  <span className="font-medium">Chủ TK:</span> {payToModal.accountHolder}
                </p>
              )}
            </div>
          )}
        </div>
      </ResponsiveModal>
    </div>
  )
}
