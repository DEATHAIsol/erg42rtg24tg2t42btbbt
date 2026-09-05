'use client'

import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Use custom RPC endpoint if provided, otherwise use public endpoint
  // For production, use a dedicated RPC provider like Helius, QuickNode, or Alchemy
  const endpoint = useMemo(() => {
    // Check for custom RPC URL from environment
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    }
    // Use public RPC (may have rate limits and no WebSocket support)
    const network = WalletAdapterNetwork.Mainnet
    return clusterApiUrl(network)
  }, [])

  // Configure connection options to handle WebSocket failures gracefully
  const connectionConfig = useMemo(() => ({
    commitment: 'confirmed' as const,
    disableRetryOnRateLimit: false,
    wsEndpoint: undefined, // Don't use WebSocket for public RPC
  }), [])

  // Supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}

