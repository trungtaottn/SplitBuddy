import { useEffect, useRef, useState } from 'react'
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

export const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const y = useMotionValue(0)
  const controls = useAnimation()

  // Transform y value to rotation for spinner
  const rotate = useTransform(y, [0, 100], [0, 360])
  const opacity = useTransform(y, [0, 50], [0, 1])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let startY = 0
    let isDragging = false

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY
        isDragging = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return
      
      const currentY = e.touches[0].clientY
      const diff = currentY - startY

      if (diff > 0 && window.scrollY === 0) {
        // Resistance effect
        const dampenedDiff = Math.min(diff * 0.5, 120)
        y.set(dampenedDiff)
        
        // Prevent default only if we are pulling down at the top
        if (diff > 5) e.preventDefault()
      } else {
        isDragging = false
        y.set(0)
      }
    }

    const handleTouchEnd = async () => {
      if (!isDragging) return
      isDragging = false

      if (y.get() > 80) {
        // Trigger refresh
        setIsRefreshing(true)
        controls.start({ y: 60 })
        
        try {
          // Haptic feedback if available
          if (navigator.vibrate) navigator.vibrate(50)
          
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          controls.start({ y: 0 })
          y.set(0)
        }
      } else {
        // Reset
        controls.start({ y: 0 })
        y.set(0)
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onRefresh, controls, y])

  return (
    <div ref={containerRef} className="relative min-h-screen">
      {/* Loading Indicator */}
      <motion.div
        className="fixed left-0 right-0 top-0 z-50 flex justify-center pt-4 pointer-events-none"
        style={{ y, opacity }}
        animate={controls}
      >
        <motion.div 
          className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-lg border border-border"
          style={{ rotate }}
        >
          {isRefreshing ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          )}
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        animate={controls}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </div>
  )
}
