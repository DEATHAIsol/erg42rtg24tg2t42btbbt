import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserState, putUserState } from '@/lib/user-state-store'

export const dynamic = 'force-dynamic'

/** Keys the client is allowed to persist. Anything else is dropped server-side. */
const ALLOWED_KEYS = new Set([
  'paper-trading-state',
  'placed-parlays',
  'parlay-legs',
  'market-alerts',
  'terminal-settings',
  'demo-mode-enabled',
])

/** Hard cap so a malformed client can't write unbounded blobs. */
const MAX_PAYLOAD_BYTES = 512 * 1024

function sanitize(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (ALLOWED_KEYS.has(key)) out[key] = value
  }
  return out
}

/** Read the signed-in user's saved terminal state. Guests get `null`, not an error. */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ signedIn: false, state: null })
    }

    const state = await getUserState(userId)
    return NextResponse.json({ signedIn: true, state })
  } catch (error) {
    console.error('[sync] GET failed:', error)
    return NextResponse.json(
      { signedIn: false, state: null, error: 'sync_unavailable' },
      { status: 200 }
    )
  }
}

/** Persist the signed-in user's terminal state. No-ops for guests. */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      // Guests are a supported, first-class case — this is not an error.
      return NextResponse.json({ signedIn: false, saved: false })
    }

    const raw = await request.text()
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { saved: false, error: 'payload_too_large' },
        { status: 413 }
      )
    }

    const body = JSON.parse(raw)
    const data = sanitize(body?.data)
    const updatedAt =
      typeof body?.updatedAt === 'number' && isFinite(body.updatedAt)
        ? body.updatedAt
        : Date.now()

    await putUserState(userId, { data, updatedAt })

    return NextResponse.json({ signedIn: true, saved: true, updatedAt })
  } catch (error) {
    console.error('[sync] POST failed:', error)
    return NextResponse.json(
      { saved: false, error: 'sync_unavailable' },
      { status: 200 }
    )
  }
}
