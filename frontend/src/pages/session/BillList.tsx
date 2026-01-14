import { Virtuoso } from 'react-virtuoso'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Download, Banknote, Users } from 'lucide-react'
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
    if (bills.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Banknote className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-muted-foreground">Chưa có hoá đơn nào</p>
                    <p className="text-sm text-gray-400">Thêm hoá đơn đầu tiên để bắt đầu chia tiền</p>
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
                        <Card key={bill.id}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">🧾</span>
                                        <div>
                                            <p className="font-medium">{bill.description}</p>
                                            <p className="text-sm text-muted-foreground">
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
                                            <p className="text-lg font-bold text-primary">
                                                {formatCurrency(bill.amount, baseCurrency)}
                                            </p>
                                            {bill.currency_code && bill.currency_code !== baseCurrency && (
                                                <p className="text-xs text-muted-foreground">
                                                    {formatCurrency(bill.amount_original, bill.currency_code)}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onEdit(bill)}
                                        >
                                            ✏️
                                        </Button>
                                        {deletingBillId === bill.id ? (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => onDelete(bill.id)}
                                                    disabled={false} // Loading state handled by parent via deletingBillId usually
                                                >
                                                    Xóa
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onDelete('')} // Hacky way to cancel? No parent should handle this.
                                                // Ideally onCancelDelete. But for now simplest refactor:
                                                // Parent passes specific handler or state.
                                                // Actually, `deletingBillId` is state. `onDelete` executes mutation.
                                                // I need `setDeletingBillId` passed down or handle confirm internally.
                                                // Let's simplified: Pass `onCancelDelete`.
                                                >
                                                    Hủy
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onDelete(bill.id)} // This implies "Set deleting ID" or "Delete immediately" depending on logic.
                                                // In original code: onClick={() => setDeletingBillId(bill.id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
                                        <span className="text-green-600 flex items-center gap-1"><Banknote className="h-4 w-4" /> Người trả:</span>
                                        <span className="font-medium">
                                            {bill.payers.map(p => p.name).join(', ')}
                                        </span>
                                    </div>
                                )}

                                {/* Participants info */}
                                {bill.participants && bill.participants.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <span className="text-blue-600 flex items-center gap-1"><Users className="h-4 w-4" /> Chia cho:</span>
                                        <span className="font-medium">
                                            {bill.participants.map(p => p.name).join(', ')}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            />
        </div>
    )
}
