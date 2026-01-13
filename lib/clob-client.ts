// Polymarket CLOB API Client Integration
import { ClobClient, Side, OrderType } from '@polymarket/clob-client'

// Re-export types for use in components
export { Side, OrderType }

// Initialize CLOB client (lazy initialization to avoid errors)
let clobClientInstance: ClobClient | null = null

export const getClobClient = (apiKey?: string): ClobClient | null => {
  // Only initialize if we have an API key and need it for authenticated operations
  // For read operations, we use fetch directly
  if (!apiKey) {
    return null
  }

  try {
    if (!clobClientInstance) {
      // Try different initialization patterns based on the actual ClobClient API
      // The ClobClient might expect: new ClobClient(host, chainId, signer)
      // or: new ClobClient({ host, chainId, signer })
      // We'll initialize it only when needed for authenticated operations
      const HOST = 'https://clob.polymarket.com'
      const CHAIN_ID = 137
      
      // For now, return null since we need a signer for authenticated operations
      // This will be initialized when we have wallet integration for trading
      clobClientInstance = null
    }
    return clobClientInstance
  } catch (error) {
    console.error('Error initializing ClobClient:', error)
    return null
  }
}

// Market data types
export interface MarketOrderBook {
  market?: string
  asset_id?: string
  timestamp?: string
  hash?: string
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  min_order_size?: string
  tick_size?: string
  neg_risk?: boolean
}

export interface OrderBookEntry {
  price: string
  size: string
  user?: string
}

export interface MarketPrice {
  market: string
  outcome: string
  price: number
  size: number
}

// Fetch order book for a market (via API route to avoid CORS)
export async function getOrderBook(
  marketId: string,
  outcome: string
): Promise<MarketOrderBook | null> {
  try {
    const response = await fetch(`/api/clob/orderbook?marketId=${encodeURIComponent(marketId)}&outcome=${encodeURIComponent(outcome)}`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })
    
    if (!response.ok) {
      // For 404 or "no orderbook" errors, return empty order book instead of null
      if (response.status === 404) {
        return {
          bids: [],
          asks: [],
          market: marketId,
        }
      }
      
      const errorData = await response.json().catch(() => ({}))
      // If it's a "no orderbook" error, return empty order book
      if (errorData.error?.includes('No orderbook')) {
        return {
          bids: [],
          asks: [],
          market: marketId,
        }
      }
      
      // For other errors, log but don't throw
      console.warn(`Failed to fetch order book for ${marketId}:`, errorData.error || response.statusText)
      return {
        bids: [],
        asks: [],
        market: marketId,
      }
    }
    
    const data = await response.json()
    
    // Handle "no orderbook" in success response
    if (data.error && data.error.includes('No orderbook')) {
      return {
        bids: [],
        asks: [],
        market: marketId,
      }
    }
    
    // Normalize response format - handle different structures
    let bids: any[] = []
    let asks: any[] = []
    
    if (Array.isArray(data.bids)) {
      bids = data.bids
    } else if (Array.isArray(data.bid)) {
      bids = data.bid
    }
    
    if (Array.isArray(data.asks)) {
      asks = data.asks
    } else if (Array.isArray(data.ask)) {
      asks = data.ask
    }
    
    // Map to our format and validate/filter
    const normalizedBids: OrderBookEntry[] = []
    for (const bid of bids) {
      const price = bid.price || bid[0] || '0'
      const size = bid.size || bid[1] || '0'
      const priceNum = parseFloat(String(price))
      // Only include valid prices
      if (!isNaN(priceNum) && isFinite(priceNum) && priceNum > 0 && priceNum < 1) {
        normalizedBids.push({
          price: String(price),
          size: String(size),
          user: bid.user || bid[2],
        })
      }
    }
    normalizedBids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price)) // Highest first
    
    const normalizedAsks: OrderBookEntry[] = []
    for (const ask of asks) {
      const price = ask.price || ask[0] || '0'
      const size = ask.size || ask[1] || '0'
      const priceNum = parseFloat(String(price))
      // Only include valid prices
      if (!isNaN(priceNum) && isFinite(priceNum) && priceNum > 0 && priceNum < 1) {
        normalizedAsks.push({
          price: String(price),
          size: String(size),
          user: ask.user || ask[2],
        })
      }
    }
    normalizedAsks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price)) // Lowest first
    
    // Return full order book with all metadata
    return {
      market: data.market || marketId,
      asset_id: data.asset_id,
      timestamp: data.timestamp,
      hash: data.hash,
      bids: normalizedBids,
      asks: normalizedAsks,
      min_order_size: data.min_order_size,
      tick_size: data.tick_size,
      neg_risk: data.neg_risk,
    }
  } catch (error) {
    // Silently return empty order book instead of null
    console.warn('Error fetching order book:', error)
    return {
      bids: [],
      asks: [],
      market: marketId,
    }
  }
}

// Get best price for a market outcome
export async function getBestPrice(
  marketId: string,
  outcome: string,
  side: 'buy' | 'sell'
): Promise<MarketPrice | null> {
  try {
    const orderBook = await getOrderBook(marketId, outcome)
    if (!orderBook) return null

    if (side === 'buy' && orderBook.asks.length > 0) {
      const bestAsk = orderBook.asks[0]
      return {
        market: marketId,
        outcome,
        price: parseFloat(bestAsk.price),
        size: parseFloat(bestAsk.size),
      }
    } else if (side === 'sell' && orderBook.bids.length > 0) {
      const bestBid = orderBook.bids[0]
      return {
        market: marketId,
        outcome,
        price: parseFloat(bestBid.price),
        size: parseFloat(bestBid.size),
      }
    }
    return null
  } catch (error) {
    console.error('Error fetching best price:', error)
    return null
  }
}

// Get user positions
export async function getUserPositions(userAddress: string): Promise<any[]> {
  try {
    const response = await fetch(`https://clob.polymarket.com/user_positions?user=${userAddress}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch positions: ${response.statusText}`)
    }
    const data = await response.json()
    return data || []
  } catch (error) {
    console.error('Error fetching user positions:', error)
    return []
  }
}

// Get user orders
export async function getUserOrders(userAddress: string): Promise<any[]> {
  try {
    const response = await fetch(`https://clob.polymarket.com/user_orders?user=${userAddress}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.statusText}`)
    }
    const data = await response.json()
    return data || []
  } catch (error) {
    console.error('Error fetching user orders:', error)
    return []
  }
}

// Place order
export async function placeOrder(params: {
  marketId: string
  outcome: string
  side: Side
  orderType: OrderType
  size: string
  price?: string
  userAddress: string
  apiKey?: string
}): Promise<any> {
  try {
    // For now, we'll use the API directly or show a message
    // Order placement requires proper wallet signing which should be handled
    // through the wallet provider, not the ClobClient directly in browser context
    
    // This is a placeholder - actual implementation would require:
    // 1. Wallet signature
    // 2. Proper authentication
    // 3. Transaction signing
    
    console.log('Order placement requested:', params)
    throw new Error('Order placement requires wallet signature and proper authentication. This feature requires backend integration or wallet signing implementation.')
  } catch (error) {
    console.error('Error placing order:', error)
    throw error
  }
}

// Cancel order
export async function cancelOrder(orderId: string, apiKey?: string): Promise<void> {
  try {
    // Cancel order via API
    // This also requires proper authentication
    const response = await fetch(`https://clob.polymarket.com/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to cancel order: ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error canceling order:', error)
    throw error
  }
}

