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
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    Chưa có hoá đơn nào. Thêm hoá đơn để xem chia tiền.
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                        Chia tiền ({session.participants.length} người)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="rounded-lg bg-primary/10 p-4 text-center">
                            <p className="text-sm text-muted-foreground">Tổng tiền cuộc nhậu</p>
                            <p className="text-2xl font-bold text-primary">
                                {formatCurrency(session.total_amount, session.base_currency)}
                            </p>
                        </div>

                        <div className="rounded-lg border p-4">
                            <p className="mb-3 text-sm font-medium text-muted-foreground">Chi tiết mỗi người:</p>
                            <div className="space-y-2">
                                {session.participants.map((p) => {
                                    const data = participantTotals[p.id] || { owed: 0, paid: 0 }
                                    return (
                                        <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <span>{p.user_id ? '' : '👻'}</span>
                                                <span className="font-medium">{p.display_name}</span>
                                            </div>
                                            <div className="text-right">
                                                {data.owed > 0 ? (
                                                    <span className="font-bold text-primary">
                                                        {formatCurrency(data.owed, session.base_currency)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
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
            <Button onClick={() => navigate('/debts')} variant="outline" className="w-full">
                Xem tổng hợp công nợ tất cả cuộc nhậu
            </Button>
        </div>
    )
}
