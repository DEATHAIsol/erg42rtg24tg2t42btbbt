import { extractMarketTags } from './category-mapper'
import { parseVolume } from './format'
import { PolymarketMarket } from './polymarket'

const GAMMA = 'https://gamma-api.polymarket.com'

/**
 * Live market feed straight from Polymarket, with a short in-memory cache.
 *
 * This exists so the app works with no database at all. On serverless every
 * instance gets its own empty /tmp, so the SQLite cache is frequently missing
 * — without this, the terminal shows a partial catalogue and the charts and
 * ticker come up blank. The cache is per-instance and deliberately short.
 */
let cache: { at: number; markets: PolymarketMarket[] } | null = null
let inflight: Promise<PolymarketMarket[]> | null = null
const TTL_MS = 5 * 60 * 1000

function transform(m: any, eventTags: string[], category?: string): PolymarketMarket | null {
  const id = m.conditionId || m.id
  if (!id) return null

  let clobTokenIds: string[] = []
  try {
    clobTokenIds =
      typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds || []
  } catch {
    clobTokenIds = []
  }

  let yesPrice: number | null = null
  let noPrice: number | null = null
  try {
    const prices =
      typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices || []
    const y = parseFloat(prices[0])
    const n = parseFloat(prices[1])
    if (isFinite(y) && isFinite(n) && !(y === 0 && n === 0)) {
      yesPrice = y
      noPrice = n
    }
  } catch {
    /* leave null */
  }

  let ended = false
  if (m.endDate) {
    const d = new Date(m.endDate)
    ended = !isNaN(d.getTime()) && d < new Date()
  }
  const tradeable =
    !m.closed && m.active !== false && !ended &&
    ((yesPrice ?? 0) > 0 && (yesPrice ?? 0) < 1)

  return {
    id,
    question: m.question || '',
    description: m.description || '',
    slug: m.slug || id,
    imageUrl: m.image || m.icon,
    endDate: m.endDate,
    startDate: m.startDate,
    outcomes: ['Yes', 'No'],
    volume: parseVolume(m.volume ?? m.volumeNum),
    liquidity: parseVolume(m.liquidity ?? m.liquidityNum),
    active: m.active !== false,
    closed: !tradeable,
    tags: extractMarketTags({ tags: eventTags, category }).map((t) => t.toLowerCase()),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    conditionId: m.conditionId,
    clobTokenIds,
    yesPrice,
    noPrice,
    priceChange24h:
      typeof m.oneDayPriceChange === 'number' ? m.oneDayPriceChange * 100 : null,
  } as PolymarketMarket
}

async function crawl(): Promise<PolymarketMarket[]> {
  const out: PolymarketMarket[] = []
  const seen = new Set<string>()
  let offset = 0

  for (let page = 0; page < 40; page++) {
    const res = await fetch(
      `${GAMMA}/events?active=true&closed=false&limit=100&offset=${offset}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    )
    // 422 means the offset ran past the end of the feed.
    if (!res.ok) break

    const data = await res.json()
    const events = Array.isArray(data) ? data : data.data || []
    if (events.length === 0) break

    for (const ev of events) {
      const tags = Array.isArray(ev?.tags)
        ? ev.tags.map((t: any) => t?.label ?? t?.slug ?? t).filter(Boolean)
        : []
      for (const m of ev?.markets || []) {
        const t = transform(m, tags, ev?.category)
        if (t && !seen.has(t.id)) {
          seen.add(t.id)
          out.push(t)
        }
      }
    }
    offset += events.length
  }
  return out
}

/** All markets from Polymarket, cached briefly per instance. */
export async function getLiveMarkets(): Promise<PolymarketMarket[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.markets
  // Collapse concurrent misses onto one crawl.
  if (inflight) return inflight

  inflight = crawl()
    .then((markets) => {
      if (markets.length > 0) cache = { at: Date.now(), markets }
      return markets
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

/** Look a single market up by condition id, falling back to the live feed. */
export async function getLiveMarketById(id: string): Promise<PolymarketMarket | null> {
  const all = await getLiveMarkets()
  return all.find((m) => m.id === id) || null
}
