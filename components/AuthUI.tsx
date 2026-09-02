'use client'

import { ReactNode } from 'react'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { clerkEnabled } from '@/lib/auth'

/** Renders children only when signed in. Renders nothing if Clerk is off. */
export function ShowSignedIn({ children }: { children: ReactNode }) {
  if (!clerkEnabled) return null
  return <SignedIn>{children}</SignedIn>
}

/** Renders children when signed out — and always, if Clerk is not configured. */
export function ShowSignedOut({ children }: { children: ReactNode }) {
  if (!clerkEnabled) return <>{children}</>
  return <SignedOut>{children}</SignedOut>
}

/** The Clerk avatar menu, or nothing when Clerk is off. */
export function AccountButton() {
  if (!clerkEnabled) return null
  return <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-7 w-7' } }} />
}
