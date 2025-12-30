type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [30, 30, 30],
  error: [50, 100, 50],
}

class HapticManager {
  private enabled: boolean = true

  constructor() {
    const saved = localStorage.getItem('haptics_enabled')
    this.enabled = saved !== 'false'
  }

  isSupported(): boolean {
    return 'vibrate' in navigator
  }

  isEnabled(): boolean {
    return this.enabled && this.isSupported()
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    localStorage.setItem('haptics_enabled', String(enabled))
  }

  trigger(type: HapticType = 'light'): void {
    if (!this.isEnabled()) return
    
    try {
      const pattern = HAPTIC_PATTERNS[type]
      navigator.vibrate(pattern)
    } catch {
      // Silently fail if vibration not supported
    }
  }

  // Convenience methods
  light(): void { this.trigger('light') }
  medium(): void { this.trigger('medium') }
  heavy(): void { this.trigger('heavy') }
  success(): void { this.trigger('success') }
  warning(): void { this.trigger('warning') }
  error(): void { this.trigger('error') }
}

export const haptics = new HapticManager()

// Hook for components
export function useHaptics() {
  return haptics
}
