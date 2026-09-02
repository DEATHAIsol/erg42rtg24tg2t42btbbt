import { NextRequest, NextResponse } from 'next/server'
import { dbOperations } from '@/lib/db-adapter'

// These routes read request state (search params, body) and hit external
// APIs, so they can never be statically prerendered.
export const dynamic = 'force-dynamic'

const CLOB_API_BASE = 'https://clob.polymarket.com'
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

// Sync prices for multiple markets
export async function POST(request: NextRequest) {
  try {
    const { marketIds } = await request.json()
    
    if (!Array.isArray(marketIds) || marketIds.length === 0) {
      return NextResponse.json(
        { error: 'marketIds array is required' },
        { status: 400 }
      )
    }

    // Limit batch size to avoid overwhelming the API
    const batchSize = 10
    const results = []
    
    // Process markets in batches
    for (let i = 0; i < marketIds.length; i += batchSize) {
      const batch = marketIds.slice(i, i + batchSize)
      
      // Fetch prices for batch in parallel
      const pricePromises = batch.map(async (marketId: string) => {
        try {
          // Get market data from database first (optional - we can fetch from Gamma API directly)
          const market = await dbOperations.getMarketById(marketId)
          // Don't fail if market not in DB - we can still fetch from Gamma API

          // Fetch market data from Gamma API to get outcomePrices and clobTokenIds
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
            console.warn(`Error fetching Gamma API for ${marketId}:`, error)
          }

          // Extract outcomePrices from Gamma API (primary source)
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
              
              const isClosed = yesPriceRaw === 0 && noPriceRaw === 0
              
              if (!isClosed && !isNaN(yesPriceRaw) && !isNaN(noPriceRaw)) {
                yesPrice = yesPriceRaw
                noPrice = noPriceRaw
              }
            }
          }

          // Get clobTokenIds - Priority: database -> Gamma API
          let yesTokenId: string | null = null
          let noTokenId: string | null = null
          
          // Helper to parse clobTokenIds from various formats
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
          
          // First try database (most reliable)
          if (market?.clobTokenIds) {
            const clobTokenIds = parseClobTokenIds(market.clobTokenIds)
            if (clobTokenIds.length >= 2) {
              yesTokenId = clobTokenIds[0]
              noTokenId = clobTokenIds[1]
              console.log(`Using clobTokenIds from database for ${marketId}: Yes(${yesTokenId}), No(${noTokenId})`)
            }
          }
          
          // Fallback to Gamma API if not in database
          if ((!yesTokenId || !noTokenId) && gammaMarket?.clobTokenIds) {
            const clobTokenIds = parseClobTokenIds(gammaMarket.clobTokenIds)
            if (clobTokenIds.length >= 2) {
              yesTokenId = clobTokenIds[0]
              noTokenId = clobTokenIds[1]
              console.log(`Using clobTokenIds from Gamma API for ${marketId}: Yes(${yesTokenId}), No(${noTokenId})`)
            }
          }
          
          // Fallback to conditionId-outcomeIndex format
          // Priority: gammaMarket conditionId -> market from DB conditionId -> marketId (if it looks like conditionId)
          if (!yesTokenId || !noTokenId) {
            let conditionId = gammaMarket?.conditionId || market?.conditionId
            // If still no conditionId, try using marketId directly (some markets use marketId as conditionId)
            if (!conditionId || conditionId === 'null' || conditionId === 'undefined' || conditionId.length === 0) {
              // Check if marketId looks like a conditionId (starts with 0x and is hex, length > 10)
              if (marketId && marketId.startsWith('0x') && /^0x[0-9a-fA-F]+$/.test(marketId) && marketId.length > 10) {
                conditionId = marketId
                console.log(`Using marketId as conditionId for ${marketId}`)
              }
            }
            
            if (conditionId && conditionId !== 'null' && conditionId !== 'undefined' && conditionId.length > 0) {
              yesTokenId = `${conditionId}-0`
              noTokenId = `${conditionId}-1`
              console.log(`Using conditionId ${conditionId} for order book fetch (Yes: ${yesTokenId}, No: ${noTokenId})`)
            } else {
              console.log(`⚠️ No conditionId/clobTokenIds for market ${marketId}, skipping order book fetch`)
              yesTokenId = null
              noTokenId = null
            }
          }

          // Fetch CLOB prices and order books in parallel
          const [yesBuyPrice, yesSellPrice, noBuyPrice, noSellPrice, yesBookData, noBookData] = await Promise.all([
            yesTokenId ? fetchClobPrice(yesTokenId, 'BUY') : Promise.resolve(null),
            yesTokenId ? fetchClobPrice(yesTokenId, 'SELL') : Promise.resolve(null),
            noTokenId ? fetchClobPrice(noTokenId, 'BUY') : Promise.resolve(null),
            noTokenId ? fetchClobPrice(noTokenId, 'SELL') : Promise.resolve(null),
            yesTokenId ? fetchOrderBook(yesTokenId) : Promise.resolve({ bids: [], asks: [] }),
            noTokenId ? fetchOrderBook(noTokenId) : Promise.resolve({ bids: [], asks: [] }),
          ])
          
          // Log order book fetch results for debugging
          if (yesTokenId || noTokenId) {
            const yesOBStatus = yesBookData ? `${yesBookData.bids?.length || 0} bids, ${yesBookData.asks?.length || 0} asks` : 'none'
            const noOBStatus = noBookData ? `${noBookData.bids?.length || 0} bids, ${noBookData.asks?.length || 0} asks` : 'none'
            console.log(`Order book for ${marketId}: Yes(${yesOBStatus}), No(${noOBStatus}) [YesToken: ${yesTokenId}, NoToken: ${noTokenId}]`)
          }

          // Priority: Gamma outcomePrices > CLOB price endpoint > Order book best prices
          const finalYesPrice = yesPrice ?? yesBuyPrice ?? (yesBookData.asks.length > 0 ? parseFloat(yesBookData.asks[0].price) : null)
          const finalNoPrice = noPrice ?? noBuyPrice ?? (noBookData.asks.length > 0 ? parseFloat(noBookData.asks[0].price) : null)

          // Validate prices
          const validatedYesPrice = (finalYesPrice !== null && !isNaN(finalYesPrice) && isFinite(finalYesPrice) && finalYesPrice > 0 && finalYesPrice < 1) ? finalYesPrice : null
          const validatedNoPrice = (finalNoPrice !== null && !isNaN(finalNoPrice) && isFinite(finalNoPrice) && finalNoPrice > 0 && finalNoPrice < 1) ? finalNoPrice : null

          // Update database (only if market exists in DB)
          try {
            // Store order book data if we have bids or asks
            const yesOB = (yesBookData && ((yesBookData.bids && yesBookData.bids.length > 0) || (yesBookData.asks && yesBookData.asks.length > 0))) ? yesBookData : undefined
            const noOB = (noBookData && ((noBookData.bids && noBookData.bids.length > 0) || (noBookData.asks && noBookData.asks.length > 0))) ? noBookData : undefined
            
            await dbOperations.updateMarketPrices(marketId, {
              yesPrice: validatedYesPrice,
              noPrice: validatedNoPrice,
              yesBuyPrice: yesBuyPrice,
              yesSellPrice: yesSellPrice,
              noBuyPrice: noBuyPrice,
              noSellPrice: noSellPrice,
              yesOrderBook: yesOB,
              noOrderBook: noOB,
            })
            
            // Log order book storage
            if (yesOB || noOB) {
              console.log(`✅ Stored order book for ${marketId}: Yes(${yesOB ? (yesOB.bids?.length || 0) + ' bids, ' + (yesOB.asks?.length || 0) + ' asks' : 'none'}), No(${noOB ? (noOB.bids?.length || 0) + ' bids, ' + (noOB.asks?.length || 0) + ' asks' : 'none'})`)
            } else {
              console.log(`⚠️ No order book data to store for ${marketId} (Yes: ${yesBookData?.bids?.length || 0} bids/${yesBookData?.asks?.length || 0} asks, No: ${noBookData?.bids?.length || 0} bids/${noBookData?.asks?.length || 0} asks)`)
            }
          } catch (dbError) {
            // Market might not exist in DB yet - that's okay, we still return the price data
            console.warn(`Could not update prices in DB for ${marketId}:`, dbError)
          }

          return { 
            marketId, 
            success: true,
            yesPrice: validatedYesPrice,
            noPrice: validatedNoPrice,
          }
        } catch (error: any) {
          console.error(`Error syncing price for ${marketId}:`, error)
          return { marketId, success: false, error: error.message }
        }
      })

      const batchResults = await Promise.all(pricePromises)
      results.push(...batchResults)
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < marketIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      synced: successful,
      failed,
      results,
    })
  } catch (error: any) {
    console.error('Error syncing prices:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync prices' },
      { status: 500 }
    )
  }
}

