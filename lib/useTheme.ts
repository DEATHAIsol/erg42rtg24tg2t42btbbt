'use client'

import { useEffect } from 'react'

export type Theme = 'dark' | 'light'

export function readTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const raw = localStorage.getItem('terminal-settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.theme === 'light' || parsed?.theme === 'dark') return parsed.theme
    }
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }))
}

/** Keeps <html data-theme> in sync with the saved setting. */
export function useThemeSync() {
  useEffect(() => {
    applyTheme(readTheme())
    const onSettings = () => applyTheme(readTheme())
    window.addEventListener('terminal-settings-updated', onSettings)
    window.addEventListener('storage', onSettings)
    return () => {
      window.removeEventListener('terminal-settings-updated', onSettings)
      window.removeEventListener('storage', onSettings)
    }
  }, [])
}
