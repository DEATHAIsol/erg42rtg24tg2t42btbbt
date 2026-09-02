'use client'

/**
 * Demo (paper) mode.
 *
 * - Signed out: demo is implicit and always on — a guest has no funded address,
 *   so the terminal hands them a practice balance automatically.
 * - Signed in:  demo is an explicit opt-in. A signed-in account starts in LIVE
 *   mode showing its real on-chain balance, and the user chooses to switch to
 *   practice funds.
 */
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
    /* ignore storage errors */
  }
}
