import { clerkMiddleware } from '@clerk/nextjs/server'

/**
 * Clerk runs on every request so that `auth()` is available in route handlers,
 * but it does NOT gate anything: the terminal, markets, portfolio and paper
 * trading are all fully usable while signed out. Only the /api/sync routes
 * check for a session, and they fail soft for guests.
 */
export default clerkMiddleware()

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
}
