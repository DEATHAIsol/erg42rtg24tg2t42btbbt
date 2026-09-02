import { NextRequest, NextResponse } from 'next/server'
import { dbOperations } from '@/lib/db-adapter'
import { getLiveMarkets } from '@/lib/market-feed'

// These routes read request state (search params, body) and hit external
// APIs, so they can never be statically prerendered.
export const dynamic = 'force-dynamic'

// Search all stored markets
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const tags = searchParams.getAll('tags')
    const minVolume = searchParams.get('minVolume')
    const minLiquidity = searchParams.get('minLiquidity')
    const status = (searchParams.get('status') || 'open') as 'open' | 'resolved' | 'all'
    const minOdds = searchParams.get('minOdds')
    const maxOdds = searchParams.get('maxOdds')
    const sortBy = (searchParams.get('sortBy') || 'volume') as 'volume' | 'liquidity' | 'newest' | 'oldest'
    const limit = parseInt(searchParams.get('limit') || '24')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Search markets in database
    let { markets, total } = await dbOperations.searchMarkets(
      query,
      {
        tags: tags.length > 0 ? tags : undefined,
        minVolume: minVolume ? parseInt(minVolume) : undefined,
        minLiquidity: minLiquidity ? parseInt(minLiquidity) : undefined,
        minOdds: minOdds ? parseInt(minOdds) / 100 : undefined, // Convert from cents (0-100) to decimal (0-1)
        status,
        maxOdds: maxOdds ? parseInt(maxOdds) / 100 : undefined,
      },
      sortBy,
      limit,
      offset
    )

    // Same live fallback as /top: without it a cold instance returns nothing
    // and every filter looks broken.
    if (total === 0) {
      const all = await getLiveMarkets()
      const q = query.trim().toLowerCase()
      const wantTags = tags.map((t) => t.toLowerCase())
      const minV = minVolume ? parseInt(minVolume) : 0
      const minL = minLiquidity ? parseInt(minLiquidity) : 0
      const minO = minOdds ? parseInt(minOdds) / 100 : 0
      const maxO = maxOdds ? parseInt(maxOdds) / 100 : 1

      let filtered = all.filter((m: any) => {
        if (status === 'resolved' && !m.closed) return false
        if (status === 'open' && (m.closed || m.active === false)) return false
        if (q && !m.question?.toLowerCase().includes(q) && !m.description?.toLowerCase().includes(q)) return false
        if (wantTags.length && !(m.tags || []).some((t: string) => wantTags.includes(t.toLowerCase()))) return false
        if (minV && (m.volume || 0) < minV) return false
        if (minL && (m.liquidity || 0) < minL) return false
        const y = m.yesPrice
        if (typeof y === 'number' && (y < minO || y > maxO)) return false
        return true
      })

      filtered.sort((a: any, b: any) => {
        if (sortBy === 'liquidity') return (b.liquidity || 0) - (a.liquidity || 0)
        if (sortBy === 'newest') return +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0)
        if (sortBy === 'oldest') return +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0)
        return (b.volume || 0) - (a.volume || 0)
      })

      total = filtered.length
      markets = filtered.slice(offset, offset + limit)
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
    console.error('Error searching markets:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search markets', markets: [], total: 0 },
      { status: 500 }
    )
  }
}

