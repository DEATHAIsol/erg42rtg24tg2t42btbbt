'use client'

import { useAuth as useClerkAuth } from '@clerk/nextjs'

/**
 * Whether Clerk is configured for this build.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so this is a compile-time
 * constant — it can never change between renders, which is what makes the
 * hook selection below safe.
 */
export const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

interface AuthState {
  isLoaded: boolean
  isSignedIn: boolean
  userId: string | null
}

/** Signed-out stand-in used when no Clerk keys are present. */
function useNoAuth(): AuthState {
  return { isLoaded: true, isSignedIn: false, userId: null }
}

function useRealAuth(): AuthState {
  const { isLoaded, isSignedIn, userId } = useClerkAuth()
  return { isLoaded, isSignedIn: !!isSignedIn, userId: userId ?? null }
}

/**
 * Auth state that works with or without Clerk configured.
 *
 * Without keys the app still builds and runs — everyone is simply a guest,
 * which is a supported first-class mode. The alternative (ClerkProvider
 * throwing during prerender) takes the whole build down.
 */
export const useAuthState: () => AuthState = clerkEnabled ? useRealAuth : useNoAuth
