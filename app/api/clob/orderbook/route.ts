import { NextRequest, NextResponse } from 'next/server'

// These routes read request state (search params, body) and hit external
// APIs, so they can never be statically prerendered.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const marketId = searchParams.get('marketId')
    const outcome = searchParams.get('outcome')

    if (!marketId || !outcome) {
      return NextResponse.json(
        { error: 'marketId and outcome are required' },
        { status: 400 }
      )
    }

    // Try to get market data to use actual clobTokenIds if available
    let tokenId: string
    try {
      const marketResponse = await fetch(`${request.nextUrl.origin}/api/markets/${marketId}`)
      if (marketResponse.ok) {
        const market = await marketResponse.json()
        if (market.clobTokenIds && Array.isArray(market.clobTokenIds) && market.clobTokenIds.length >= 2) {
          // Use actual CLOB token IDs
          tokenId = outcome === 'Yes' ? market.clobTokenIds[0] : market.clobTokenIds[1]
        } else {
          // Fallback: use conditionId-outcomeIndex format
          const conditionId = market.conditionId || marketId
          const outcomeIndex = outcome === 'Yes' ? '0' : '1'
          tokenId = `${conditionId}-${outcomeIndex}`
        }
      } else {
        // Fallback: use marketId-outcomeIndex format
        const outcomeIndex = outcome === 'Yes' ? '0' : '1'
        tokenId = `${marketId}-${outcomeIndex}`
      }
    } catch {
      // Fallback: use marketId-outcomeIndex format
      const outcomeIndex = outcome === 'Yes' ? '0' : '1'
      tokenId = `${marketId}-${outcomeIndex}`
    }
    
    // Try the CLOB API endpoint
    const url = `https://clob.polymarket.com/book?token_id=${encodeURIComponent(tokenId)}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      // If 404 or error response, check if it's a "no orderbook" message
      const errorData = await response.json().catch(() => ({}))
      
      // Return empty order book for "no orderbook" errors
      if (response.status === 404 || errorData.error?.includes('No orderbook')) {
        return NextResponse.json({
          bids: [],
          asks: [],
          market: marketId,
        })
      }
      
      return NextResponse.json(
        { error: errorData.error || `Failed to fetch order book: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Handle "no orderbook" success response
    if (data.error && data.error.includes('No orderbook')) {
      return NextResponse.json({
        bids: [],
        asks: [],
        market: marketId,
      })
    }
    
    // Handle different response formats
    const bids = data.bids || data.bid || []
    const asks = data.asks || data.ask || []
    
    // Return full order book data including metadata
    return NextResponse.json({
      market: data.market || marketId,
      asset_id: data.asset_id,
      timestamp: data.timestamp,
      hash: data.hash,
      bids: Array.isArray(bids) ? bids : [],
      asks: Array.isArray(asks) ? asks : [],
      min_order_size: data.min_order_size,
      tick_size: data.tick_size,
      neg_risk: data.neg_risk,
    })
  } catch (error: any) {
    console.error('Error in orderbook API route:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order book' },
      { status: 500 }
    )
  }
}

