import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createHmac } from 'crypto'
import { createPublicClient, http, formatEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { robinhoodChain, RPC_URL } from '@/lib/chain'

export const dynamic = 'force-dynamic'

/**
 * Returns the Robinhood Chain address for the signed-in Clerk account.
 *
 * Derived, not stored: HMAC(server secret, userId) gives the secp256k1 private
 * key, so an account resolves to the same 0x address everywhere. Only the
 * public address is returned; the key is never persisted or sent to the client.
 *
 * NOTE: derivation depends on a single server secret, so rotating it changes
 * every address. Replace with per-user key material in a KMS before this
 * custodies real funds.
 */
function derivationSecret(): string | null {
  return process.env.WALLET_DERIVATION_SECRET || process.env.CLERK_SECRET_KEY || null
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ signedIn: false, address: null })
    }

    const secret = derivationSecret()
    if (!secret) {
      console.error('[wallet] no derivation secret configured')
      return NextResponse.json({ signedIn: true, address: null })
    }

    const seed = createHmac('sha256', secret)
      .update(`probio-wallet:v2:evm:${userId}`)
      .digest('hex')

    const address = privateKeyToAccount(`0x${seed}`).address

    // Real on-chain balance. A new account holds 0 ETH until funded, so no
    // figure is invented. `null` means the RPC was unreachable and the UI
    // renders "—" rather than a misleading zero.
    //
    // Bounded so a slow or rate-limited public RPC cannot stall the request:
    // the address matters more than the balance.
    let balance: number | null = null
    try {
      const client = createPublicClient({ chain: robinhoodChain, transport: http(RPC_URL) })
      const wei = await Promise.race([
        client.getBalance({ address }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('rpc timeout')), 3000)
        ),
      ])
      balance = Number(formatEther(wei as bigint))
    } catch (err) {
      console.warn('[wallet] balance lookup failed:', (err as Error).message)
    }

    return NextResponse.json({ signedIn: true, address, balance })
  } catch (error) {
    console.error('[wallet] derivation failed:', error)
    return NextResponse.json({ signedIn: false, address: null })
  }
}
