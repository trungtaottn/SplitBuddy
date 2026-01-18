import { useCallback, useRef, useState } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { SwipeActions } from '@/components/ui/SwipeActions'
import { haptics } from '@/utils/haptics'
import { Trash2, Download, Banknote, Users, Pencil } from 'lucide-react'
import { formatCurrency } from '@/utils/formatCurrency'
import type { Bill, ExpenseCategory } from '@/types/api'

interface BillListProps {
    bills: Bill[]
    onEdit: (bill: Bill) => void
    onDelete: (billId: string) => void
    deletingBillId: string | null
    categoriesById: Record<string, ExpenseCategory>
    baseCurrency: string
}

export function BillList({ bills, onEdit, onDelete, deletingBillId, categoriesById, baseCurrency }: BillListProps) {
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)
    const longPressTimer = useRef<number | null>(null)
    const pressStart = useRef<{ x: number; y: number } | null>(null)

    const openQuickActions = useCallback((bill: Bill) => {
        setSelectedBill(bill)
        setIsQuickActionsOpen(true)
    }, [])

    const closeQuickActions = useCallback(() => {
        setIsQuickActionsOpen(false)
        setSelectedBill(null)
    }, [])

    const cancelLongPress = useCallback(() => {
        if (longPressTimer.current) {
            window.clearTimeout(longPressTimer.current)
            longPressTimer.current = null
        }
        pressStart.current = null
    }, [])

    const startLongPress = useCallback((bill: Bill, target: EventTarget | null, point: { x: number; y: number }) => {
        const element = target as HTMLElement | null
        if (element?.closest('button, a, input, textarea, select')) {
            return
        }
        pressStart.current = point
        longPressTimer.current = window.setTimeout(() => {
            haptics.medium()
            openQuickActions(bill)
        }, 550)
    }, [openQuickActions])

    const handlePressMove = useCallback((point: { x: number; y: number }) => {
        if (!pressStart.current) return
        const dx = Math.abs(point.x - pressStart.current.x)
        const dy = Math.abs(point.y - pressStart.current.y)
        if (dx > 12 || dy > 12) {
            cancelLongPress()
        }
    }, [cancelLongPress])

    if (bills.length === 0) {
        return (
            <Card className="bg-zinc-900 border-white/5">
                <CardContent className="py-12 text-center">
                    <Banknote className="h-12 w-12 mx-auto mb-3 text-orange-500/50" />
                    <p className="text-white font-medium">Chưa có hoá đơn nào</p>
                    <p className="text-sm text-zinc-400 mt-1">Thêm hoá đơn đầu tiên để bắt đầu chia tiền</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div style={{ height: '600px', width: '100%' }}>
            <Virtuoso
                data={bills}
                itemContent={(_, bill) => (
                    <div className="pb-2">
                        <SwipeActions
                            leftActions={[
                                {
                                    icon: <Pencil className="h-4 w-4" />,
                                    label: 'Sửa',
                                    onClick: () => onEdit(bill),
                                    color: 'blue',
                                },
                            ]}
                            rightActions={[
                                {
                                    icon: <Trash2 className="h-4 w-4" />,
                                    label: deletingBillId === bill.id ? 'Xác nhận' : 'Xóa',
                                    onClick: () => onDelete(bill.id),
                                    color: 'red',
                                },
                            ]}
                        >
                            <div
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    openQuickActions(bill)
                                }}
                                onMouseDown={(e) => startLongPress(bill, e.target, { x: e.clientX, y: e.clientY })}
                                onMouseUp={cancelLongPress}
                                onMouseLeave={cancelLongPress}
                                onTouchStart={(e) =>
                                    startLongPress(bill, e.target, {
                                        x: e.touches[0].clientX,
                                        y: e.touches[0].clientY,
                                    })
                                }
                                onTouchMove={(e) =>
                                    handlePressMove({
                                        x: e.touches[0].clientX,
                                        y: e.touches[0].clientY,
                                    })
                                }
                                onTouchEnd={cancelLongPress}
                            >
                                <Card className="bg-zinc-900 border-white/5 hover:border-orange-500/30 transition-all group">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">🧾</span>
                                                <div>
                                                    <p className="font-medium text-white">{bill.description}</p>
                                                    <p className="text-sm text-zinc-400">
                                                        {new Date(bill.created_at).toLocaleDateString('vi-VN')}
                                                    </p>
                                                    {bill.category_id && categoriesById[bill.category_id] && (
                                                        <div className="mt-1">
                                                            <span
                                                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                                                                style={
                                                                    categoriesById[bill.category_id]?.color
                                                                        ? {
                                                                            borderColor: categoriesById[bill.category_id].color!,
                                                                            color: categoriesById[bill.category_id].color!,
                                                                        }
                                                                        : undefined
                                                                }
                                                            >
                                                                <span>{categoriesById[bill.category_id].icon || '🏷️'}</span>
                                                                <span>{categoriesById[bill.category_id].name}</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-orange-500">
                                                        {formatCurrency(bill.amount, baseCurrency)}
                                                    </p>
                                                    {bill.currency_code && bill.currency_code !== baseCurrency && (
                                                        <p className="text-xs text-zinc-400">
                                                            {formatCurrency(bill.amount_original, bill.currency_code)}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onEdit(bill)}
                                                    className="hover:bg-orange-500/10 hover:text-orange-500"
                                                >
                                                    ✏️
                                                </Button>
                                                {deletingBillId === bill.id ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => onDelete(bill.id)}
                                                            disabled={false}
                                                        >
                                                            Xóa
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => onDelete('')}
                                                        >
                                                            Hủy
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onDelete(bill.id)}
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Receipt Image */}
                                        {bill.receipt_url && (
                                            <div className="relative group">
                                                <img
                                                    src={bill.receipt_url}
                                                    alt="Receipt"
                                                    className="w-full max-h-64 object-contain rounded-lg border-2 border-primary/20 cursor-pointer hover:border-primary/40 transition-colors"
                                                    onClick={() => window.open(bill.receipt_url!, '_blank')}
                                                />
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => window.open(bill.receipt_url!, '_blank')}
                                                        className="bg-black/50 text-white hover:bg-black/70"
                                                    >
                                                        <Download className="h-3 w-3 mr-1" />
                                                        Xem
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Payer info */}
                                        {bill.payers && bill.payers.length > 0 && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-emerald-500 flex items-center gap-1"><Banknote className="h-4 w-4" /> Người trả:</span>
                                                <span className="font-medium text-white">
                                                    {bill.payers.map(p => p.name).join(', ')}
                                                </span>
                                            </div>
                                        )}

                                        {/* Participants info */}
                                        {bill.participants && bill.participants.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                                <span className="text-blue-400 flex items-center gap-1"><Users className="h-4 w-4" /> Chia cho:</span>
                                                <span className="font-medium text-zinc-300">
                                                    {bill.participants.map(p => p.name).join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </SwipeActions>
                    </div>
                )}
            />

            <BottomSheet
                isOpen={isQuickActionsOpen}
                onClose={closeQuickActions}
                title="Thao tác nhanh"
            >
                {selectedBill && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Hóa đơn</p>
                            <p className="font-medium">{selectedBill.description}</p>
                            <p className="text-sm text-muted-foreground">
                                {formatCurrency(selectedBill.amount, baseCurrency)}
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    onEdit(selectedBill)
                                    closeQuickActions()
                                }}
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Sửa hóa đơn
                            </Button>

                            {selectedBill.receipt_url && (
                                <Button
                                    variant="secondary"
                                    onClick={() => window.open(selectedBill.receipt_url!, '_blank')}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Xem ảnh hoá đơn
                                </Button>
                            )}

                            <Button
                                variant="destructive"
                                onClick={() => {
                                    onDelete(selectedBill.id)
                                    closeQuickActions()
                                }}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deletingBillId === selectedBill.id ? 'Xác nhận xóa' : 'Xóa hóa đơn'}
                            </Button>

                            {deletingBillId === selectedBill.id && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        onDelete('')
                                        closeQuickActions()
                                    }}
                                >
                                    Hủy xóa
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </BottomSheet>
        </div>
    )
}
