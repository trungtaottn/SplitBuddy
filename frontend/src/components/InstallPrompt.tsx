import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * InstallPrompt - Vintage Paper Style
 * PWA installation prompt with paper card design
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const timers: number[] = []

    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(standalone)

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('pwa-install-dismissed')
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) return
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      timers.push(window.setTimeout(() => setShowPrompt(true), 3000))
    }

    window.addEventListener('beforeinstallprompt', handler)

    // For iOS, show manual install instructions after delay
    if (iOS && !standalone) {
      timers.push(window.setTimeout(() => setShowPrompt(true), 5000))
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-500">
      <div className="card-paper p-4 relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-sm border border-border hover:bg-secondary transition-colors"
          aria-label="Đóng"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        </button>

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 border-2 border-primary/50 bg-primary/10 rounded-sm flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">
              Cài đặt SplitBuddy
            </h3>
            
            {isIOS ? (
              <p className="text-muted-foreground text-xs mt-1">
                Nhấn <span className="inline-flex items-center px-1.5 py-0.5 bg-secondary border border-border rounded-sm text-[10px]">
                  Chia sẻ
                </span> rồi chọn <span className="font-semibold">"Thêm vào Màn hình chính"</span>
              </p>
            ) : (
              <>
                <p className="text-muted-foreground text-xs mt-1 italic">
                  Truy cập nhanh hơn, dùng offline, nhận thông báo
                </p>
                <Button
                  onClick={handleInstall}
                  variant="stamp"
                  className="mt-3 gap-2"
                  size="sm"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Cài đặt
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Benefits list */}
        <div className="mt-3 pt-3 border-t border-dashed border-border flex gap-4 text-[10px] text-muted-foreground uppercase tracking-wider">
          <span>✓ Offline</span>
          <span>✓ Nhanh</span>
          <span>✓ Thông báo</span>
        </div>
      </div>
    </div>
  )
}
