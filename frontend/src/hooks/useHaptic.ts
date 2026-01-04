import { useCallback } from 'react'

// Vibration patterns for different actions
export const hapticPatterns = {
  // Light feedback for taps
  tap: 10,
  // Standard click feedback
  click: 25,
  // Button press
  press: 50,
  // Success action completed
  success: [50, 30, 100],
  // Warning or attention needed
  warning: [100, 50, 100],
  // Error or failure
  error: [100, 50, 100, 50, 200],
  // Selection changed
  selection: 15,
  // Toggle switch
  toggle: [20, 10, 20],
  // Long press triggered
  longPress: [50, 50, 100],
  // Notification arrived
  notification: [50, 100, 50],
  // Heavy impact (e.g., delete confirmed)
  heavy: 200,
  // Soft impact
  soft: 5,
}

export type HapticType = keyof typeof hapticPatterns

// Check if haptic feedback is supported
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

// Trigger haptic feedback
export function triggerHaptic(type: HapticType = 'click'): void {
  if (!isHapticSupported()) return
  
  const pattern = hapticPatterns[type]
  
  try {
    navigator.vibrate(pattern)
  } catch {
    // Silently fail if vibration is not permitted
  }
}

// Cancel any ongoing vibration
export function cancelHaptic(): void {
  if (!isHapticSupported()) return
  
  try {
    navigator.vibrate(0)
  } catch {
    // Silently fail
  }
}

// Hook for haptic feedback
export function useHaptic() {
  const tap = useCallback(() => triggerHaptic('tap'), [])
  const click = useCallback(() => triggerHaptic('click'), [])
  const press = useCallback(() => triggerHaptic('press'), [])
  const success = useCallback(() => triggerHaptic('success'), [])
  const warning = useCallback(() => triggerHaptic('warning'), [])
  const error = useCallback(() => triggerHaptic('error'), [])
  const selection = useCallback(() => triggerHaptic('selection'), [])
  const toggle = useCallback(() => triggerHaptic('toggle'), [])
  const longPress = useCallback(() => triggerHaptic('longPress'), [])
  const notification = useCallback(() => triggerHaptic('notification'), [])
  const heavy = useCallback(() => triggerHaptic('heavy'), [])
  const soft = useCallback(() => triggerHaptic('soft'), [])
  
  return {
    isSupported: isHapticSupported(),
    tap,
    click,
    press,
    success,
    warning,
    error,
    selection,
    toggle,
    longPress,
    notification,
    heavy,
    soft,
    trigger: triggerHaptic,
    cancel: cancelHaptic,
  }
}

// Higher-order function to wrap handlers with haptic feedback
export function withHaptic<T extends (...args: unknown[]) => unknown>(
  handler: T,
  type: HapticType = 'click'
): T {
  return ((...args: unknown[]) => {
    triggerHaptic(type)
    return handler(...args)
  }) as T
}

// Create a haptic button handler
export function createHapticHandler(
  handler: () => void,
  type: HapticType = 'click'
): () => void {
  return () => {
    triggerHaptic(type)
    handler()
  }
}

