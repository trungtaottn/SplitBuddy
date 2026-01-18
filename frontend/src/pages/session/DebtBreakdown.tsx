import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/utils/formatCurrency'
import type { SessionDetail, Bill } from '@/types/api'
import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'

interface DebtBreakdownProps {
    session: SessionDetail
    bills: Bill[]
}

export function DebtBreakdown({ session, bills }: DebtBreakdownProps) {
    const navigate = useNavigate()

    const participantTotals = useMemo(() => {
        const totals: Record<string, { name: string; owed: number; paid: number }> = {}

        // Initialize all participants
        session.participants.forEach((p) => {
            totals[p.id] = { name: p.display_name, owed: 0, paid: 0 }
        })

        // Sum up actual amounts from bills
        bills.forEach((bill) => {
            // Add amounts owed from bill splits
            bill.participants?.forEach((bp) => {
                if (totals[bp.participant_id]) {
                    totals[bp.participant_id].owed += parseFloat(bp.amount_owed) || 0
                }
            })
            // Add amounts paid
            bill.payers?.forEach((payer) => {
                if (totals[payer.participant_id]) {
                    totals[payer.participant_id].paid += parseFloat(payer.amount_paid) || 0
                }
            })
        })

        return totals
    }, [session, bills])

    if (!bills || bills.length === 0) {
        return (
            <Card className="bg-zinc-900 border-white/5">
                <CardContent className="py-12 text-center">
                    <div className="text-4xl mb-3">💰</div>
                    <p className="text-white font-medium">Chưa có hóa đơn nào</p>
                    <p className="text-sm text-zinc-400 mt-1">Thêm hóa đơn để xem chia tiền</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <Card className="bg-zinc-900 border-white/5">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white">
                        Chia tiền ({session.participants.length} người)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 p-4 text-center">
                            <p className="text-sm text-zinc-400">Tổng tiền cuộc nhậu</p>
                            <p className="text-2xl font-bold text-orange-500">
                                {formatCurrency(session.total_amount, session.base_currency)}
                            </p>
                        </div>

                        <div className="rounded-lg border border-white/5 bg-zinc-800/50 p-4">
                            <p className="mb-3 text-sm font-medium text-zinc-400">Chi tiết mỗi người:</p>
                            <div className="space-y-2">
                                {session.participants.map((p) => {
                                    const data = participantTotals[p.id] || { owed: 0, paid: 0 }
                                    return (
                                        <div key={p.id} className="flex items-center justify-between rounded-lg bg-zinc-900 border border-white/5 px-3 py-2 hover:border-orange-500/30 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span>{p.user_id ? '' : '👻'}</span>
                                                <span className="font-medium text-white">{p.display_name}</span>
                                            </div>
                                            <div className="text-right">
                                                {data.owed > 0 ? (
                                                    <span className="font-bold text-orange-500">
                                                        {formatCurrency(data.owed, session.base_currency)}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-500">-</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Button onClick={() => navigate('/debts')} variant="outline" className="w-full bg-zinc-900 border-white/5 hover:border-orange-500/50 hover:bg-zinc-800 text-white">
                Xem tổng hợp công nợ tất cả cuộc nhậu
            </Button>
        </div>
    )
}
