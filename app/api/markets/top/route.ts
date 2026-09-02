import { NextRequest, NextResponse } from 'next/server'
import { dbOperations } from '@/lib/db-adapter'
import { getLiveMarkets } from '@/lib/market-feed'

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

    let markets: any[] = []
    let total = 0

    try {
      const res = await dbOperations.getTopMarkets(limit, offset, sortBy, status)
      markets = res.markets
      total = res.total
    } catch {
      // database unavailable — handled by the live fallback below
    }

    // A cold serverless instance has an empty per-instance cache, which used to
    // surface as a near-empty catalogue. Serve straight from Polymarket instead.
    if (total === 0) {
      const all = await getLiveMarkets()
      const filtered =
        status === 'all'
          ? all
          : status === 'resolved'
          ? all.filter((m: any) => m.closed)
          : all.filter((m: any) => !m.closed && m.active !== false)

      const sorted = [...filtered].sort((a: any, b: any) => {
        if (sortBy === 'liquidity') return (b.liquidity || 0) - (a.liquidity || 0)
        if (sortBy === 'newest') return +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0)
        if (sortBy === 'oldest') return +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0)
        return (b.volume || 0) - (a.volume || 0)
      })

      total = sorted.length
      markets = sorted.slice(offset, offset + limit)
    }

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

