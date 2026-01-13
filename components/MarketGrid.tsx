'use client'

import { useState, useEffect } from 'react'
import { PolymarketMarket } from '@/lib/polymarket'
import { TrendingUp, TrendingDown, DollarSign, Image as ImageIcon } from 'lucide-react'
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
        priceMap[market.id] = {
          price: price,
          change: 0, // TODO: Calculate actual change from historical data
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
    return prices[market.id]?.change || (Math.random() - 0.5) * 10
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {markets.map((market) => {
        const price = getPrice(market)
        const change = getPriceChange(market)
        const isSelected = selectedMarket?.id === market.id

        return (
          <div
            key={market.id}
            onClick={() => onMarketSelect(market)}
            className={`terminal-card cursor-pointer transition-all duration-200 hover:border-terminal-accent ${
              isSelected ? 'border-terminal-accent ring-2 ring-terminal-accent/20' : ''
            }`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                {/* Market Image Icon */}
                <div className="flex-shrink-0">
                  {market.imageUrl ? (
                    <div className="relative w-12 h-12 bg-terminal-bg rounded overflow-hidden border border-terminal-border">
                      <Image
                        src={market.imageUrl}
                        alt={market.question}
                        fill
                        className="object-cover"
                        sizes="48px"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-terminal-bg/50 border border-terminal-border rounded flex items-center justify-center">
                      <ImageIcon size={20} className="text-terminal-text-muted opacity-50" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm line-clamp-2 flex-1">{market.question}</h3>
                    {market.tags && market.tags.length > 0 && (
                      <span className="px-2 py-0.5 bg-terminal-bg border border-terminal-border rounded text-xs text-terminal-text-secondary whitespace-nowrap flex-shrink-0">
                        {market.tags[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-terminal-text-secondary">Yes</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">
                      {price !== null ? `${(price * 100).toFixed(1)}¢` : 'N/A'}
                    </span>
                    {price !== null && change > 0 ? (
                      <TrendingUp size={14} className="text-terminal-success" />
                    ) : price !== null && change < 0 ? (
                      <TrendingDown size={14} className="text-terminal-danger" />
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-terminal-text-secondary">
                    <DollarSign size={12} />
                    <span>Vol: {formatVolumeCompact(market.volume)}</span>
                  </div>
                  {price !== null && (
                    <span className={`${change > 0 ? 'text-terminal-success' : 'text-terminal-danger'}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  )}
                </div>

                {price !== null ? (
                  <div className="pt-2 border-t border-terminal-border">
                    <div className="flex gap-1">
                      <div
                        className="h-1 bg-terminal-success rounded"
                        style={{ width: `${price * 100}%` }}
                      />
                      <div
                        className="h-1 bg-terminal-danger rounded"
                        style={{ width: `${(1 - price) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-terminal-border">
                    <div className="text-xs text-terminal-text-muted text-center">No price data</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

