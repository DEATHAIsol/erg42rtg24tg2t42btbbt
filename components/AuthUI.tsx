'use client'

import { ReactNode } from 'react'
import { SignedIn, SignedOut, UserButton, ClerkLoaded, ClerkLoading } from '@clerk/nextjs'

/** Renders children only when signed in. */
export function ShowSignedIn({ children }: { children: ReactNode }) {
  return <SignedIn>{children}</SignedIn>
}

/**
 * Renders children when signed out, and also while Clerk is still loading.
 *
 * `<SignedOut>` alone renders nothing until Clerk resolves, so a slow or
 * blocked Clerk left the header with no sign-in links at all. These are plain
 * links to /sign-in and /sign-up, so they should always be reachable.
 */
export function ShowSignedOut({ children }: { children: ReactNode }) {
  return (
    <>
      <ClerkLoading>{children}</ClerkLoading>
      <ClerkLoaded>
        <SignedOut>{children}</SignedOut>
      </ClerkLoaded>
    </>
  )
}

/** The Clerk account menu. */
export function AccountButton() {
  return <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-7 w-7' } }} />
}
