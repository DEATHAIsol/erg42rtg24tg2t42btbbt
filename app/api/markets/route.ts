import { NextRequest, NextResponse } from 'next/server'
import { extractMarketTags } from '@/lib/category-mapper'
import { parseVolume } from '@/lib/format'

// These routes read request state (search params, body) and hit external
// APIs, so they can never be statically prerendered.
export const dynamic = 'force-dynamic'

// Gamma API endpoint for fetching markets
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const active = searchParams.get('active')
    const closed = searchParams.get('closed')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const tags = searchParams.getAll('tags')

    const queryParams = new URLSearchParams()
    // Always filter for active markets only
    queryParams.append('active', 'true')
    queryParams.append('closed', 'false')
    if (limit) queryParams.append('limit', limit)
    if (offset) queryParams.append('offset', offset)
    // Note: Tag filtering is done client-side for better control
    // If tags are provided, we can still pass them but client-side filtering is more reliable
    if (tags.length > 0) {
      tags.forEach(tag => queryParams.append('tags', tag))
    }

    // This is the emergency path used when the market store is unavailable
    // (e.g. a cold serverless instance). It crawls /events rather than
    // /markets: /markets silently caps a page at 100 no matter what `limit`
    // asks for, which is why this fallback used to surface only a couple of
    // dozen markets.
    const wanted = Math.min(parseInt(limit || '500', 10) || 500, 3000)
    const startOffset = parseInt(offset || '0', 10) || 0

    let markets: any[] = []
    let evOffset = startOffset
    let pages = 0

    while (markets.length < wanted && pages < 40) {
      const evUrl =
        `${GAMMA_API_BASE}/events?active=true&closed=false&limit=100&offset=${evOffset}`
      const response = await fetch(evUrl, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      // 422 = offset ran past the end of the feed, a normal terminator.
      if (!response.ok) break

      const data = await response.json()
      const events = Array.isArray(data) ? data : data.data || []
      if (events.length === 0) break

      for (const event of events) {
        const eventTags = Array.isArray(event?.tags)
          ? event.tags.map((t: any) => t?.label ?? t?.slug ?? t).filter(Boolean)
          : []
        for (const m of event?.markets || []) {
          // Filter as we crawl: an open event still contains resolved markets,
          // and slicing before filtering is what capped this path so low.
          if (m?.active === false || m?.closed === true) continue
          markets.push({ ...m, tags: eventTags, category: event?.category })
        }
      }

      evOffset += events.length
      pages++
    }

    markets = markets.slice(0, wanted)

    const transformedMarkets = markets
      .filter((market: any) => {
        // Ensure we only return active, non-closed markets
        const isActive = market.active !== false && market.closed !== true
        return isActive
      })
      .map((market: any) => {
        // Use the new category mapper to extract tags
        const marketTags = extractMarketTags(market).map(tag => tag.toLowerCase())
        
        // Parse clobTokenIds if it's a JSON string
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
        
        // Parse outcomePrices if available
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
          closed: market.closed || false,
          resolutionSource: market.resolutionSource || market.resolution_source,
          tags: marketTags, // Normalized lowercase tags array
          createdAt: market.createdAt || market.created_at,
          updatedAt: market.updatedAt || market.updated_at,
          conditionId: market.conditionId,
          clobTokenIds: clobTokenIds,
          // Include prices directly in market data
          yesPrice: yesPrice,
          noPrice: noPrice,
        }
      })

    return NextResponse.json(transformedMarkets)
  } catch (error: any) {
    console.error('Error in markets API route:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch markets' },
      { status: 500 }
    )
  }
}

