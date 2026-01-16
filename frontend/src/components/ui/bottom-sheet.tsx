import { ReactNode, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { haptics } from '@/utils/haptics'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  showHandle?: boolean
}

export function BottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className,
  showHandle = true 
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      haptics.light()
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current
    
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const diff = currentY.current - startY.current
    
    if (sheetRef.current) {
      if (diff > 100) {
        haptics.light()
        onClose()
      }
      sheetRef.current.style.transform = ''
    }
    
    startY.current = 0
    currentY.current = 0
  }, [onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet - Minimalist Retro Style */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-[24px]',
          'max-h-[90vh] flex flex-col',
          'animate-in slide-in-from-bottom duration-300',
          'transition-transform shadow-xl border-t border-border/50',
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle - Drag indicator */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
        )}

        {/* Header - Retro typography */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h3 className="text-lg font-heading font-semibold text-foreground">{title}</h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
              aria-label="Đóng"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 font-body">
          {children}
        </div>

        {/* Safe area padding for mobile devices with notch */}
        <div className="pb-safe" />
      </div>
    </>
  )
}
