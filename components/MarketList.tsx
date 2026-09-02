'use client'

import { useState, useEffect } from 'react'
import { PolymarketMarket } from '@/lib/polymarket'
import { TrendingUp, TrendingDown, Clock, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { formatVolumeCompact } from '@/lib/format'

interface MarketListProps {
  markets: PolymarketMarket[]
  onMarketSelect: (market: PolymarketMarket) => void
  selectedMarket: PolymarketMarket | null
}

interface MarketPrice {
  price: number
  change: number
}

export function MarketList({ markets, onMarketSelect, selectedMarket }: MarketListProps) {
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
    return price !== undefined && price !== null && !isNaN(price) && isFinite(price) && price > 0 && price < 1 ? price : null
  }

  const getPriceChange = (market: PolymarketMarket) => {
    return prices[market.id]?.change || 0
  }

  return (
    <div className="terminal-card overflow-hidden">
      <div className="grid grid-cols-12 gap-4 px-4 py-2.5 section-label border-b border-terminal-border bg-terminal-elevated/50">
        <div className="col-span-7 md:col-span-5">Market</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="hidden md:block col-span-2 text-right">24h Change</div>
        <div className="col-span-3 md:col-span-2 text-right">Volume</div>
        <div className="hidden md:block col-span-1 text-right">Liq.</div>
      </div>

      {markets.map((market) => {
        const price = getPrice(market)
        const change = getPriceChange(market)
        const isSelected = selectedMarket?.id === market.id

        return (
          <div
            key={market.id}
            onClick={() => onMarketSelect(market)}
            className={`grid grid-cols-12 gap-4 px-4 py-3 cursor-pointer items-center transition-colors duration-150 border-b border-terminal-border/60 last:border-b-0 ${
              isSelected
                ? 'bg-terminal-accent/10'
                : 'hover:bg-terminal-elevated/60'
            }`}
          >
            <div className="col-span-7 md:col-span-5">
              <div className="flex items-center gap-3">
                {/* Market Image Icon */}
                <div className="flex-shrink-0">
                  {market.imageUrl ? (
                    <div className="relative w-9 h-9 bg-terminal-bg rounded-lg overflow-hidden border border-terminal-border">
                      <Image
                        src={market.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="36px"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 bg-terminal-elevated border border-terminal-border rounded-lg flex items-center justify-center">
                      <ImageIcon size={14} className="text-terminal-text-muted opacity-50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm leading-snug line-clamp-1 mb-0.5">{market.question}</div>
                  <div className="flex items-center gap-2 text-xs text-terminal-text-muted">
                    {market.tags && market.tags.length > 0 && (
                      <span className="capitalize">{market.tags[0]}</span>
                    )}
                    {market.endDate && (
                      <span className="hidden sm:flex items-center gap-1 num">
                        <Clock size={11} />
                        {new Date(market.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-2 text-right">
              <div className="font-bold num text-sm">
                {price !== null ? `${(price * 100).toFixed(1)}¢` : '—'}
              </div>
            </div>

            <div className="hidden md:block col-span-2 text-right">
              {price !== null && change !== 0 ? (
                <div className={`flex items-center justify-end gap-1 text-sm num ${
                  change > 0 ? 'text-terminal-success' : 'text-terminal-danger'
                }`}>
                  {change > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  <span>{change > 0 ? '+' : ''}{change.toFixed(2)}%</span>
                </div>
              ) : (
                <div className="text-terminal-text-muted text-xs">—</div>
              )}
            </div>

            <div className="col-span-3 md:col-span-2 text-right">
              <div className="text-sm text-terminal-text-secondary num">
                {formatVolumeCompact(market.volume)}
              </div>
            </div>

            <div className="hidden md:block col-span-1 text-right">
              <div className="text-xs text-terminal-text-secondary num">
                ${((market.liquidity || 0) / 1000).toFixed(0)}k
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
