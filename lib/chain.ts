import { defineChain } from 'viem'

/**
 * Robinhood Chain: an Arbitrum-stack Ethereum L2. Native asset and gas are ETH
 * (18 decimals). Parameters from docs.robinhood.com/chain/connecting, verified
 * against the live RPC (eth_chainId returns 0x1237 = 4663).
 *
 * The public RPC is rate limited with no SLA; set NEXT_PUBLIC_RPC_URL to a
 * provider endpoint for production.
 */
const NETWORK = (process.env.NEXT_PUBLIC_CHAIN_NETWORK || 'mainnet') as 'mainnet' | 'testnet'
const isTestnet = NETWORK === 'testnet'

export const CHAIN_ID = isTestnet ? 46630 : 4663
export const CHAIN_NAME = isTestnet ? 'Robinhood Chain Testnet' : 'Robinhood Chain'
export const NATIVE_SYMBOL = 'ETH'

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

export const robinhoodChain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_NAME,
  nativeCurrency: { name: 'Ether', symbol: NATIVE_SYMBOL, decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: 'Blockscout', url: EXPLORER_URL } },
  testnet: isTestnet,
})

export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_URL}/address/${address}`
}
