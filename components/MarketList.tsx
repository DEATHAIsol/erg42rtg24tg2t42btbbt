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
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-terminal-text-secondary border-b border-terminal-border">
        <div className="col-span-5">Market</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-2 text-right">24h Change</div>
        <div className="col-span-2 text-right">Volume</div>
        <div className="col-span-1 text-right">Liquidity</div>
      </div>

      {markets.map((market) => {
        const price = getPrice(market)
        const change = getPriceChange(market)
        const isSelected = selectedMarket?.id === market.id

        return (
          <div
            key={market.id}
            onClick={() => onMarketSelect(market)}
            className={`grid grid-cols-12 gap-4 px-4 py-3 rounded cursor-pointer transition-all ${
              isSelected
                ? 'bg-terminal-accent/10 border border-terminal-accent'
                : 'hover:bg-terminal-surface border border-transparent'
            }`}
          >
            <div className="col-span-5">
              <div className="flex items-start gap-3">
                {/* Market Image Icon */}
                <div className="flex-shrink-0">
                  {market.imageUrl ? (
                    <div className="relative w-10 h-10 bg-terminal-bg rounded overflow-hidden border border-terminal-border">
                      <Image
                        src={market.imageUrl}
                        alt={market.question}
                        fill
                        className="object-cover"
                        sizes="40px"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-terminal-bg/50 border border-terminal-border rounded flex items-center justify-center">
                      <ImageIcon size={16} className="text-terminal-text-muted opacity-50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm mb-1">{market.question}</div>
                  <div className="flex items-center gap-2 text-xs text-terminal-text-secondary">
                    {market.tags && market.tags.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-terminal-bg rounded text-xs">
                        {market.tags[0]}
                      </span>
                    )}
                    {market.endDate && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(market.endDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-2 text-right">
              <div className="font-bold">
                {price !== null ? `${(price * 100).toFixed(1)}¢` : 'N/A'}
              </div>
            </div>

            <div className="col-span-2 text-right">
              {price !== null ? (
                <div className={`flex items-center justify-end gap-1 ${
                  change > 0 ? 'text-terminal-success' : 'text-terminal-danger'
                }`}>
                  {change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{change > 0 ? '+' : ''}{change.toFixed(2)}%</span>
                </div>
              ) : (
                <div className="text-terminal-text-muted text-xs">-</div>
              )}
            </div>

            <div className="col-span-2 text-right">
              <div className="text-terminal-text-secondary">
                {formatVolumeCompact(market.volume)}
              </div>
            </div>

            <div className="col-span-1 text-right">
              <div className="text-xs text-terminal-text-secondary">
                ${((market.liquidity || 0) / 1000).toFixed(0)}k
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
