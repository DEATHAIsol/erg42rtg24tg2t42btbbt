'use client'

import { Check, CloudOff, RefreshCw } from 'lucide-react'
import { useSyncStatus } from './AccountSync'

/**
 * Tiny read-out of account sync state. Renders nothing for guests so the
 * signed-out experience stays exactly as it was.
 */
export function SyncIndicator() {
  const { status, isSignedIn } = useSyncStatus()

  if (!isSignedIn || status === 'idle') return null

  if (status === 'syncing') {
    return (
      <span
        className="hidden lg:inline-flex items-center gap-1.5 px-2 h-9 text-[11px] text-terminal-text-muted"
        title="Saving to your account"
      >
        <RefreshCw size={11} className="animate-spin" />
        Saving
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span
        className="hidden lg:inline-flex items-center gap-1.5 px-2 h-9 text-[11px] text-terminal-warning"
        title="Couldn't reach the sync service. Your data is still safe in this browser"
      >
        <CloudOff size={11} />
        Offline
      </span>
    )
  }

  return (
    <span
      className="hidden lg:inline-flex items-center gap-1.5 px-2 h-9 text-[11px] text-terminal-text-muted"
      title="Portfolio and settings saved to your account"
    >
      <Check size={11} className="text-terminal-success" />
      Saved
    </span>
  )
}
