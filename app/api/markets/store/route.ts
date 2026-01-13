import { NextRequest, NextResponse } from 'next/server'
import { dbOperations } from '@/lib/db-adapter'
import { PolymarketMarket } from '@/lib/polymarket'
import { extractMarketTags } from '@/lib/category-mapper'
import { parseVolume } from '@/lib/format'

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

// Store all markets in the backend
export async function POST(request: NextRequest) {
  try {
    // Clear existing markets to reset database
    console.log('Clearing existing markets from database...')
    await dbOperations.clearAll()
    console.log('Database cleared. Starting fresh market sync...')

    // Fetch ALL active markets directly from Gamma API
    let totalStored = 0
    let offset = 0
    const batchSize = 500 // API limit is 500 per request
    const dbBatchSize = 500 // Store in database in batches for better performance
    let hasMore = true
    let consecutiveEmptyBatches = 0
    let batchBuffer: PolymarketMarket[] = []

    console.log('Starting full market sync - fetching ALL active markets...')
    
    // Current time for expiration check
    const now = new Date()

    // Continue fetching until no more markets are available
    // Increase consecutive empty batch threshold to ensure we get all markets
    while (hasMore && consecutiveEmptyBatches < 10) {
      try {
        const url = `${GAMMA_API_BASE}/markets?active=true&closed=false&limit=${batchSize}&offset=${offset}`
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          console.error(`Failed to fetch markets batch at offset ${offset}: ${response.statusText}`)
          hasMore = false
          break
        }

        const data = await response.json()
        let markets = Array.isArray(data) ? data : (data.data || [])

        // Filter for active markets
        markets = markets.filter((market: any) => {
          return market.active !== false && market.closed !== true
        })

        if (!markets || markets.length === 0) {
          consecutiveEmptyBatches++
          console.log(`Empty batch at offset ${offset}, consecutive empty: ${consecutiveEmptyBatches}`)
          if (consecutiveEmptyBatches >= 5) {
            console.log('Stopping: 5 consecutive empty batches - no more markets available')
            hasMore = false
            break
          }
          offset += batchSize
          continue
        }

        consecutiveEmptyBatches = 0
        console.log(`Fetched ${markets.length} markets in batch at offset ${offset}`)

        // Transform markets to match our interface
        const transformedMarkets = markets
          .map((market: any) => {
            // Use the new category mapper to extract tags
            const marketTags = extractMarketTags(market).map(tag => tag.toLowerCase())
            
            // Parse clobTokenIds
            let clobTokenIds: string[] = []
            if (market.clobTokenIds) {
              if (typeof market.clobTokenIds === 'string') {
                try {
                  clobTokenIds = JSON.parse(market.clobTokenIds)
                } catch {
                  clobTokenIds = []
                }
              } else if (Array.isArray(market.clobTokenIds)) {
                clobTokenIds = market.clobTokenIds
              }
            }
            
            // Parse outcomePrices
            let yesPrice: number | null = null
            let noPrice: number | null = null
            
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
              
              if (outcomePrices.length >= 2) {
                const yesPriceRaw = outcomePrices[0]
                const noPriceRaw = outcomePrices[1]
                const isClosed = yesPriceRaw === 0 && noPriceRaw === 0
                
                if (!isClosed && !isNaN(yesPriceRaw) && !isNaN(noPriceRaw) && isFinite(yesPriceRaw) && isFinite(noPriceRaw)) {
                  yesPrice = yesPriceRaw
                  noPrice = noPriceRaw
                }
              }
            }
            
            return {
              id: market.conditionId || market.id || market._id,
              question: market.question || market.title || '',
              description: market.description || '',
              slug: market.slug || market.conditionId || '',
              imageUrl: market.image || market.imageUrl,
              endDate: market.endDate || market.end_date_iso || market.endDateISO,
              startDate: market.startDate || market.start_date_iso,
              outcomes: market.outcomes || ['Yes', 'No'],
              volume: parseVolume(market.volume || market.volume24h || market.volumeUSD || market.volumeNum),
              liquidity: parseVolume(market.liquidity || market.liquidityUSD || market.liquidityNum),
              marketMakerAddress: market.marketMaker || market.marketMakerAddress,
              active: market.active !== false,
              archived: market.archived || false,
              closed: market.closed !== false,
              resolutionSource: market.resolutionSource || market.resolution_source,
              tags: marketTags,
              createdAt: market.createdAt || market.created_at,
              updatedAt: market.updatedAt || market.updated_at,
              conditionId: market.conditionId,
              clobTokenIds: clobTokenIds,
              yesPrice: yesPrice,
              noPrice: noPrice,
            } as PolymarketMarket
          })
          // Filter out markets with no price data and expired markets
          .filter((market: PolymarketMarket) => {
            // Check if market has valid price data
            const hasYesPrice = market.yesPrice !== null && market.yesPrice !== undefined && !isNaN(market.yesPrice) && market.yesPrice > 0 && market.yesPrice < 1
            const hasNoPrice = market.noPrice !== null && market.noPrice !== undefined && !isNaN(market.noPrice) && market.noPrice > 0 && market.noPrice < 1
            const hasPriceData = hasYesPrice || hasNoPrice
            
            if (!hasPriceData) {
              return false
            }
            
            // Check if market has expired (endDate is in the past)
            if (market.endDate) {
              try {
                const endDate = new Date(market.endDate)
                if (isNaN(endDate.getTime())) {
                  // Invalid date format, exclude this market
                  return false
                }
                // Exclude markets that have already ended
                if (endDate < now) {
                  return false
                }
              } catch (error) {
                // Invalid date, exclude this market
                return false
              }
            }
            
            return true
          })

        // Add to buffer
        batchBuffer.push(...transformedMarkets)
        offset += batchSize

        // Store in database when buffer reaches batch size
        if (batchBuffer.length >= dbBatchSize) {
          console.log(`Storing batch of ${batchBuffer.length} markets in database...`)
          await dbOperations.upsertMarkets(batchBuffer)
          totalStored += batchBuffer.length
          console.log(`Total stored so far: ${totalStored} markets`)
          batchBuffer = [] // Clear buffer
        }

        // If we got fewer markets than requested, we might be near the end
        // But continue checking - API might return partial batches
        if (markets.length === 0) {
          console.log(`Received 0 markets at offset ${offset} - checking if more exist...`)
          // Don't stop immediately - might be a temporary gap
        } else if (markets.length < batchSize) {
          console.log(`Received ${markets.length} markets (less than batch size ${batchSize}) at offset ${offset} - continuing to check for more...`)
        }

        // Log progress every 10 batches
        if (offset % (batchSize * 10) === 0 || !hasMore) {
          console.log(`Progress: Fetched ${totalStored + batchBuffer.length} markets so far (offset: ${offset})...`)
        }

      } catch (batchError: any) {
        console.error(`Error fetching batch at offset ${offset}:`, batchError)
        consecutiveEmptyBatches++
        if (consecutiveEmptyBatches >= 5) {
          console.log('Stopping: 5 consecutive errors - aborting sync')
          hasMore = false
          break
        }
        offset += batchSize
      }
    }

    // Store any remaining markets in buffer
    if (batchBuffer.length > 0) {
      console.log(`Storing final batch of ${batchBuffer.length} markets in database...`)
      await dbOperations.upsertMarkets(batchBuffer)
      totalStored += batchBuffer.length
      console.log(`Stored final batch. Total stored in this sync: ${totalStored} markets`)
    }
    
    // Verify the store was updated
    const stats = await dbOperations.getStats()
    console.log(`✅ Market sync complete!`)
    console.log(`   - Markets synced in this run: ${totalStored}`)
    console.log(`   - Total markets in database: ${stats.totalMarkets}`)
    console.log(`   - Last updated: ${stats.lastUpdated}`)

    return NextResponse.json({
      success: true,
      count: totalStored,
      storedCount: stats.totalMarkets,
      message: `Successfully synced ${totalStored} active markets to database. Total in database: ${stats.totalMarkets}`,
    })
  } catch (error: any) {
    console.error('Error storing markets:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to store markets',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// Get store status
export async function GET() {
  try {
    const stats = await dbOperations.getStats()
    console.log(`GET /api/markets/store - Stats: ${JSON.stringify(stats)}`)
    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error getting store stats:', error)
    return NextResponse.json(
      { 
        totalMarkets: 0,
        lastUpdated: null,
        updateInProgress: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

