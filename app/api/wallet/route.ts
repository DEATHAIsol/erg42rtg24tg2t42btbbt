import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createHmac } from 'crypto'
import { createPublicClient, http, formatEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { robinhoodChain, RPC_URL } from '@/lib/chain'

export const dynamic = 'force-dynamic'

/**
 * Returns the Robinhood Chain (EVM) address for the signed-in Clerk account.
 *
 * The address is DERIVED, not stored: HMAC(server secret, userId) produces the
 * private key, so the same account always resolves to the same 0x address on
 * every device. Only the public address is ever returned; the key is
 * reconstructed in memory here and never persisted or sent to the client,
 * because this build simulates order execution and signs nothing.
 *
 * NOTE: derivation depends solely on a server secret, so rotating that secret
 * changes every user's address. Before this ever custodies real funds, replace
 * it with per-user key material under envelope encryption in a KMS.
 */
function derivationSecret(): string | null {
  return process.env.WALLET_DERIVATION_SECRET || process.env.CLERK_SECRET_KEY || null
}

export async function GET() {
  try {
    const { userId } = await auth()

    // Guests trade the demo balance and have no address. Not an error.
    if (!userId) {
      return NextResponse.json({ signedIn: false, address: null })
    }

    const secret = derivationSecret()
    if (!secret) {
      console.error('[wallet] no derivation secret configured')
      return NextResponse.json({ signedIn: true, address: null })
    }

    // secp256k1 private keys are 32 bytes; HMAC-SHA256 gives exactly that.
    const seed = createHmac('sha256', secret)
      .update(`probio-wallet:v2:evm:${userId}`)
      .digest('hex')

    const address = privateKeyToAccount(`0x${seed}`).address

    // Real on-chain balance. A new account legitimately holds 0 ETH until it is
    // funded, so we never invent a figure. `null` means the RPC was unreachable
    // and the UI renders that as "—" rather than a misleading zero.
    let balance: number | null = null
    try {
      const client = createPublicClient({ chain: robinhoodChain, transport: http(RPC_URL) })
      const wei = await client.getBalance({ address })
      balance = Number(formatEther(wei))
    } catch (err) {
      console.warn('[wallet] balance lookup failed:', (err as Error).message)
    }

    return NextResponse.json({ signedIn: true, address, balance })
  } catch (error) {
    console.error('[wallet] derivation failed:', error)
    return NextResponse.json({ signedIn: false, address: null })
  }
}