// Helper function to fetch CLOB price
async function fetchClobPrice(tokenId: string, side: 'BUY' | 'SELL'): Promise<number | null> {
  try {
    const priceResponse = await fetch(`${CLOB_API_BASE}/price?token_id=${encodeURIComponent(tokenId)}&side=${side}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    })
    
    if (priceResponse.ok) {
      const priceData = await priceResponse.json()
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
    // Silently fail
  }
  return null
}

// Helper function to fetch order book
async function fetchOrderBook(tokenId: string): Promise<{
  market?: string
  asset_id?: string
  timestamp?: string
  hash?: string
  bids: any[]
  asks: any[]
  min_order_size?: string
  tick_size?: string
  neg_risk?: boolean
}> {
  try {
    const url = `${CLOB_API_BASE}/book?token_id=${encodeURIComponent(tokenId)}`
    const bookResponse = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    })
    
    if (bookResponse.ok) {
      const bookData = await bookResponse.json()
      
      // Check for "no orderbook" error
      if (bookData.error && (bookData.error.includes('No orderbook') || bookData.error.includes('not found'))) {
        console.log(`No orderbook for token ${tokenId}: ${bookData.error}`)
        return { bids: [], asks: [] }
      }
      
      const bids = bookData.bids || bookData.bid || []
      const asks = bookData.asks || bookData.ask || []
      
      // Sort and validate bids/asks
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
            .sort((a: any, b: any) => parseFloat(b.price) - parseFloat(a.price))
            .slice(0, 20)
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
            .sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price))
            .slice(0, 20)
        : []
      
      if (sortedBids.length > 0 || sortedAsks.length > 0) {
        console.log(`✅ Fetched order book for ${tokenId}: ${sortedBids.length} bids, ${sortedAsks.length} asks`)
      }
      
      // Return full order book data including metadata
      return {
        market: bookData.market,
        asset_id: bookData.asset_id,
        timestamp: bookData.timestamp,
        hash: bookData.hash,
        bids: sortedBids,
        asks: sortedAsks,
        min_order_size: bookData.min_order_size,
        tick_size: bookData.tick_size,
        neg_risk: bookData.neg_risk,
      }
    } else {
      const errorData = await bookResponse.json().catch(() => ({}))
      console.log(`Order book fetch failed for ${tokenId}: ${bookResponse.status} - ${errorData.error || 'Unknown error'}`)
    }
  } catch (error: any) {
    console.warn(`Error fetching order book for ${tokenId}:`, error.message)
  }
  return { bids: [], asks: [] }
}

