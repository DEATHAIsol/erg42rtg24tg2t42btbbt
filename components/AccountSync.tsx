'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAccountSync, SyncStatus } from '@/lib/useAccountSync'
import { useThemeSync } from '@/lib/useTheme'

interface SyncContextValue {
  status: SyncStatus
  isSignedIn: boolean
}

const SyncContext = createContext<SyncContextValue>({ status: 'idle', isSignedIn: false })

/** Read sync state without starting a second sync loop. */
export function useSyncStatus() {
  return useContext(SyncContext)
}

/**
 * Runs the account sync loop exactly once for the whole app and publishes its
 * status. Guests are untouched — the hook no-ops when signed out.
 */
export function AccountSyncProvider({ children }: { children: ReactNode }) {
  useThemeSync()
  const value = useAccountSync()
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}
