import { useState, useRef, useCallback, useEffect } from 'react'
import { triggerHaptic } from './useHaptic'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  resistance?: number
}

interface UsePullToRefreshResult {
  pullDistance: number
  isRefreshing: boolean
  isPulling: boolean
  progress: number
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
  containerRef: React.RefObject<HTMLDivElement>
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 0.5,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasTriggeredHaptic = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
      hasTriggeredHaptic.current = false
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing || !isPulling) return
    if (containerRef.current?.scrollTop !== 0) return

    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current

    if (diff > 0) {
      // Apply resistance
      const newPullDistance = Math.min(diff * resistance, threshold * 1.5)
      setPullDistance(newPullDistance)

      // Trigger haptic when threshold is reached
      if (newPullDistance >= threshold && !hasTriggeredHaptic.current) {
        triggerHaptic('selection')
        hasTriggeredHaptic.current = true
      }
    }
  }, [isRefreshing, isPulling, resistance, threshold])

  const handleTouchEnd = useCallback(async () => {
    setIsPulling(false)
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      triggerHaptic('success')
      
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    
    setPullDistance(0)
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  // Reset on unmount
  useEffect(() => {
    return () => {
      setPullDistance(0)
      setIsRefreshing(false)
      setIsPulling(false)
    }
  }, [])

  const progress = Math.min(pullDistance / threshold, 1)

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    progress,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    containerRef,
  }
}
