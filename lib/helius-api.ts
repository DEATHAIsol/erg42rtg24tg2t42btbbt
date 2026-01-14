'use client'

import { LAMPORTS_PER_SOL } from '@solana/web3.js'

/**
 * Fetch wallet balance using Helius API getAccountInfo
 * Returns balance in SOL, or 0 if fetch fails
 */
export async function fetchWalletBalanceHelius(publicKey: string): Promise<number> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY
    
    if (!apiKey) {
      console.warn('Helius API key not configured')
      return 0
    }

    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [
          publicKey,
          {
            encoding: 'base58',
          },
        ],
      }),
    })

    if (!response.ok) {
      console.warn(`Helius API error: ${response.status} ${response.statusText}`)
      return 0
    }

    const data = await response.json()

    // Check for JSON-RPC error
    if (data.error) {
      console.warn('Helius API error:', data.error)
      return 0
    }

    // Extract lamports from response
    const lamports = data.result?.value?.lamports

    if (lamports === undefined || lamports === null) {
      // Account might not exist or have no balance
      return 0
    }

    // Convert lamports to SOL
    return lamports / LAMPORTS_PER_SOL
  } catch (error) {
    console.warn('Failed to fetch balance from Helius:', error)
    return 0
  }
}
