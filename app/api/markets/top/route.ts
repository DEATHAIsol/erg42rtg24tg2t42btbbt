import { NextRequest, NextResponse } from 'next/server'
import { dbOperations } from '@/lib/db-adapter'

// These routes read request state (search params, body) and hit external
// APIs, so they can never be statically prerendered.
export const dynamic = 'force-dynamic'

// Get top markets (for main page display)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '500')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = (searchParams.get('sortBy') || 'volume') as 'volume' | 'liquidity' | 'newest' | 'oldest'
    const status = (searchParams.get('status') || 'open') as 'open' | 'resolved' | 'all'

    // Get top markets from database
    const { markets, total } = await dbOperations.getTopMarkets(limit, offset, sortBy, status)

    // Trigger price sync for visible markets in the background (non-blocking)
    if (markets.length > 0) {
      const marketIds = markets.map((m: any) => m.id)
      // Don't await - let it run in background
      fetch(`${request.nextUrl.origin}/api/markets/sync-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketIds }),
      }).catch(err => {
        console.warn('Background price sync failed:', err)
      })
    }

    return NextResponse.json({
      markets,
      total,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Error getting top markets:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get top markets', markets: [], total: 0 },
      { status: 500 }
    )
  }
}

