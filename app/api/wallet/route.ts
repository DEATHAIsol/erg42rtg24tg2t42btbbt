import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createHmac } from 'crypto'
import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

export const dynamic = 'force-dynamic'

/**
 * Returns the Solana address associated with the signed-in Clerk account.
 *
 * The address is DERIVED, not stored: HMAC(server secret, userId) seeds a
 * keypair, so the same account always resolves to the same address on every
 * device and browser — no per-session randomness.
 *
 * Only the public key is ever returned. The secret key is reconstructed in
 * memory here and never persisted or sent to the client, because this preview
 * build simulates order execution and has no reason to sign anything.
 *
 * NOTE: because derivation depends solely on a server secret, rotating that
 * secret changes every user's address. Before this build ever custodies real
 * funds, replace this with per-user key material stored under envelope
 * encryption in a KMS.
 */
function derivationSecret(): string | null {
  return (
    process.env.WALLET_DERIVATION_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    null
  )
}

export async function GET() {
  try {
    const { userId } = await auth()

    // Guests trade against the demo balance and have no address. Not an error.
    if (!userId) {
      return NextResponse.json({ signedIn: false, address: null })
    }

    const secret = derivationSecret()
    if (!secret) {
      console.error('[wallet] no derivation secret configured')
      return NextResponse.json({ signedIn: true, address: null })
    }

    const seed = createHmac('sha256', secret)
      .update(`probio-wallet:v1:${userId}`)
      .digest()
      .subarray(0, 32)

    const address = Keypair.fromSeed(new Uint8Array(seed)).publicKey.toBase58()

    // Real on-chain balance. A brand-new account legitimately has 0 SOL until
    // it is funded — we never invent a balance here. `null` means the RPC could
    // not be reached, which the UI renders as "—" rather than a bogus zero.
    let balance: number | null = null
    const rpc = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    if (rpc) {
      try {
        const lamports = await new Connection(rpc, 'confirmed').getBalance(
          new PublicKey(address)
        )
        balance = lamports / LAMPORTS_PER_SOL
      } catch (err) {
        console.warn('[wallet] balance lookup failed:', (err as Error).message)
      }
    }

    return NextResponse.json({ signedIn: true, address, balance })
  } catch (error) {
    console.error('[wallet] derivation failed:', error)
    return NextResponse.json({ signedIn: false, address: null })
  }
}
