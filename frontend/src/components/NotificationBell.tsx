import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import { isRateLimitError } from '@/utils/errorHandler'


export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.notifications.getUnreadCount(),
    refetchInterval: 30000,
    retry: (failureCount, error: unknown) => {
        if (isRateLimitError(error)) return false
        return failureCount < 2
    },
  })

  const unread = data?.count || 0

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return
      const el = containerRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label="Thông báo"
        className="relative"
      >
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 z-50">
          <NotificationDropdown onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
