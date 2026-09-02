'use client'

import { ReactNode } from 'react'
import { ToastProvider } from './Toast'
import { ConfirmProvider } from './ConfirmModal'
import { AccountSyncProvider } from './AccountSync'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AccountSyncProvider>{children}</AccountSyncProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}
