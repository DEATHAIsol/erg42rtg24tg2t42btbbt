'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TerminalHeader } from '@/components/TerminalHeader'
import { MarketChart } from '@/components/MarketChart'
import { TradingPanel } from '@/components/TradingPanel'
import { PolymarketMarket, fetchMarkets } from '@/lib/polymarket'
import { ArrowLeft, RefreshCw, ExternalLink, TrendingUp, TrendingDown, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { getPaperTradingState, PaperPosition } from '@/lib/paper-trading'

// Market Description Component
function MarketDescription({ description }: { description: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldTruncate = description.length > 150

  if (!shouldTruncate) {
    return <p className="text-sm text-terminal-text-secondary leading-relaxed">{description}</p>
  }

  return (
    <div>
      <p className="text-sm text-terminal-text-secondary leading-relaxed">
        {isExpanded ? description : `${description.substring(0, 150)}...`}
      </p>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 text-xs text-terminal-accent hover:text-terminal-accent/80 transition-colors"
      >
        {isExpanded ? 'Show Less' : 'See Full Description'}
      </button>
    </div>
  )
}

export default function MarketPage() {
  const params = useParams()
  const router = useRouter()
  const marketId = params.id as string
  
  const [market, setMarket] = useState<PolymarketMarket | null>(null)
  const [loading, setLoading] = useState(true)
  const [marketPrice, setMarketPrice] = useState<any>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [userPositions, setUserPositions] = useState<PaperPosition[]>([])
  const priceRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadMarket()
    return () => {
      if (priceRefreshIntervalRef.current) {
        clearInterval(priceRefreshIntervalRef.current)
      }
    }
  }, [marketId])

  useEffect(() => {
    if (!market) return
    
    loadPriceData()
    const cleanup = loadUserPositions()
    
    return () => {
      if (priceRefreshIntervalRef.current) {
        clearInterval(priceRefreshIntervalRef.current)
        priceRefreshIntervalRef.current = null
      }
      if (cleanup) cleanup()
    }
  }, [market, marketId])

  const loadMarket = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/markets/${marketId}`, { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setMarket(data)
      } else {
        console.error('Failed to load market:', response.status)
      }
    } catch (error) {
      console.error('Error loading market:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPriceData = async () => {
    if (!market) return
    
    const fetchPrice = async () => {
      setLoadingPrice(true)
      try {
        const response = await fetch(`/api/markets/${market.id}/price`, { cache: 'no-store' })
        if (response.ok) {
          const priceData = await response.json()
          
          // Validate and merge price data
          const hasValidYesPrice = priceData.yes?.price !== null && priceData.yes?.price !== undefined &&
                                  !isNaN(priceData.yes.price) && isFinite(priceData.yes.price) &&
                                  priceData.yes.price > 0 && priceData.yes.price < 1
          const hasValidNoPrice = priceData.no?.price !== null && priceData.no?.price !== undefined &&
                                 !isNaN(priceData.no.price) && isFinite(priceData.no.price) &&
                                 priceData.no.price > 0 && priceData.no.price < 1
          const hasYesOrderBook = priceData.yes?.orderBook && 
                                 ((priceData.yes.orderBook.bids?.length > 0) || (priceData.yes.orderBook.asks?.length > 0))
          const hasNoOrderBook = priceData.no?.orderBook && 
                                ((priceData.no.orderBook.bids?.length > 0) || (priceData.no.orderBook.asks?.length > 0))
          
          if (hasValidYesPrice || hasValidNoPrice || hasYesOrderBook || hasNoOrderBook) {
            setMarketPrice((prev: any) => {
              if (!prev) return priceData
              
              return {
                ...priceData,
                yes: {
                  price: hasValidYesPrice ? priceData.yes.price : (prev.yes?.price ?? priceData.yes?.price),
                  buyPrice: priceData.yes?.buyPrice ?? prev.yes?.buyPrice,
                  sellPrice: priceData.yes?.sellPrice ?? prev.yes?.sellPrice,
                  orderBook: hasYesOrderBook ? priceData.yes.orderBook : (prev.yes?.orderBook ?? priceData.yes?.orderBook),
                },
                no: {
                  price: hasValidNoPrice ? priceData.no.price : (prev.no?.price ?? priceData.no?.price),
                  buyPrice: priceData.no?.buyPrice ?? prev.no?.buyPrice,
                  sellPrice: priceData.no?.sellPrice ?? prev.no?.sellPrice,
                  orderBook: hasNoOrderBook ? priceData.no.orderBook : (prev.no?.orderBook ?? priceData.no?.orderBook),
                },
              }
            })
          }
          
          // Trigger background sync
          fetch(`/api/markets/sync-prices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marketIds: [market.id] }),
          }).catch(err => console.warn('Background price sync failed:', err))
        }
      } catch (error) {
        console.error('Failed to fetch market price:', error)
      } finally {
        setLoadingPrice(false)
      }
    }
    
    await fetchPrice()
    priceRefreshIntervalRef.current = setInterval(fetchPrice, 5000)
  }

  const loadUserPositions = () => {
    const state = getPaperTradingState()
    const positions = state.positions.filter(p => p.marketId === marketId)
    setUserPositions(positions)
    
    // Listen for updates
    const handleUpdate = () => {
      const updatedState = getPaperTradingState()
      setUserPositions(updatedState.positions.filter(p => p.marketId === marketId))
    }
    window.addEventListener('paper-trading-updated', handleUpdate)
    return () => window.removeEventListener('paper-trading-updated', handleUpdate)
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-terminal-bg">
        <TerminalHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw size={32} className="animate-spin mx-auto mb-4 text-terminal-accent" />
            <div className="text-terminal-text-secondary">Loading market...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!market) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-terminal-bg">
        <TerminalHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">Market not found</div>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-terminal-accent text-white rounded-lg hover:bg-terminal-accent/90 transition-colors"
            >
              Back to Markets
            </button>
          </div>
        </div>
      </div>
    )
  }

  const yesPrice = marketPrice?.yes?.price ?? market.yesPrice ?? null
  const noPrice = marketPrice?.no?.price ?? market.noPrice ?? null

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-terminal-bg">
      <TerminalHeader />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-terminal-border bg-terminal-surface/50 px-4 lg:px-6 py-3 lg:py-4 flex-shrink-0">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-terminal-text-secondary hover:text-terminal-text-primary transition-colors mb-4"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back to Markets</span>
            </button>
            
            <div className="flex items-start gap-4">
              {/* Market Image */}
              <div className="flex-shrink-0">
                {market.imageUrl ? (
                  <div className="relative w-16 h-16 bg-terminal-bg rounded-lg overflow-hidden border border-terminal-border">
                    <Image
                      src={market.imageUrl}
                      alt={market.question}
                      fill
                      className="object-cover"
                      sizes="64px"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-terminal-bg/50 border border-terminal-border rounded-lg flex items-center justify-center">
                    <ImageIcon size={24} className="text-terminal-text-muted opacity-50" />
                  </div>
                )}
              </div>
              
              {/* Market Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h1 className="text-2xl font-bold text-terminal-text-primary">{market.question}</h1>
                  {market.tags && market.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      {market.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-terminal-bg border border-terminal-border rounded text-xs text-terminal-text-secondary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {market.description && (
                  <div className="mb-4">
                    <MarketDescription description={market.description} />
                  </div>
                )}
                
                {/* Market Stats */}
                <div className="flex items-center gap-6 text-sm">
                  {market.volume && (
                    <div>
                      <span className="text-terminal-text-secondary">Volume: </span>
                      <span className="font-semibold text-terminal-text-primary">
                        ${(market.volume / 1000).toFixed(1)}k
                      </span>
                    </div>
                  )}
                  {market.liquidity && (
                    <div>
                      <span className="text-terminal-text-secondary">Liquidity: </span>
                      <span className="font-semibold text-terminal-text-primary">
                        ${(market.liquidity / 1000).toFixed(1)}k
                      </span>
                    </div>
                  )}
                  {market.endDate && (
                    <div>
                      <span className="text-terminal-text-secondary">Ends: </span>
                      <span className="font-semibold text-terminal-text-primary">
                        {new Date(market.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 lg:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Left Column - Chart and Order Book */}
              <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                {/* Price Display */}
                <div className="terminal-card">
                  <div className="grid grid-cols-2 gap-3 lg:gap-4">
                    <div className="p-3 lg:p-4 bg-terminal-success/10 border border-terminal-success/30 rounded-lg">
                      <div className="text-xs text-terminal-text-secondary mb-1 lg:mb-2 uppercase tracking-wider">Yes Price</div>
                      <div className="text-2xl lg:text-3xl font-bold text-terminal-success mb-1 lg:mb-2">
                        {yesPrice !== null ? `${(yesPrice * 100).toFixed(2)}¢` : 'N/A'}
                      </div>
                      {marketPrice?.yes?.buyPrice && (
                        <div className="text-xs text-terminal-text-muted">
                          Buy: {(marketPrice.yes.buyPrice * 100).toFixed(2)}¢
                        </div>
                      )}
                      {marketPrice?.yes?.sellPrice && (
                        <div className="text-xs text-terminal-text-muted">
                          Sell: {(marketPrice.yes.sellPrice * 100).toFixed(2)}¢
                        </div>
                      )}
                    </div>
                    <div className="p-3 lg:p-4 bg-terminal-danger/10 border border-terminal-danger/30 rounded-lg">
                      <div className="text-xs text-terminal-text-secondary mb-1 lg:mb-2 uppercase tracking-wider">No Price</div>
                      <div className="text-2xl lg:text-3xl font-bold text-terminal-danger mb-1 lg:mb-2">
                        {noPrice !== null ? `${(noPrice * 100).toFixed(2)}¢` : 'N/A'}
                      </div>
                      {marketPrice?.no?.buyPrice && (
                        <div className="text-xs text-terminal-text-muted">
                          Buy: {(marketPrice.no.buyPrice * 100).toFixed(2)}¢
                        </div>
                      )}
                      {marketPrice?.no?.sellPrice && (
                        <div className="text-xs text-terminal-text-muted">
                          Sell: {(marketPrice.no.sellPrice * 100).toFixed(2)}¢
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="terminal-card">
                  <div className="p-3 lg:p-4 border-b border-terminal-border">
                    <h2 className="text-base lg:text-lg font-semibold">Price Chart</h2>
                  </div>
                  <div className="h-64 lg:h-80">
                    <MarketChart market={market} priceData={marketPrice} />
                  </div>
                </div>

                {/* Order Book */}
                <div className="terminal-card">
                  <div className="p-3 lg:p-4 border-b border-terminal-border">
                    <h2 className="text-base lg:text-lg font-semibold">Order Book</h2>
                  </div>
                  <div className="p-3 lg:p-4">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Yes Order Book */}
                      <div>
                        <h3 className="text-sm font-medium text-terminal-success mb-3">Yes</h3>
                        {marketPrice?.yes?.orderBook && 
                         (marketPrice.yes.orderBook.bids?.length > 0 || marketPrice.yes.orderBook.asks?.length > 0) ? (
                          <div className="space-y-1">
                            {/* Asks */}
                            <div className="space-y-0.5 mb-2">
                              {marketPrice.yes.orderBook.asks?.slice(0, 5).reverse().map((ask: any, idx: number) => (
                                <div key={`yes-ask-${idx}`} className="flex justify-between text-xs py-1">
                                  <span className="text-terminal-danger">{(parseFloat(ask.price) * 100).toFixed(2)}¢</span>
                                  <span className="text-terminal-text-secondary">{parseFloat(ask.size).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            {/* Current Price */}
                            <div className="flex justify-between py-2 px-2 bg-terminal-accent/10 border-y border-terminal-accent/30 my-1">
                              <span className="text-sm font-bold text-terminal-accent">
                                {yesPrice !== null ? `${(yesPrice * 100).toFixed(2)}¢` : 'N/A'}
                              </span>
                              <span className="text-xs text-terminal-text-secondary">Current</span>
                            </div>
                            {/* Bids */}
                            <div className="space-y-0.5 mt-2">
                              {marketPrice.yes.orderBook.bids?.slice(0, 5).map((bid: any, idx: number) => (
                                <div key={`yes-bid-${idx}`} className="flex justify-between text-xs py-1">
                                  <span className="text-terminal-success">{(parseFloat(bid.price) * 100).toFixed(2)}¢</span>
                                  <span className="text-terminal-text-secondary">{parseFloat(bid.size).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-terminal-text-muted py-4 text-center">No order book data</div>
                        )}
                      </div>

                      {/* No Order Book */}
                      <div>
                        <h3 className="text-sm font-medium text-terminal-danger mb-3">No</h3>
                        {marketPrice?.no?.orderBook && 
                         (marketPrice.no.orderBook.bids?.length > 0 || marketPrice.no.orderBook.asks?.length > 0) ? (
                          <div className="space-y-1">
                            {/* Asks */}
                            <div className="space-y-0.5 mb-2">
                              {marketPrice.no.orderBook.asks?.slice(0, 5).reverse().map((ask: any, idx: number) => (
                                <div key={`no-ask-${idx}`} className="flex justify-between text-xs py-1">
                                  <span className="text-terminal-danger">{(parseFloat(ask.price) * 100).toFixed(2)}¢</span>
                                  <span className="text-terminal-text-secondary">{parseFloat(ask.size).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            {/* Current Price */}
                            <div className="flex justify-between py-2 px-2 bg-terminal-accent/10 border-y border-terminal-accent/30 my-1">
                              <span className="text-sm font-bold text-terminal-accent">
                                {noPrice !== null ? `${(noPrice * 100).toFixed(2)}¢` : 'N/A'}
                              </span>
                              <span className="text-xs text-terminal-text-secondary">Current</span>
                            </div>
                            {/* Bids */}
                            <div className="space-y-0.5 mt-2">
                              {marketPrice.no.orderBook.bids?.slice(0, 5).map((bid: any, idx: number) => (
                                <div key={`no-bid-${idx}`} className="flex justify-between text-xs py-1">
                                  <span className="text-terminal-success">{(parseFloat(bid.price) * 100).toFixed(2)}¢</span>
                                  <span className="text-terminal-text-secondary">{parseFloat(bid.size).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-terminal-text-muted py-4 text-center">No order book data</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Trading Panel and Positions */}
              <div className="space-y-4 lg:space-y-6">
                {/* Trading Panel */}
                <div className="terminal-card p-0 overflow-hidden">
                  <TradingPanel market={market} priceData={marketPrice} />
                </div>

                {/* User Positions */}
                {userPositions.length > 0 && (
                  <div className="terminal-card">
                    <div className="p-3 lg:p-4 border-b border-terminal-border">
                      <h2 className="text-base lg:text-lg font-semibold">Your Positions</h2>
                    </div>
                    <div className="p-3 lg:p-4 space-y-2 lg:space-y-3 max-h-64 overflow-y-auto">
                      {userPositions.map((position) => {
                        const currentPrice = position.outcome === 'Yes' ? yesPrice : noPrice
                        const pnl = currentPrice !== null 
                          ? (position.side === 'BUY' 
                              ? (currentPrice - position.entryPrice) * position.size * position.leverage
                              : (position.entryPrice - currentPrice) * position.size * position.leverage)
                          : 0
                        
                        return (
                          <div
                            key={position.id}
                            className="p-3 bg-terminal-bg border border-terminal-border rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                position.outcome === 'Yes' 
                                  ? 'bg-terminal-success/20 text-terminal-success' 
                                  : 'bg-terminal-danger/20 text-terminal-danger'
                              }`}>
                                {position.outcome} {position.side}
                              </span>
                              <span className="text-xs text-terminal-text-secondary">{position.leverage}x</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                              <div>
                                <span className="text-terminal-text-secondary">Size: </span>
                                <span className="font-mono">{position.size.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-terminal-text-secondary">Entry: </span>
                                <span className="font-mono">{(position.entryPrice * 100).toFixed(2)}¢</span>
                              </div>
                            </div>
                            <div className={`text-sm font-semibold ${
                              pnl > 0 ? 'text-terminal-success' : pnl < 0 ? 'text-terminal-danger' : ''
                            }`}>
                              {pnl > 0 ? '+' : ''}{pnl.toFixed(4)} SOL P&L
                            </div>
                          </div>
                        )
                      })}
                      <button
                        onClick={() => router.push('/portfolio')}
                        className="w-full mt-2 px-4 py-2 bg-terminal-surface border border-terminal-border rounded-lg hover:border-terminal-accent transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <span>View All Positions</span>
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

