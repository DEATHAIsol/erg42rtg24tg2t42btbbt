import { defineChain } from 'viem'

/**
 * Robinhood Chain: an Arbitrum-stack Ethereum L2. Gas and the native asset are
 * ETH (18 decimals), and it settles to Ethereum via blob data availability.
 *
 * Parameters are from the official docs at docs.robinhood.com/chain/connecting.
 * The public RPC is rate limited with no SLA, so set NEXT_PUBLIC_RPC_URL to a
 * provider endpoint (Alchemy) for anything real.
 */
export const CHAIN_IDS = {
  mainnet: 4663,
  testnet: 46630,
} as const

const NETWORK = (process.env.NEXT_PUBLIC_CHAIN_NETWORK || 'mainnet') as 'mainnet' | 'testnet'
const isTestnet = NETWORK === 'testnet'

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  (isTestnet
    ? 'https://rpc.testnet.chain.robinhood.com'
    : 'https://rpc.mainnet.chain.robinhood.com')

export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ||
  (isTestnet
    ? 'https://explorer.testnet.chain.robinhood.com'
    : 'https://robinhoodchain.blockscout.com')

export const CHAIN_ID = isTestnet ? CHAIN_IDS.testnet : CHAIN_IDS.mainnet
export const CHAIN_NAME = isTestnet ? 'Robinhood Chain Testnet' : 'Robinhood Chain'

/** Native currency. Everything user-facing is denominated in this. */
export const NATIVE_SYMBOL = 'ETH'
export const NATIVE_DECIMALS = 18

export const robinhoodChain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_NAME,
  nativeCurrency: { name: 'Ether', symbol: NATIVE_SYMBOL, decimals: NATIVE_DECIMALS },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: 'Blockscout', url: EXPLORER_URL } },
  testnet: isTestnet,
})

/** Link to an address on the chain's explorer. */
export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_URL}/address/${address}`
}

/** Link to a transaction on the chain's explorer. */
export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`
}
