import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { showError } from '@/utils/errorHandler'
import { cn } from '@/lib/utils'
import type { NotificationItem } from '@/types/api'

function getNotificationSessionId(data: Record<string, unknown>): string | null {
  return typeof data.session_id === 'string' ? data.session_id : null
}

export function NotificationDropdown({
  onClose,
}: {
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api.notifications.list({ page: 1, limit: 20 }),
  })

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await api.notifications.markAsRead(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (e: unknown) => showError(e, 'Không thể đánh dấu đã đọc.'),
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.notifications.markAllAsRead()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Đã đánh dấu tất cả là đã đọc')
    },
    onError: (e: unknown) => showError(e, 'Không thể đánh dấu tất cả đã đọc.'),
  })

  const items: NotificationItem[] = data?.notifications || []

  return (
    <Card className="w-[360px] max-w-[90vw] shadow-lg">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Thông báo</p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Đọc hết
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Không có thông báo</div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
            {items.map((n) => (
              <button
                key={n.id}
                className={cn(
                  'w-full text-left rounded-lg border p-3 transition-colors',
                  n.is_read ? 'bg-transparent hover:bg-accent/20' : 'bg-primary/5 border-primary/20 hover:bg-primary/10',
                )}
                onClick={() => {
                  if (!n.is_read) markAsRead.mutate(n.id)
                  
                  // Deep linking
                  if (n.data && typeof n.data === 'object') {
                      const sessionId = getNotificationSessionId(n.data)
                      if (n.type === 'settlement_confirmed' && sessionId) {
                          navigate(`/session/${sessionId}?tab=debts`)
                          onClose()
                      } else if (n.type === 'session_invite' && sessionId) {
                          navigate(`/session/${sessionId}`)
                          onClose()
                      }
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{n.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  {!n.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
