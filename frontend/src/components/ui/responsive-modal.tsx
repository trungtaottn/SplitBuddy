import { useEffect, useRef, ReactNode } from 'react'
import { X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ResponsiveModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  /** @deprecated use className instead */
  desktopClassName?: string
  /** @deprecated use className instead */
  sheetClassName?: string
  showHandle?: boolean
}

/**
 * ResponsiveModal - Modal luôn căn giữa viewport (không phụ thuộc scroll)
 * - Dùng `position: fixed` để overlay full viewport
 * - Dùng `flex items-center justify-center` để căn giữa
 * - Lock body scroll khi mở
 */
export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  className,
  desktopClassName,
}: ResponsiveModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Focus trap - focus modal when opened
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        // Click outside to close
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Card
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          'w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200',
          className,
          desktopClassName
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
        )}
        <CardContent className={cn('flex-1 overflow-y-auto', title ? 'pt-0' : '')}>
          {children}
        </CardContent>
      </Card>
    </div>
  )
}
