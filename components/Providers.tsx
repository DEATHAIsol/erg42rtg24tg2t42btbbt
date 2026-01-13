'use client'

import { ReactNode } from 'react'
import { ToastProvider } from './Toast'
import { ConfirmProvider } from './ConfirmModal'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
    </ToastProvider>
  )
}

