'use client'

const DEMO_MODE_KEY = 'demo-mode-enabled'

export function getDemoMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setDemoMode(enabled: boolean) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DEMO_MODE_KEY, enabled ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent('demo-mode-updated', { detail: { enabled } }))
  } catch {
    // ignore storage errors
  }
}
