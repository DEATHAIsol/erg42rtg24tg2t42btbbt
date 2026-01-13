import { NextRequest, NextResponse } from 'next/server'

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

// Get prices for multiple markets at once (for grid/list views)
export async function POST(request: NextRequest) {
  try {
    const { marketIds } = await request.json()
    
    if (!Array.isArray(marketIds) || marketIds.length === 0) {
      return NextResponse.json({ error: 'marketIds array is required' }, { status: 400 })
    }
    
    // Fetch markets from Gamma API to get outcomePrices
    const prices: Record<string, { yes: number | null; no: number | null }> = {}
    
    // Fetch in batches to avoid overwhelming the API
    const batchSize = 10
    for (let i = 0; i < marketIds.length; i += batchSize) {
      const batch = marketIds.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (marketId: string) => {
          try {
            const response = await fetch(`${GAMMA_API_BASE}/markets/${marketId}`, {
              headers: { 'Accept': 'application/json' },
              cache: 'no-store',
            })
            
            if (response.ok) {
              const market = await response.json()
              
              if (market.outcomePrices) {
                let outcomePrices: number[] = []
                if (typeof market.outcomePrices === 'string') {
                  try {
                    const parsed = JSON.parse(market.outcomePrices)
                    outcomePrices = Array.isArray(parsed) 
                      ? parsed.map((p: any) => parseFloat(String(p)))
                      : []
                  } catch {
                    outcomePrices = []
                  }
                } else if (Array.isArray(market.outcomePrices)) {
                  outcomePrices = market.outcomePrices.map((p: any) => parseFloat(String(p)))
                }
                
                // Use prices if they're valid numbers (even if very small)
                // Only skip if both are exactly 0 (closed/resolved market)
                if (outcomePrices.length >= 2) {
                  const yesPrice = outcomePrices[0]
                  const noPrice = outcomePrices[1]
                  
                  // Check if market is closed (both prices are exactly 0)
                  const isClosed = yesPrice === 0 && noPrice === 0
                  
                  // Use prices if they're valid numbers and market is not closed
                  if (!isClosed && !isNaN(yesPrice) && !isNaN(noPrice) && isFinite(yesPrice) && isFinite(noPrice)) {
                    prices[marketId] = {
                      yes: yesPrice,
                      no: noPrice,
                    }
                  } else {
                    // Log for debugging
                    console.log(`Skipping market ${marketId}: closed=${isClosed}, yes=${yesPrice}, no=${noPrice}`)
                  }
                }
              }
            }
          } catch (error) {
            console.warn(`Error fetching price for ${marketId}:`, error)
          }
        })
      )
    }
    
    return NextResponse.json({ prices })
  } catch (error: any) {
    console.error('Error fetching bulk prices:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch prices' },
      { status: 500 }
    )
  }
}

