import { NextRequest, NextResponse } from 'next/server'
import { dbOperations } from '@/lib/db-adapter'

export const dynamic = 'force-dynamic'

const CLOB_BASE = 'https://clob.polymarket.com'

/** Chart ranges mapped onto Polymarket's interval + fidelity (minutes per point). */
const RANGES: Record<string, { interval: string; fidelity: number }> = {
  '1d': { interval: '1d', fidelity: 5 },
  '1w': { interval: '1w', fidelity: 60 },
  '1m': { interval: '1m', fidelity: 180 },
  max: { interval: 'max', fidelity: 720 },
}

/**
 * Real historical prices for a market, proxied from the Polymarket CLOB so the
 * browser isn't blocked by CORS.
 *
 * Returns the Yes-token series. `points: []` means Polymarket has no history
 * for this market yet — the client renders an empty state rather than inventing
 * a chart.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rangeKey = request.nextUrl.searchParams.get('range') || '1w'
  const range = RANGES[rangeKey] || RANGES['1w']

  try {
    const market: any = await dbOperations.getMarketById(params.id)

    let tokenIds: string[] = []
    if (market?.clobTokenIds) {
      tokenIds = Array.isArray(market.clobTokenIds)
        ? market.clobTokenIds
        : JSON.parse(market.clobTokenIds || '[]')
    }

    const yesTokenId = tokenIds[0]
    if (!yesTokenId) {
      return NextResponse.json({ points: [], reason: 'no_token' })
    }

    const url = `${CLOB_BASE}/prices-history?market=${yesTokenId}&interval=${range.interval}&fidelity=${range.fidelity}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return NextResponse.json({ points: [], reason: 'upstream_error' })
    }

    const data = await res.json()
    const history: Array<{ t: number; p: number }> = Array.isArray(data?.history)
      ? data.history
      : []

    // Keep only clean, in-range points and de-duplicate timestamps so the
    // charting library doesn't reject the series.
    const seen = new Set<number>()
    const points = history
      .filter(
        (h) =>
          typeof h?.t === 'number' &&
          typeof h?.p === 'number' &&
          isFinite(h.p) &&
          h.p > 0 &&
          h.p < 1
      )
      .sort((a, b) => a.t - b.t)
      .filter((h) => (seen.has(h.t) ? false : (seen.add(h.t), true)))
      .map((h) => ({ time: h.t, value: h.p }))

    return NextResponse.json({ points, range: rangeKey })
  } catch (error) {
    console.error('[history] failed:', error)
    return NextResponse.json({ points: [], reason: 'error' })
  }
}
