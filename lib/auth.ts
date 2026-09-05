'use client'

import { useAuth } from '@clerk/nextjs'

/**
 * Thin pass-through over Clerk's own hook.
 *
 * This used to branch on whether a publishable key was present, picking a stub
 * hook when it was not. That branch is a build-time constant in the client
 * bundle but read per-request on the server, so the two could disagree and the
 * resulting hydration mismatch stopped Clerk initialising at all. Clerk is now
 * a hard dependency, which is the configuration Clerk supports.
 */
export function useAuthState() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  return { isLoaded, isSignedIn: !!isSignedIn, userId: userId ?? null }
}
