'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PolymarketMarket } from '@/lib/polymarket'
import { formatVolumeCompact } from '@/lib/format'

/** Shared fetch for the landing page: real top markets from the terminal's own API. */
export function useTopMarkets(limit = 12) {
  const [markets, setMarkets] = useState<PolymarketMarket[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch(`/api/markets/top?limit=${limit}&offset=0&sortBy=volume`)
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        const list: PolymarketMarket[] = Array.isArray(data?.markets) ? data.markets : []
        if (cancelled) return
        if (list.length === 0) {
          setStatus('error')
          return
        }
        setMarkets(list)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [limit])

  return { markets, status }
}

const price = (m: PolymarketMarket) => {
  const p = m.yesPrice
  return typeof p === 'number' && isFinite(p) && p > 0 && p < 1 ? p : null
}

/**
 * Top-by-volume includes long-shot markets pinned at 0-1c, which read as dead.
 * Surface the ones actually being contested so the strip shows live movement.
 */
const contested = (m: PolymarketMarket) => {
  const p = price(m)
  return p !== null && p >= 0.04 && p <= 0.96
}

/* ------------------------------------------------------------------ */
/* Ticker                                                              */
/* ------------------------------------------------------------------ */

export function MarketTicker() {
  const { markets, status } = useTopMarkets(60)

  if (status !== 'ready') {
    return <div className="h-9 border-y border-terminal-border bg-terminal-surface/40" />
  }

  const items = markets.filter(contested).slice(0, 12)
  if (items.length === 0) {
    return <div className="h-9 border-y border-terminal-border bg-terminal-surface/40" />
  }

  const row = (key: string) => (
    <div className="marquee-track" key={key} aria-hidden={key === 'b'}>
      {items.map((m) => {
        const p = price(m)!
        const change = (m as any).priceChange24h ?? 0
        return (
          <Link
            key={`${key}-${m.id}`}
            href={`/market/${m.id}`}
            className="flex items-center gap-2.5 px-5 border-r border-terminal-border/60 group whitespace-nowrap"
          >
            <span className="text-xs text-terminal-text-secondary group-hover:text-terminal-text-primary transition-colors max-w-[230px] truncate">
              {m.question}
            </span>
            <span className="num text-xs font-semibold text-terminal-text-primary">
              {(p * 100).toFixed(0)}¢
            </span>
            {change !== 0 && (
              <span
                className={`num text-[11px] ${
                  change > 0 ? 'text-terminal-success' : 'text-terminal-danger'
                }`}
              >
                {change > 0 ? '▲' : '▼'}
                {Math.abs(change).toFixed(1)}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )

  return (
    <div className="relative border-y border-terminal-border bg-terminal-surface/40">
      <div className="marquee h-9 items-center">
        {row('a')}
        {row('b')}
      </div>
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-terminal-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-terminal-bg to-transparent" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Featured markets — real data, editorial list                        */
/* ------------------------------------------------------------------ */

export function FeaturedMarkets() {
  const { markets, status } = useTopMarkets(40)

  if (status === 'loading') {
    return (
      <div className="divide-y divide-terminal-border border-y border-terminal-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-4">
            <div className="skeleton w-9 h-9 rounded-md flex-shrink-0" />
            <div className="skeleton h-4 flex-1 max-w-md" />
            <div className="skeleton h-5 w-12 ml-auto" />
          </div>
        ))}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="border-y border-terminal-border py-10 text-center">
        <p className="text-sm text-terminal-text-secondary">
          Live market feed is unavailable right now.{' '}
          <Link href="/markets" className="text-terminal-accent hover:underline">
            Open the terminal
          </Link>
        </p>
      </div>
    )
  }

  // Only show markets actually being contested — a row pinned at 0c reads as broken.
  const live = markets.filter(contested)
  const items = (live.length >= 3 ? live : markets.filter((m) => price(m) !== null)).slice(0, 5)

  if (items.length === 0) {
    return (
      <div className="border-y border-terminal-border py-10 text-center">
        <p className="text-sm text-terminal-text-secondary">
          No priced markets in the feed right now.{' '}
          <Link href="/markets" className="text-terminal-accent hover:underline">
            Open the terminal
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-terminal-border border-y border-terminal-border">
      {items.map((m) => {
        const p = price(m)
        return (
          <Link
            key={m.id}
            href={`/market/${m.id}`}
            className="flex items-center gap-4 py-4 group"
          >
            <div className="relative w-9 h-9 rounded-md overflow-hidden border border-terminal-border bg-terminal-elevated flex-shrink-0">
              {m.imageUrl && (
                <Image src={m.imageUrl} alt="" fill className="object-cover" sizes="36px" />
              )}
            </div>

            <span className="text-sm text-terminal-text-primary group-hover:text-terminal-accent transition-colors line-clamp-1 flex-1">
              {m.question}
            </span>

            <span className="hidden sm:block num text-xs text-terminal-text-muted flex-shrink-0">
              {formatVolumeCompact(m.volume)}
            </span>

            <div className="w-24 hidden md:block h-1 rounded-full bg-terminal-border overflow-hidden flex-shrink-0">
              {p !== null && (
                <span
                  className="block h-full rounded-full bg-terminal-accent"
                  style={{ width: `${Math.max(p * 100, 2)}%` }}
                />
              )}
            </div>

            <span className="num text-base font-semibold text-terminal-text-primary w-14 text-right flex-shrink-0">
              {p !== null ? `${(p * 100).toFixed(0)}¢` : '—'}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
