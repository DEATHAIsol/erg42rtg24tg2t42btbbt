'use client'

// Web Audio API based sound effects
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

export function playDingSound() {
  try {
    const ctx = getAudioContext()
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // Pleasant "ding" sound - high frequency with quick decay
    oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5 note
    oscillator.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.05) // Quick rise
    oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1) // Back down
    
    oscillator.type = 'sine'
    
    // Volume envelope - quick attack, medium decay
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01) // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5) // Decay
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  } catch (error) {
    // Silently fail if audio isn't available
    console.log('Audio not available:', error)
  }
}

export function playSuccessSound() {
  try {
    const ctx = getAudioContext()
    
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    
    // Two-tone success chime
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.setValueAtTime(frequency, startTime)
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    }
    
    const now = ctx.currentTime
    playNote(523.25, now, 0.15) // C5
    playNote(659.25, now + 0.1, 0.2) // E5
  } catch (error) {
    console.log('Audio not available:', error)
  }
}

export function playErrorSound() {
  try {
    const ctx = getAudioContext()
    
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // Low buzzy error tone
    oscillator.frequency.setValueAtTime(200, ctx.currentTime)
    oscillator.type = 'sawtooth'
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02)
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  } catch (error) {
    console.log('Audio not available:', error)
  }
}

export function playCloseTradeSound() {
  try {
    const ctx = getAudioContext()
    
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    
    // Descending two-tone "cash out" sound
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.setValueAtTime(frequency, startTime)
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.015)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    }
    
    const now = ctx.currentTime
    playNote(698.46, now, 0.12) // F5
    playNote(523.25, now + 0.08, 0.18) // C5 (descending)
  } catch (error) {
    console.log('Audio not available:', error)
  }
}

