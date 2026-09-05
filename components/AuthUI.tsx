'use client'

import { ReactNode } from 'react'
import { SignedIn, SignedOut, UserButton, ClerkLoaded, ClerkLoading } from '@clerk/nextjs'
import { clerkEnabled } from '@/lib/auth'

/** Renders children only when signed in. Renders nothing if Clerk is off. */
export function ShowSignedIn({ children }: { children: ReactNode }) {
  if (!clerkEnabled) return null
  return <SignedIn>{children}</SignedIn>
}

/**
 * Renders children when signed out.
 *
 * Crucially it ALSO renders them while Clerk is still loading. `<SignedOut>`
 * alone renders nothing until Clerk resolves, so if Clerk is slow, blocked by
 * an extension, or misconfigured, the sign-in links never appear and the user
 * has no way in at all. These are plain links to /sign-in and /sign-up and do
 * not need Clerk to work, so they should always be reachable.
 */
export function ShowSignedOut({ children }: { children: ReactNode }) {
  if (!clerkEnabled) return <>{children}</>
  return (
    <>
      <ClerkLoading>{children}</ClerkLoading>
      <ClerkLoaded>
        <SignedOut>{children}</SignedOut>
      </ClerkLoaded>
    </>
  )
}

/** The Clerk avatar menu, or nothing when Clerk is off. */
export function AccountButton() {
  if (!clerkEnabled) return null
  return <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-7 w-7' } }} />
}
