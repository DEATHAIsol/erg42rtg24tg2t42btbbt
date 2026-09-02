'use client'

import { useState, useEffect } from 'react'
import { PolymarketMarket } from '@/lib/polymarket'
import { TrendingUp, TrendingDown, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { formatVolumeCompact } from '@/lib/format'
// Prices are now fetched via bulk API endpoint

interface MarketGridProps {
  markets: PolymarketMarket[]
  onMarketSelect: (market: PolymarketMarket) => void
  selectedMarket: PolymarketMarket | null
}

interface MarketPrice {
  price: number
  change: number
}

export function MarketGrid({ markets, onMarketSelect, selectedMarket }: MarketGridProps) {
  const [prices, setPrices] = useState<Record<string, MarketPrice>>({})

  useEffect(() => {
    // Use prices directly from market data if available, otherwise fetch
    const priceMap: Record<string, MarketPrice> = {}
    
    markets.forEach(market => {
      // First, try to use prices from market data (already fetched from API)
      const price = market.yesPrice !== null && market.yesPrice !== undefined && !isNaN(market.yesPrice)
        ? market.yesPrice
        : (market.noPrice !== null && market.noPrice !== undefined && !isNaN(market.noPrice)
            ? market.noPrice
            : null)
      
      if (price !== null && !isNaN(price) && isFinite(price) && price > 0 && price < 1) {
        // Use priceChange24h from market data if available (stored as percentage)
        const change = (market as any).priceChange24h ?? 0
        priceMap[market.id] = {
          price: price,
          change: change,
        }
      }
    })
    
    // Set prices from market data
    if (Object.keys(priceMap).length > 0) {
      setPrices(priceMap)
    }
    
    // Also fetch updated prices via bulk endpoint for refresh
    const loadPrices = async () => {
      if (markets.length === 0) return
      
      try {
        const marketIds = markets.map(m => m.id)
        const response = await fetch('/api/markets/bulk-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marketIds }),
        })
        
        if (response.ok) {
          const data = await response.json()
          
          markets.forEach(market => {
            const marketPrices = data.prices?.[market.id]
            if (marketPrices) {
              const price = marketPrices.yes !== null && marketPrices.yes !== undefined && !isNaN(marketPrices.yes)
                ? marketPrices.yes 
                : (marketPrices.no !== null && marketPrices.no !== undefined && !isNaN(marketPrices.no) 
                    ? marketPrices.no 
                    : null)
              
              if (price !== null && !isNaN(price) && isFinite(price) && price > 0 && price < 1) {
                priceMap[market.id] = {
                  price: price,
                  change: 0,
                }
              }
            }
          })
          
          if (Object.keys(priceMap).length > 0) {
            setPrices(priceMap)
          }
        }
      } catch (error) {
        console.error('Error loading prices:', error)
      }
    }

    if (markets.length > 0) {
      // Load prices after a short delay to allow initial render
      const timeout = setTimeout(loadPrices, 1000)
      const interval = setInterval(loadPrices, 30000) // Refresh every 30 seconds
      return () => {
        clearTimeout(timeout)
        clearInterval(interval)
      }
    }
  }, [markets])

  const getPrice = (market: PolymarketMarket) => {
    const price = prices[market.id]?.price
    // Return actual price if available, otherwise return null to show N/A
    return price !== undefined && price !== null && !isNaN(price) ? price : null
  }

  const getPriceChange = (market: PolymarketMarket) => {
    return prices[market.id]?.change || 0
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {markets.map((market) => {
        const price = getPrice(market)
        const change = getPriceChange(market)
        const isSelected = selectedMarket?.id === market.id

        return (
          <div
            key={market.id}
            onClick={() => onMarketSelect(market)}
            className={`card-interactive flex flex-col ${
              isSelected ? '!border-terminal-accent ring-2 ring-terminal-accent/20' : ''
            }`}
          >
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-start gap-3 mb-4 flex-1">
                {/* Market Image Icon */}
                <div className="flex-shrink-0">
                  {market.imageUrl ? (
                    <div className="relative w-11 h-11 bg-terminal-bg rounded-lg overflow-hidden border border-terminal-border">
                      <Image
                        src={market.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="44px"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-11 h-11 bg-terminal-elevated border border-terminal-border rounded-lg flex items-center justify-center">
                      <ImageIcon size={18} className="text-terminal-text-muted opacity-50" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-1.5">{market.question}</h3>
                  {market.tags && market.tags.length > 0 && (
                    <span className="badge !py-0 text-[11px] capitalize">{market.tags[0]}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-end justify-between">
                  <span className="text-xs text-terminal-text-secondary pb-0.5">Yes price</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xl num leading-none">
                      {price !== null ? `${(price * 100).toFixed(1)}¢` : '—'}
                    </span>
                    {price !== null && change !== 0 && (
                      <span
                        className={`flex items-center gap-0.5 text-xs font-medium num ${
                          change > 0 ? 'text-terminal-success' : 'text-terminal-danger'
                        }`}
                      >
                        {change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {change > 0 ? '+' : ''}{change.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>

                {price !== null ? (
                  <div>
                    {/* Probability meter: a filled share of a neutral track, so a grid of
                        long-shot markets doesn't read as a wall of red. */}
                    <div className="h-1 rounded-full bg-terminal-border overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full bg-terminal-accent transition-all duration-500"
                        style={{ width: `${Math.max(price * 100, 1.5)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-terminal-text-muted num">
                      <span>Yes {(price * 100).toFixed(0)}%</span>
                      <span>No {((1 - price) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-1 rounded-full bg-terminal-border" title="No price data yet" />
                )}

                <div className="flex items-center justify-between pt-2.5 border-t border-terminal-border text-xs">
                  <span className="text-terminal-text-muted">
                    Vol <span className="text-terminal-text-secondary num">{formatVolumeCompact(market.volume)}</span>
                  </span>
                  {market.endDate && (
                    <span className="text-terminal-text-muted num">
                      Ends {new Date(market.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Skeleton grid shown while markets load */
export function MarketGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="terminal-card p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="skeleton w-11 h-11 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3.5 w-2/3" />
            </div>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="skeleton h-3 w-14" />
            <div className="skeleton h-5 w-16" />
          </div>
          <div className="skeleton h-1.5 w-full rounded-full mb-3" />
          <div className="flex justify-between pt-2.5 border-t border-terminal-border">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

