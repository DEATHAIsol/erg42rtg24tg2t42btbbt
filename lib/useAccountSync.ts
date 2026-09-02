'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'

/**
 * Mirrors a signed-in user's terminal state to the server so it follows them
 * across devices. Guests are untouched: everything keeps working from
 * localStorage exactly as before, and this hook does nothing.
 *
 * The wallet secret key is intentionally absent from SYNCED_KEYS — it never
 * leaves the device.
 */
const SYNCED_KEYS = [
  'paper-trading-state',
  'placed-parlays',
  'parlay-legs',
  'market-alerts',
  'terminal-settings',
  'demo-mode-enabled',
] as const

/** Local events that indicate the user mutated something worth persisting. */
const CHANGE_EVENTS = [
  'paper-trading-updated',
  'parlays-updated',
  'terminal-settings-updated',
  'demo-mode-updated',
]

const META_KEY = 'probio-sync-meta'
const PUSH_DEBOUNCE_MS = 1500

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

interface SyncMeta {
  updatedAt: number
  userId?: string
}

function readMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return { updatedAt: 0 }
}

function writeMeta(meta: SyncMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    /* ignore */
  }
}

function snapshotLocal(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of SYNCED_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw !== null) out[key] = raw
  }
  return out
}

function applyToLocal(data: Record<string, unknown>) {
  for (const key of SYNCED_KEYS) {
    const value = data[key]
    if (typeof value === 'string') {
      localStorage.setItem(key, value)
    }
  }
}

/** True if the guest has actually done something worth preserving. */
function hasMeaningfulLocalState(): boolean {
  try {
    const paper = localStorage.getItem('paper-trading-state')
    if (paper) {
      const parsed = JSON.parse(paper)
      if (
        (parsed.positions?.length ?? 0) > 0 ||
        (parsed.orders?.length ?? 0) > 0 ||
        (parsed.tradeHistory?.length ?? 0) > 0
      ) {
        return true
      }
    }
    const parlays = localStorage.getItem('placed-parlays')
    if (parlays && JSON.parse(parlays).length > 0) return true
  } catch {
    /* ignore */
  }
  return false
}

function broadcastRefresh() {
  window.dispatchEvent(new CustomEvent('paper-trading-updated'))
  window.dispatchEvent(new CustomEvent('parlays-updated'))
}

export function useAccountSync() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const [status, setStatus] = useState<SyncStatus>('idle')
  const pushTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pulledForUserRef = useRef<string | null>(null)

  /* ---------------------------- Initial reconcile --------------------------- */
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return
    if (pulledForUserRef.current === userId) return
    pulledForUserRef.current = userId

    let cancelled = false

    const reconcile = async () => {
      setStatus('syncing')
      try {
        const res = await fetch('/api/sync', { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const body = await res.json()
        if (cancelled) return

        const meta = readMeta()
        const server = body?.state as { data: Record<string, unknown>; updatedAt: number } | null

        // Switching accounts on this device: always adopt the incoming account.
        const switchedAccount = meta.userId !== undefined && meta.userId !== userId

        if (server && (switchedAccount || server.updatedAt > meta.updatedAt)) {
          applyToLocal(server.data)
          writeMeta({ updatedAt: server.updatedAt, userId })
          broadcastRefresh()
        } else if (!server && !hasMeaningfulLocalState()) {
          // Nothing anywhere yet — just claim the device for this user.
          writeMeta({ updatedAt: meta.updatedAt, userId })
        } else {
          // Local is newer (or the server is empty and the guest has history
          // worth keeping) — push it up so the account adopts this device.
          await push(userId)
        }

        if (!cancelled) setStatus('synced')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    reconcile()
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, userId])

  /* ------------------------------ Push on change ---------------------------- */
  const push = async (activeUserId: string) => {
    const updatedAt = Date.now()
    const payload = { updatedAt, data: snapshotLocal() }
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(String(res.status))
    const body = await res.json()
    if (body?.saved) writeMeta({ updatedAt, userId: activeUserId })
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return

    const schedulePush = () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
      pushTimerRef.current = setTimeout(async () => {
        setStatus('syncing')
        try {
          await push(userId)
          setStatus('synced')
        } catch {
          setStatus('error')
        }
      }, PUSH_DEBOUNCE_MS)
    }

    CHANGE_EVENTS.forEach((evt) => window.addEventListener(evt, schedulePush))
    return () => {
      CHANGE_EVENTS.forEach((evt) => window.removeEventListener(evt, schedulePush))
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [isLoaded, isSignedIn, userId])

  /* --------------------- Reset marker when signing out ---------------------- */
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      pulledForUserRef.current = null
      setStatus('idle')
    }
  }, [isLoaded, isSignedIn])

  return { status, isSignedIn: !!isSignedIn }
}
