import { NextRequest, NextResponse } from 'next/server'
import { dbOperations } from '@/lib/db-adapter'
import { getLiveMarketById } from '@/lib/market-feed'

// These routes read request state (search params, body) and hit external
// APIs, so they can never be statically prerendered.
export const dynamic = 'force-dynamic'

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const marketId = decodeURIComponent(params.id)
    
    // First, try to get from database
    try {
      const dbMarket = await dbOperations.getMarketById(marketId)
      if (dbMarket) {
        // Return database market with proper structure
        return NextResponse.json({
          id: dbMarket.id,
          question: dbMarket.question,
          description: dbMarket.description || '',
          slug: dbMarket.slug || dbMarket.id,
          imageUrl: dbMarket.imageUrl || null,
          endDate: dbMarket.endDate || null,
          startDate: dbMarket.startDate || null,
          outcomes: ['Yes', 'No'],
          volume: dbMarket.volume || 0,
          liquidity: dbMarket.liquidity || 0,
          marketMakerAddress: null,
          active: dbMarket.active !== false,
          archived: false,
          closed: false,
          resolutionSource: null,
          tags: typeof dbMarket.tags === 'string' ? JSON.parse(dbMarket.tags || '[]') : (dbMarket.tags || []),
          createdAt: dbMarket.createdAt || null,
          updatedAt: dbMarket.updatedAt || null,
          conditionId: dbMarket.conditionId || dbMarket.id,
          clobTokenIds: typeof dbMarket.clobTokenIds === 'string' ? JSON.parse(dbMarket.clobTokenIds || '[]') : (dbMarket.clobTokenIds || []),
          yesPrice: dbMarket.yesPrice || null,
          noPrice: dbMarket.noPrice || null,
        })
      }
    } catch (dbError) {
      // Database lookup failed, continue to API fetch
      console.warn('Database lookup failed, trying API:', dbError)
    }
    
    // Gamma's /markets/{id} expects its own numeric id, not a 0x conditionId,
    // so it 422s for our ids. On a cold instance with no cache that left the
    // order book without clobTokenIds and it rendered empty. Resolve from the
    // live feed instead.
    const live = await getLiveMarketById(marketId)
    if (live) {
      return NextResponse.json(live)
    }

    // URL encode the market ID for the API call
    const encodedMarketId = encodeURIComponent(marketId)
    
    const response = await fetch(`${GAMMA_API_BASE}/markets/${encodedMarketId}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      // If 422 or 404, try to get from database as fallback
      if (response.status === 422 || response.status === 404) {
        try {
          const dbMarket = await dbOperations.getMarketById(marketId)
          if (dbMarket) {
            return NextResponse.json({
              id: dbMarket.id,
              question: dbMarket.question,
              description: dbMarket.description || '',
              slug: dbMarket.slug || dbMarket.id,
              imageUrl: dbMarket.imageUrl || null,
              endDate: dbMarket.endDate || null,
              startDate: dbMarket.startDate || null,
              outcomes: ['Yes', 'No'],
              volume: dbMarket.volume || 0,
              liquidity: dbMarket.liquidity || 0,
              marketMakerAddress: null,
              active: dbMarket.active !== false,
              archived: false,
              closed: false,
              resolutionSource: null,
              tags: typeof dbMarket.tags === 'string' ? JSON.parse(dbMarket.tags || '[]') : (dbMarket.tags || []),
              createdAt: dbMarket.createdAt || null,
              updatedAt: dbMarket.updatedAt || null,
              conditionId: dbMarket.conditionId || dbMarket.id,
              clobTokenIds: typeof dbMarket.clobTokenIds === 'string' ? JSON.parse(dbMarket.clobTokenIds || '[]') : (dbMarket.clobTokenIds || []),
              yesPrice: dbMarket.yesPrice || null,
              noPrice: dbMarket.noPrice || null,
            })
          }
        } catch (dbError) {
          console.warn('Database fallback also failed:', dbError)
        }
      }
      
      return NextResponse.json(
        { error: `Failed to fetch market: ${response.statusText} (${response.status})` },
        { status: response.status }
      )
    }

    const market = await response.json()
    
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
    
    // Transform to match our interface
    const transformedMarket = {
      id: market.conditionId || market.id || market._id,
      question: market.question || market.title || '',
      description: market.description || '',
      slug: market.slug || market.conditionId || '',
      imageUrl: market.image || market.imageUrl,
      endDate: market.endDate || market.end_date_iso || market.endDateISO,
      startDate: market.startDate || market.start_date_iso,
      outcomes: market.outcomes || ['Yes', 'No'],
      volume: market.volume || market.volume24h || 0,
      liquidity: market.liquidity || 0,
      marketMakerAddress: market.marketMaker || market.marketMakerAddress,
      active: market.active !== false,
      archived: market.archived || false,
      closed: market.closed || false,
      resolutionSource: market.resolutionSource || market.resolution_source,
      tags: market.tags || market.categories || [],
      createdAt: market.createdAt || market.created_at,
      updatedAt: market.updatedAt || market.updated_at,
      conditionId: market.conditionId,
      clobTokenIds: clobTokenIds,
    }

    return NextResponse.json(transformedMarket)
  } catch (error: any) {
    console.error('Error in market API route:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch market' },
      { status: 500 }
    )
  }
}

