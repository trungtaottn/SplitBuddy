// Sound effects utility for games
// Using Web Audio API for better performance

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

class SoundManager {
  private audioContext: AudioContext | null = null
  private enabled: boolean = true

  constructor() {
    if (typeof window !== 'undefined') {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
      if (AudioContextConstructor) {
        this.audioContext = new AudioContextConstructor()
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    localStorage.setItem('sounds_enabled', enabled.toString())
  }

  isEnabled(): boolean {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sounds_enabled')
      if (stored !== null) {
        this.enabled = stored === 'true'
      }
    }
    return this.enabled
  }

  // Generate sound using oscillator (no external files needed)
  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.enabled || !this.audioContext) return

    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type
    gainNode.gain.value = volume

    // Fade out
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + duration)
  }

  // Dice roll sound - multiple quick tones
  playDiceRoll() {
    if (!this.enabled) return
    
    const rollDuration = 1000
    const interval = 50
    let count = 0
    
    const roll = setInterval(() => {
      const freq = 200 + Math.random() * 400
      this.playTone(freq, 0.05, 'square', 0.2)
      count++
      if (count > rollDuration / interval) {
        clearInterval(roll)
      }
    }, interval)
  }

  // Countdown beep
  playCountdownBeep() {
    this.playTone(800, 0.1, 'sine', 0.4)
  }

  // Final countdown beep (higher pitch)
  playCountdownFinal() {
    this.playTone(1200, 0.2, 'sine', 0.5)
  }

  // Reveal sound - ascending tones
  playReveal() {
    if (!this.enabled) return
    
    setTimeout(() => this.playTone(400, 0.1, 'sine', 0.3), 0)
    setTimeout(() => this.playTone(600, 0.1, 'sine', 0.3), 100)
    setTimeout(() => this.playTone(800, 0.2, 'sine', 0.4), 200)
  }

  // Success/win sound
  playSuccess() {
    if (!this.enabled) return
    
    setTimeout(() => this.playTone(523, 0.15, 'sine', 0.3), 0)   // C5
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.3), 150) // E5
    setTimeout(() => this.playTone(784, 0.3, 'sine', 0.4), 300)  // G5
  }

  // Danger/extreme sound
  playDanger() {
    if (!this.enabled) return
    
    this.playTone(150, 0.3, 'sawtooth', 0.4)
    setTimeout(() => this.playTone(100, 0.4, 'sawtooth', 0.5), 300)
  }

  // Click sound
  playClick() {
    this.playTone(600, 0.05, 'sine', 0.2)
  }

  // Spin wheel tick
  playSpinTick() {
    this.playTone(1000, 0.02, 'square', 0.15)
  }
}

// Singleton instance
export const soundManager = new SoundManager()

// Vibration utility
export const vibrate = (pattern: number | number[] = 50) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

// Vibration patterns
export const vibrationPatterns = {
  short: 50,
  medium: 100,
  long: 200,
  double: [50, 50, 50],
  success: [50, 50, 100],
  danger: [100, 50, 100, 50, 200],
  dice: [30, 30, 30, 30, 30, 30, 100],
}
