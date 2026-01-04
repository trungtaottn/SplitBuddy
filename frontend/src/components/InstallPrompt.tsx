import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
      if (daysSinceDismissed < 7) return // Don't show for 7 days after dismissal
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show prompt after a delay (don't interrupt initial experience)
      setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // For iOS, show manual install instructions after delay
    if (iOS && !standalone) {
      setTimeout(() => setShowPrompt(true), 5000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
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

  // Don't show if already installed or nothing to show
  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-500">
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-4 shadow-xl">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          aria-label="Đóng"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-base">
              Cài đặt SplitBuddy
            </h3>
            
            {isIOS ? (
              <p className="text-white/90 text-sm mt-1">
                Nhấn <span className="inline-flex items-center px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  Chia sẻ
                </span> rồi chọn <span className="font-medium">"Thêm vào Màn hình chính"</span>
              </p>
            ) : (
              <>
                <p className="text-white/90 text-sm mt-1">
                  Truy cập nhanh hơn, dùng offline, nhận thông báo
                </p>
                <Button
                  onClick={handleInstall}
                  className="mt-3 bg-white text-orange-600 hover:bg-white/90 font-semibold gap-2"
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                  Cài đặt ngay
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Benefits list */}
        <div className="mt-3 pt-3 border-t border-white/20 flex gap-4 text-xs text-white/80">
          <span>✓ Không cần mạng</span>
          <span>✓ Truy cập nhanh</span>
          <span>✓ Thông báo</span>
        </div>
      </div>
    </div>
  )
}

// Hook to check PWA install status
export function usePWAInstall() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // Check if running as installed PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsInstalled(standalone)

    // Listen for installability
    const handler = () => setIsInstallable(true)
    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  return { isInstalled, isInstallable }
}

