import { NextRequest, NextResponse } from 'next/server'

const CLOB_API_BASE = 'https://clob.polymarket.com'
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

// Get real-time price information for a market
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const marketId = params.id
    
    // Step 1: Fetch market data directly from Gamma API to get outcomePrices and clobTokenIds
    let gammaMarket: any = null
    try {
      const gammaResponse = await fetch(`${GAMMA_API_BASE}/markets/${marketId}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      })
      
      if (gammaResponse.ok) {
        gammaMarket = await gammaResponse.json()
      }
    } catch (error) {
      console.warn('Error fetching from Gamma API:', error)
    }
    
    // Step 2: Extract outcomePrices from Gamma API (primary source)
    let yesPrice: number | null = null
    let noPrice: number | null = null
    
    if (gammaMarket?.outcomePrices) {
      let outcomePrices: number[] = []
      if (typeof gammaMarket.outcomePrices === 'string') {
        try {
          const parsed = JSON.parse(gammaMarket.outcomePrices)
          outcomePrices = Array.isArray(parsed) 
            ? parsed.map((p: any) => parseFloat(String(p)))
            : []
        } catch {
          outcomePrices = []
        }
      } else if (Array.isArray(gammaMarket.outcomePrices)) {
        outcomePrices = gammaMarket.outcomePrices.map((p: any) => parseFloat(String(p)))
      }
      
      if (outcomePrices.length >= 2) {
        const yesPriceRaw = outcomePrices[0]
        const noPriceRaw = outcomePrices[1]
        
        // Check if market is closed (both prices are 0)
        const isClosed = yesPriceRaw === 0 && noPriceRaw === 0
        
        if (!isClosed && !isNaN(yesPriceRaw) && !isNaN(noPriceRaw)) {
          yesPrice = yesPriceRaw
          noPrice = noPriceRaw
        }
      }
    }
    
    // Step 3: Fetch price from CLOB price endpoint (more accurate)
    const fetchClobPrice = async (tokenId: string, side: 'BUY' | 'SELL') => {
      try {
        const priceResponse = await fetch(`${CLOB_API_BASE}/price?token_id=${encodeURIComponent(tokenId)}&side=${side}`, {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
        })
        
        if (priceResponse.ok) {
          const priceData = await priceResponse.json()
          // Handle error response
          if (priceData.error) {
            return null
          }
          if (priceData.price) {
            const price = parseFloat(priceData.price)
            if (!isNaN(price) && isFinite(price) && price > 0 && price < 1) {
              return price
            }
          }
        }
      } catch (error) {
        console.warn(`Error fetching CLOB price for ${tokenId}:`, error)
      }
      return null
    }
    
    // Step 3.5: Get market from database to use stored clobTokenIds
    let dbMarket: any = null
    try {
      const { dbOperations } = await import('@/lib/db')
      dbMarket = dbOperations.getMarketById(marketId)
    } catch (error) {
      console.warn('Error fetching market from database:', error)
    }
    
    // Step 3.6: Get clobTokenIds - Priority: database -> Gamma API
    let yesTokenId: string | null = null
    let noTokenId: string | null = null
    
    // Helper to parse clobTokenIds
    const parseClobTokenIds = (clobTokenIds: any): string[] => {
      if (!clobTokenIds) return []
      if (Array.isArray(clobTokenIds)) return clobTokenIds
      if (typeof clobTokenIds === 'string') {
        try {
          const parsed = JSON.parse(clobTokenIds)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      }
      return []
    }
    
    // First try database
    if (dbMarket?.clobTokenIds) {
      const clobTokenIds = parseClobTokenIds(dbMarket.clobTokenIds)
      if (clobTokenIds.length >= 2) {
        yesTokenId = clobTokenIds[0]
        noTokenId = clobTokenIds[1]
      }
    }
    
    // Fallback to Gamma API
    if ((!yesTokenId || !noTokenId) && gammaMarket?.clobTokenIds) {
      const clobTokenIds = parseClobTokenIds(gammaMarket.clobTokenIds)
      if (clobTokenIds.length >= 2) {
        yesTokenId = clobTokenIds[0]
        noTokenId = clobTokenIds[1]
      }
    }
    
    // Fallback to conditionId format
    if (!yesTokenId || !noTokenId) {
      const conditionId = gammaMarket?.conditionId || dbMarket?.conditionId
      if (conditionId && conditionId !== 'null' && conditionId !== 'undefined' && conditionId.length > 0) {
        yesTokenId = `${conditionId}-0`
        noTokenId = `${conditionId}-1`
      }
    }
    
    // Step 4: Try to get order books from CLOB API if clobTokenIds are available
    const fetchOrderBook = async (tokenId: string) => {
      try {
        const bookResponse = await fetch(`${CLOB_API_BASE}/book?token_id=${encodeURIComponent(tokenId)}`, {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
        })
        
        if (bookResponse.ok) {
          const bookData = await bookResponse.json()
          if (!bookData.error || !bookData.error.includes('No orderbook')) {
            const bids = bookData.bids || bookData.bid || []
            const asks = bookData.asks || bookData.ask || []
            
            // Sort and validate order book entries
            const sortedBids = Array.isArray(bids) 
              ? bids
                  .map((b: any) => ({
                    price: String(b.price || b[0] || '0'),
                    size: String(b.size || b[1] || '0'),
                    user: b.user || b[2],
                  }))
                  .filter((b: any) => {
                    const price = parseFloat(b.price)
                    return !isNaN(price) && isFinite(price) && price > 0 && price < 1
                  })
                  .sort((a: any, b: any) => parseFloat(b.price) - parseFloat(a.price)) // Highest bid first
              : []
            
            const sortedAsks = Array.isArray(asks)
              ? asks
                  .map((a: any) => ({
                    price: String(a.price || a[0] || '0'),
                    size: String(a.size || a[1] || '0'),
                    user: a.user || a[2],
                  }))
                  .filter((a: any) => {
                    const price = parseFloat(a.price)
                    return !isNaN(price) && isFinite(price) && price > 0 && price < 1
                  })
                  .sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price)) // Lowest ask first
              : []
            
            // Get best prices from order book
            let bestAsk: number | null = null
            let bestBid: number | null = null
            
            if (sortedAsks.length > 0) {
              bestAsk = parseFloat(sortedAsks[0].price)
            }
            if (sortedBids.length > 0) {
              bestBid = parseFloat(sortedBids[0].price)
            }
            
            return {
              bids: sortedBids,
              asks: sortedAsks,
              bestAsk,
              bestBid,
            }
          }
        }
      } catch (error) {
        console.warn(`Error fetching order book for ${tokenId}:`, error)
      }
      
      return { bids: [], asks: [], bestAsk: null, bestBid: null }
    }
    
    // This section is now handled earlier (Step 3.6) - keeping for reference but code moved up
    
    // Fetch prices and order books for both outcomes in parallel
    const [yesBuyPrice, yesSellPrice, noBuyPrice, noSellPrice, yesBookData, noBookData] = await Promise.all([
      yesTokenId ? fetchClobPrice(yesTokenId, 'BUY') : Promise.resolve(null),
      yesTokenId ? fetchClobPrice(yesTokenId, 'SELL') : Promise.resolve(null),
      noTokenId ? fetchClobPrice(noTokenId, 'BUY') : Promise.resolve(null),
      noTokenId ? fetchClobPrice(noTokenId, 'SELL') : Promise.resolve(null),
      yesTokenId ? fetchOrderBook(yesTokenId) : Promise.resolve({ bids: [], asks: [], bestAsk: null, bestBid: null }),
      noTokenId ? fetchOrderBook(noTokenId) : Promise.resolve({ bids: [], asks: [], bestAsk: null, bestBid: null }),
    ])
    
    // Priority: Gamma outcomePrices > CLOB price endpoint > Order book best prices
    // For Yes: use buy price (best ask) as the price to buy Yes
    const finalYesPrice = yesPrice ?? yesBuyPrice ?? (yesBookData.bestAsk ?? yesBookData.bestBid ?? null)
    // For No: use buy price (best ask) as the price to buy No
    const finalNoPrice = noPrice ?? noBuyPrice ?? (noBookData.bestAsk ?? noBookData.bestBid ?? null)
    
    // Final fallback: calculate from the other outcome (they should sum to ~1)
    const finalYesPriceCalculated = finalYesPrice ?? (finalNoPrice !== null && finalNoPrice > 0 && finalNoPrice < 1 ? 1 - finalNoPrice : null)
    const finalNoPriceCalculated = finalNoPrice ?? (finalYesPrice !== null && finalYesPrice > 0 && finalYesPrice < 1 ? 1 - finalYesPrice : null)
    
    // Validate prices are within valid range
    const validatedYesPrice = (finalYesPriceCalculated !== null && finalYesPriceCalculated > 0 && finalYesPriceCalculated < 1) ? finalYesPriceCalculated : null
    const validatedNoPrice = (finalNoPriceCalculated !== null && finalNoPriceCalculated > 0 && finalNoPriceCalculated < 1) ? finalNoPriceCalculated : null

    return NextResponse.json({
      marketId,
      yes: {
        price: validatedYesPrice,
        buyPrice: yesBuyPrice ?? yesBookData.bestAsk ?? validatedYesPrice,
        sellPrice: yesSellPrice ?? yesBookData.bestBid ?? validatedYesPrice,
        buySize: yesBookData.asks.length > 0 ? parseFloat(yesBookData.asks[0].size) : null,
        sellSize: yesBookData.bids.length > 0 ? parseFloat(yesBookData.bids[0].size) : null,
        orderBook: {
          bids: yesBookData.bids.slice(0, 20), // Top 20 bids
          asks: yesBookData.asks.slice(0, 20), // Top 20 asks
        },
      },
      no: {
        price: validatedNoPrice,
        buyPrice: noBuyPrice ?? noBookData.bestAsk ?? validatedNoPrice,
        sellPrice: noSellPrice ?? noBookData.bestBid ?? validatedNoPrice,
        buySize: noBookData.asks.length > 0 ? parseFloat(noBookData.asks[0].size) : null,
        sellSize: noBookData.bids.length > 0 ? parseFloat(noBookData.bids[0].size) : null,
        orderBook: {
          bids: noBookData.bids.slice(0, 20), // Top 20 bids
          asks: noBookData.asks.slice(0, 20), // Top 20 asks
        },
      },
      timestamp: new Date().toISOString(),
      source: yesPrice !== null || noPrice !== null ? 'gamma' : (yesBuyPrice !== null || noBuyPrice !== null ? 'clob-price' : 'clob-book'),
    })
  } catch (error: any) {
    console.error('Error fetching market price:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch market price' },
      { status: 500 }
    )
  }
}
