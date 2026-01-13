import { NextRequest, NextResponse } from 'next/server'
import { dbOperations } from '@/lib/db'

// Search all stored markets
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const tags = searchParams.getAll('tags')
    const minVolume = searchParams.get('minVolume')
    const minLiquidity = searchParams.get('minLiquidity')
    const sortBy = (searchParams.get('sortBy') || 'volume') as 'volume' | 'liquidity' | 'newest' | 'oldest'
    const limit = parseInt(searchParams.get('limit') || '24')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Search markets in database
    const { markets, total } = dbOperations.searchMarkets(
      query,
      {
        tags: tags.length > 0 ? tags : undefined,
        minVolume: minVolume ? parseInt(minVolume) : undefined,
        minLiquidity: minLiquidity ? parseInt(minLiquidity) : undefined,
      },
      sortBy,
      limit,
      offset
    )

    // Trigger price sync for visible markets in the background (non-blocking)
    if (markets.length > 0) {
      const marketIds = markets.map(m => m.id)
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
    console.error('Error searching markets:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search markets', markets: [], total: 0 },
      { status: 500 }
    )
  }
}

