/**
 * ClaudeWorld Sound Manager
 * Web Audio API synthesized sounds - no files needed
 */

class SoundManager {
  private ctx: AudioContext | null = null
  private enabled = true
  private volume = 0.3

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
    }
    return this.ctx
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  /**
   * Play a synth tone
   */
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    attack = 0.01,
    decay = 0.1
  ) {
    if (!this.enabled) return

    try {
      const ctx = this.getContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = type
      osc.frequency.value = frequency

      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(this.volume, ctx.currentTime + attack)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    } catch (e) {
      // Audio context may not be available
    }
  }

  /**
   * Play a chord (multiple frequencies)
   */
  private playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine') {
    frequencies.forEach((f, i) => {
      setTimeout(() => this.playTone(f, duration, type), i * 30)
    })
  }

  // === Sound Effects ===

  /** Claude starts walking */
  walk() {
    this.playTone(220, 0.1, 'triangle')
  }

  /** Claude arrives at destination */
  arrive() {
    this.playChord([440, 554, 659], 0.2, 'sine') // A major
  }

  /** Tool use sound */
  toolUse(tool: string) {
    const sounds: Record<string, () => void> = {
      Read: () => this.playTone(523, 0.15, 'sine'),      // C5 - soft
      Write: () => this.playTone(587, 0.15, 'square'),   // D5 - clicky  
      Exec: () => this.playTone(392, 0.2, 'sawtooth'),   // G4 - techy
      Browser: () => this.playChord([440, 550], 0.15, 'sine'), // whoosh
      Search: () => this.playTone(659, 0.1, 'triangle'), // E5 - ping
    }
    
    const play = sounds[tool] || (() => this.playTone(440, 0.1, 'sine'))
    play()
  }

  /** XP gained */
  xpGain(amount: number) {
    const baseFreq = 600 + Math.min(amount, 100) * 2
    this.playTone(baseFreq, 0.15, 'sine')
    setTimeout(() => this.playTone(baseFreq * 1.25, 0.15, 'sine'), 50)
  }

  /** Level up! */
  levelUp() {
    const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine'), i * 100)
    })
  }

  /** Achievement unlocked */
  achievement() {
    this.playChord([523, 659, 784], 0.4, 'sine')
    setTimeout(() => this.playChord([587, 740, 880], 0.4, 'sine'), 200)
  }

  /** Error sound */
  error() {
    this.playTone(200, 0.3, 'sawtooth')
  }

  /** Subagent spawn */
  subagentSpawn() {
    this.playTone(880, 0.1, 'sine')
    setTimeout(() => this.playTone(1100, 0.15, 'sine'), 80)
  }

  /** Connection established */
  connected() {
    this.playChord([440, 554, 659], 0.3, 'sine')
  }

  /** Footstep (subtle) */
  footstep() {
    this.playTone(100 + Math.random() * 50, 0.05, 'triangle')
  }
}

export const soundManager = new SoundManager()
export default soundManager
