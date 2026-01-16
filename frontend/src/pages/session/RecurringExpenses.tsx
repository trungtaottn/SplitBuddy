import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { formatCurrency } from '@/utils/formatCurrency'
import type { RecurringExpense, RecurringException } from '@/types/api'

interface RecurringExpensesProps {
  sessionId: string
  baseCurrency: string
  isOwner: boolean
  isArchived: boolean
  isClosed: boolean
}

const frequencyLabel = (frequency: RecurringExpense['frequency'], interval: number) => {
  const count = interval || 1
  switch (frequency) {
    case 'DAILY':
      return count === 1 ? 'Hàng ngày' : `Mỗi ${count} ngày`
    case 'WEEKLY':
      return count === 1 ? 'Hàng tuần' : `Mỗi ${count} tuần`
    case 'MONTHLY':
      return count === 1 ? 'Hàng tháng' : `Mỗi ${count} tháng`
    default:
      return 'Định kỳ'
  }
}

interface RecurringExpenseCardProps {
  item: RecurringExpense
  sessionId: string
  baseCurrency: string
  actionsDisabled: boolean
}

function RecurringExpenseCard({
  item,
  sessionId,
  baseCurrency,
  actionsDisabled,
}: RecurringExpenseCardProps) {
  const queryClient = useQueryClient()
  const [exceptionDate, setExceptionDate] = useState('')

  const { data: exceptions = [], isLoading: exceptionsLoading } = useQuery<RecurringException[]>({
    queryKey: ['recurring-exceptions', sessionId, item.id],
    queryFn: () => api.recurring.listExceptions(sessionId, item.id),
    enabled: !!sessionId && !!item.id,
  })

  const addException = useMutation({
    mutationFn: () =>
      api.recurring.addException(sessionId, item.id, {
        date: exceptionDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-exceptions', sessionId, item.id] })
      setExceptionDate('')
      toast.success('Đã thêm ngày bỏ qua')
    },
    onError: (error: any) => {
      toast.error('Không thể thêm ngoại lệ: ' + (error.response?.data?.message || error.message))
    },
  })

  const removeException = useMutation({
    mutationFn: (date: string) => api.recurring.removeException(sessionId, item.id, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-exceptions', sessionId, item.id] })
      toast.success('Đã xóa ngày bỏ qua')
    },
    onError: (error: any) => {
      toast.error('Không thể xóa ngoại lệ: ' + (error.response?.data?.message || error.message))
    },
  })

  const pauseRecurring = useMutation({
    mutationFn: (recurringId: string) => api.recurring.pause(sessionId, recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', sessionId] })
      toast.success('Đã tạm dừng lịch định kỳ')
    },
    onError: (error: any) => {
      toast.error('Không thể tạm dừng: ' + (error.response?.data?.message || error.message))
    },
  })

  const resumeRecurring = useMutation({
    mutationFn: (recurringId: string) => api.recurring.resume(sessionId, recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', sessionId] })
      toast.success('Đã tiếp tục lịch định kỳ')
    },
    onError: (error: any) => {
      toast.error('Không thể tiếp tục: ' + (error.response?.data?.message || error.message))
    },
  })

  const skipRecurring = useMutation({
    mutationFn: (recurringId: string) => api.recurring.skip(sessionId, recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses', sessionId] })
      toast.success('Đã bỏ qua kỳ tiếp theo')
    },
    onError: (error: any) => {
      toast.error('Không thể bỏ qua: ' + (error.response?.data?.message || error.message))
    },
  })

  const nextRun = new Date(item.next_run).toLocaleString('vi-VN')
  const lastRun = item.last_run ? new Date(item.last_run).toLocaleString('vi-VN') : 'Chưa chạy'
  const isPausing = pauseRecurring.isPending && pauseRecurring.variables === item.id
  const isResuming = resumeRecurring.isPending && resumeRecurring.variables === item.id
  const isSkipping = skipRecurring.isPending && skipRecurring.variables === item.id

  return (
    <Card className="bg-zinc-900 border-white/5 hover:border-orange-500/30 transition-all group">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{item.name}</p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  item.is_active
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    : 'border-gray-200 text-gray-600 bg-gray-100'
                }`}
              >
                {item.is_active ? 'Đang chạy' : 'Đã tạm dừng'}
              </span>
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {frequencyLabel(item.frequency, item.interval_count)} • {item.split_strategy}
            </p>
            <p className="text-xs text-muted-foreground">
              Lần chạy tiếp: {nextRun} ({item.timezone})
            </p>
            <p className="text-xs text-muted-foreground">Lần chạy gần nhất: {lastRun}</p>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold text-primary">
              {formatCurrency(item.amount, baseCurrency)}
            </p>
            {item.currency_code !== baseCurrency && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(item.amount, item.currency_code)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.is_active ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => skipRecurring.mutate(item.id)}
                disabled={actionsDisabled || isSkipping}
              >
                {isSkipping ? 'Đang bỏ qua...' : 'Bỏ qua kỳ tới'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => pauseRecurring.mutate(item.id)}
                disabled={actionsDisabled || isPausing}
              >
                {isPausing ? 'Đang tạm dừng...' : 'Tạm dừng'}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => resumeRecurring.mutate(item.id)}
              disabled={actionsDisabled || isResuming}
            >
              {isResuming ? 'Đang tiếp tục...' : 'Tiếp tục'}
            </Button>
          )}
        </div>

        <div className="rounded-md border border-dashed p-3 space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Ngoại lệ (bỏ qua ngày)</span>
            {exceptionsLoading && <span className="text-xs text-muted-foreground">Đang tải...</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={exceptionDate}
              onChange={(e) => setExceptionDate(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              disabled={actionsDisabled}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => addException.mutate()}
              disabled={actionsDisabled || !exceptionDate || addException.isPending}
            >
              {addException.isPending ? 'Đang thêm...' : 'Thêm ngoại lệ'}
            </Button>
          </div>
          {exceptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {exceptions.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className="text-xs rounded-full border px-2 py-1 hover:border-primary hover:text-primary"
                  onClick={() => removeException.mutate(ex.date)}
                  disabled={actionsDisabled || removeException.isPending}
                >
                  {new Date(ex.date).toLocaleDateString('vi-VN')} ✕
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Chưa có ngày bỏ qua.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function RecurringExpenses({
  sessionId,
  baseCurrency,
  isOwner,
  isArchived,
  isClosed,
}: RecurringExpensesProps) {
  const { data: recurring = [], isLoading } = useQuery<RecurringExpense[]>({
    queryKey: ['recurring-expenses', sessionId],
    queryFn: () => api.recurring.list(sessionId),
    enabled: !!sessionId,
  })

  if (isLoading) {
    return <div className="text-center py-8">Đang tải lịch định kỳ...</div>
  }

    if (recurring.length === 0) {
        return (
            <Card className="bg-zinc-900 border-white/5">
                <CardContent className="py-12 text-center">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-white font-medium">Chưa có chi tiêu định kỳ</p>
                    <p className="text-sm text-zinc-400 mt-1">
                        Tạo lịch định kỳ để tự động ghi nhận các khoản chi lặp lại
                    </p>
                </CardContent>
            </Card>
        )
    }

  const actionsDisabled = !isOwner || isArchived || isClosed

  return (
    <div className="space-y-4">
      {recurring.map((item) => (
        <RecurringExpenseCard
          key={item.id}
          item={item}
          sessionId={sessionId}
          baseCurrency={baseCurrency}
          actionsDisabled={actionsDisabled}
        />
      ))}
    </div>
  )
}
