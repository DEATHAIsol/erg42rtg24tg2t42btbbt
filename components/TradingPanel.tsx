'use client'

import { useState, useEffect } from 'react'
import { PolymarketMarket } from '@/lib/polymarket'
import { TrendingUp, TrendingDown, Layers, Zap, Target, AlertCircle } from 'lucide-react'
import { useCustodialWallet } from '@/lib/useCustodialWallet'
import { getOrderBook, getBestPrice, placeOrder, OrderType, Side } from '@/lib/clob-client'
import { placePaperOrder } from '@/lib/paper-trading'
import { useToast } from './Toast'
import { playSuccessSound } from '@/lib/sounds'

// Trading fees
const TRADING_FEE_PERCENT = 0.02 // 2% trading fee
const SITE_FEE_SOL = 0.01 // 0.01 SOL site fee per trade

interface TradingPanelProps {
  market: PolymarketMarket
  priceData?: any
}

export function TradingPanel({ market, priceData }: TradingPanelProps) {
  const toast = useToast()
  const { address, balance: accountBalance, balanceUnknown, mode, isSignedIn, connected } = useCustodialWallet()
  const isConnected = connected
  const [selectedOutcome, setSelectedOutcome] = useState<'Yes' | 'No'>('Yes')
  const [amount, setAmount] = useState('')
  const [leverage, setLeverage] = useState(1)
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [limitPrice, setLimitPrice] = useState('')
  const [orderBook, setOrderBook] = useState<any>({ bids: [], asks: [] })
  const [yesPrice, setYesPrice] = useState<number | null>(null)
  const [noPrice, setNoPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
const [loadingOrderBook, setLoadingOrderBook] = useState(false)
const [solPrice, setSolPrice] = useState<number>(180) // Default SOL price in USD

  // Fetch SOL price
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        )
        if (response.ok) {
          const data = await response.json()
          if (data.solana?.usd) {
            setSolPrice(data.solana.usd)
          }
        }
      } catch (error) {
        console.error('Error fetching SOL price:', error)
      }
    }
    
    fetchSolPrice()
    const interval = setInterval(fetchSolPrice, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Always load order book when market changes
    loadOrderBook()
    
    // Set up interval to refresh order book every 5 seconds
    const interval = setInterval(loadOrderBook, 5000)
    
    return () => {
      clearInterval(interval)
    }
  }, [market.id, selectedOutcome])



  
  useEffect(() => {
    // Update prices from priceData if available
    if (priceData) {
      if (priceData.yes?.price !== null && priceData.yes?.price !== undefined && 
          !isNaN(priceData.yes.price) && isFinite(priceData.yes.price) &&
          priceData.yes.price > 0 && priceData.yes.price < 1) {
        setYesPrice(priceData.yes.price)
      }
      if (priceData.no?.price !== null && priceData.no?.price !== undefined &&
          !isNaN(priceData.no.price) && isFinite(priceData.no.price) &&
          priceData.no.price > 0 && priceData.no.price < 1) {
        setNoPrice(priceData.no.price)
      }
      
      // Also try to use order book from priceData if available
      if (selectedOutcome === 'Yes' && priceData.yes?.orderBook) {
        const orderBook = priceData.yes.orderBook
        if (orderBook && ((orderBook.bids && orderBook.bids.length > 0) || (orderBook.asks && orderBook.asks.length > 0))) {
          setOrderBook({
            bids: orderBook.bids || [],
            asks: orderBook.asks || [],
          })
        }
      } else if (selectedOutcome === 'No' && priceData.no?.orderBook) {
        const orderBook = priceData.no.orderBook
        if (orderBook && ((orderBook.bids && orderBook.bids.length > 0) || (orderBook.asks && orderBook.asks.length > 0))) {
          setOrderBook({
            bids: orderBook.bids || [],
            asks: orderBook.asks || [],
          })
        }
      }
    }
  }, [priceData, selectedOutcome])
  
  useEffect(() => {
    // Clear first: the loader deliberately keeps existing data when a book
    // comes back empty, which meant switching Yes<->No could leave the other
    // outcome's ladder on screen.
    setOrderBook({ bids: [], asks: [] })
    loadOrderBook()
  }, [selectedOutcome])

  const loadOrderBook = async () => {
    setLoadingOrderBook(true)
    try {
      const [yesBook, noBook] = await Promise.all([
        getOrderBook(market.id, 'Yes'),
        getOrderBook(market.id, 'No'),
      ])
      
      // Update prices from order book if available (only if we don't already have prices)
      if (yesBook && yesBook.asks && yesBook.asks.length > 0) {
        // Best ask is the LOWEST ask, not the first element of the array.
        const bestAsk = Math.min(...yesBook.asks.map((a: any) => parseFloat(a.price)))
        if (!isNaN(bestAsk) && isFinite(bestAsk) && bestAsk > 0 && bestAsk < 1) {
          // Only update if we don't have a price already
          setYesPrice((prev: number | null) => prev ?? bestAsk)
        }
      }
      if (noBook && noBook.asks && noBook.asks.length > 0) {
        const bestAsk = Math.min(...noBook.asks.map((a: any) => parseFloat(a.price)))
        if (!isNaN(bestAsk) && isFinite(bestAsk) && bestAsk > 0 && bestAsk < 1) {
          // Only update if we don't have a price already
          setNoPrice((prev: number | null) => prev ?? bestAsk)
        }
      }
      
      // Update order book for selected outcome - only if we have data
      // Don't overwrite existing order book with empty data
      if (selectedOutcome === 'Yes' && yesBook) {
        const hasBids = Array.isArray(yesBook.bids) && yesBook.bids.length > 0
        const hasAsks = Array.isArray(yesBook.asks) && yesBook.asks.length > 0
        if (hasBids || hasAsks) {
          setOrderBook({
            bids: Array.isArray(yesBook.bids) ? yesBook.bids : [],
            asks: Array.isArray(yesBook.asks) ? yesBook.asks : [],
          })
        }
        // Don't clear if we don't have data - keep existing
      } else if (selectedOutcome === 'No' && noBook) {
        const hasBids = Array.isArray(noBook.bids) && noBook.bids.length > 0
        const hasAsks = Array.isArray(noBook.asks) && noBook.asks.length > 0
        if (hasBids || hasAsks) {
          setOrderBook({
            bids: Array.isArray(noBook.bids) ? noBook.bids : [],
            asks: Array.isArray(noBook.asks) ? noBook.asks : [],
          })
        }
        // Don't clear if we don't have data - keep existing
      }
      // Don't clear order book if we don't have data - keep what we have
    } catch (error) {
      console.error('Error loading order book:', error)
      // Don't clear on error - keep existing data
    } finally {
      setLoadingOrderBook(false)
    }
  }


  /**
   * Polymarket returns bids ascending and asks descending, so slicing from the
   * front yields the *worst* orders — the far tail of the book — which looked
   * nothing like the quoted price. Sort explicitly instead of trusting order,
   * and take the levels nearest the spread.
   */
  const num = (v: any) => parseFloat(v)
  const topAsks = [...(orderBook?.asks || [])]
    .sort((a: any, b: any) => num(b.price) - num(a.price)) // high -> low
    .slice(-5)                                             // 5 lowest asks
  const topBids = [...(orderBook?.bids || [])]
    .sort((a: any, b: any) => num(b.price) - num(a.price)) // high -> low
    .slice(0, 5)                                           // 5 highest bids

  const currentPrice = selectedOutcome === 'Yes' ? (yesPrice ?? market.yesPrice ?? 0.5) : (noPrice ?? market.noPrice ?? 0.5)

  const handleTrade = async () => {
    if (!isConnected) {
      toast.showWarning('Still loading your account — try again in a second')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.showWarning('Please enter a valid amount')
      return
    }

    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      toast.showWarning('Please enter a valid limit price')
      return
    }

    setLoading(true)
    try {
      const outcome = selectedOutcome === 'Yes' ? 'Yes' : 'No'
      const side = 'BUY' as const
      const price = orderType === 'market'
        ? currentPrice
        : parseFloat(limitPrice) / 100 // Convert cents to decimal

      if (!(price > 0 && price < 1)) {
        toast.showError('This market has no tradeable price right now')
        return
      }

      // `size` is SHARES, not SOL. Each share pays out 1 SOL if the outcome
      // resolves true. Passing SOL here made the engine deduct margin * price
      // instead of margin — i.e. the wrong amount left the balance.
      const size = (parseFloat(amount) * leverage) / price

      // Cost calculation: margin is what user enters, cost is margin * price (actual share cost)
      // Fees are added on top: trading fee (2% of margin) + site fee
      // Total required = margin + trading fee + site fee + buffer
      const margin = parseFloat(amount)
      const tradingFee = margin * TRADING_FEE_PERCENT
      const totalFees = tradingFee + SITE_FEE_SOL
      const totalCost = margin + totalFees // Match what's displayed: margin + fees
      const required = totalCost + 0.01 // Add 0.01 SOL buffer
      const effectiveBalance = accountBalance
      if (effectiveBalance < required) {
        toast.showError(
          `Insufficient ${mode === 'demo' ? 'demo' : ''} balance. Need ${required.toFixed(4)} SOL (includes 0.01 SOL buffer), have ${effectiveBalance.toFixed(4)} SOL`.replace('  ', ' ')
        )
        return
      }

      // Use paper trading instead of real API
      const result = placePaperOrder(
        market.id,
        market.question,
        outcome,
        side,
        size,
        price,
        orderType,
        leverage,
        totalFees
      )

      if (!result.success) {
        toast.showError(result.error || 'Failed to place order')
        return
      }

      if (result.position) {
        playSuccessSound()
        toast.showSuccess(`Position opened! Entry price: ${(price * 100).toFixed(2)}¢`)
      } else if (result.order) {
        playSuccessSound()
        toast.showSuccess(`Limit order placed! Will execute at ${(price * 100).toFixed(2)}¢`)
      }

      setAmount('')
      setLimitPrice('')
      
      // Trigger a custom event to refresh portfolio and balance
      window.dispatchEvent(new CustomEvent('paper-trading-updated'))
    } catch (error: any) {
      console.error('Error placing order:', error)
      toast.showError(`Failed to place order: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const addToParlay = () => {
    const parlays = JSON.parse(localStorage.getItem('parlay-legs') || '[]')
    parlays.push({
      market: market.id,
      outcome: selectedOutcome,
      price: currentPrice,
      question: market.question,
    })
    localStorage.setItem('parlay-legs', JSON.stringify(parlays))
    playSuccessSound()
    toast.showSuccess('Added to parlay! Go to Parlays page to view.')
  }

  // Margin = what you put up (your actual cost)
  const margin = amount ? parseFloat(amount) : 0
  // Position size = leveraged exposure
  const positionSize = margin * leverage
  // Borrowed amount (what you owe back)
  const borrowed = positionSize - margin

  const displayBalance = accountBalance
  const balanceLabel = mode === 'demo' ? 'Demo balance' : 'Balance'
  
  // With leverage: you buy (margin * leverage) worth of shares at currentPrice
  // Gross value if win = positionSize / currentPrice
  const grossValue = margin > 0 && currentPrice > 0 && currentPrice < 1 
    ? positionSize / currentPrice 
    : 0
  
  // Fee calculations - fees are on the MARGIN (your cost), not borrowed amount
  const tradingFee = margin * TRADING_FEE_PERCENT
  const siteFee = SITE_FEE_SOL
  const totalFees = tradingFee + siteFee
  
  // Total cost = margin + fees
  const totalCost = margin + totalFees
  
  // Payout if win = gross value - borrowed amount (pay back the loan)
  const potentialPayout = grossValue - borrowed
  
  // Profit = payout - margin - fees
  const potentialProfit = potentialPayout - totalCost
  
  // USD conversions
  const marginUsd = margin * solPrice
  const totalCostUsd = totalCost * solPrice
  const potentialPayoutUsd = potentialPayout * solPrice

  return (
    <div className="flex flex-col h-full bg-terminal-surface">
      {/* Header */}
      <div className="p-4 border-b border-terminal-border bg-terminal-bg/50">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold">Trade</h3>
              {mode === 'demo' ? (
                <span className="badge-warning !text-[10px]" title="Practice funds — nothing at risk">
                  Demo
                </span>
              ) : (
                <span className="badge !text-[10px]" title="Order execution is simulated in this preview build">
                  Simulated
                </span>
              )}
            </div>
            <p className="text-xs text-terminal-text-muted line-clamp-1">{market.question}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-terminal-text-muted mb-0.5">{balanceLabel}</div>
            <div className="text-sm font-bold text-terminal-accent num">
              {balanceUnknown ? '—' : displayBalance.toFixed(4)} SOL
            </div>
            <div className="text-xs text-terminal-text-muted num">
              ${((displayBalance * solPrice)).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Order Book - Professional Style */}
        <div className="p-4 border-b border-terminal-border bg-terminal-bg/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="section-label">Order Book</h4>
            <span className={`badge !text-[10px] ${selectedOutcome === 'Yes' ? '!text-terminal-success' : '!text-terminal-danger'}`}>{selectedOutcome}</span>
          </div>
          
          {orderBook && (orderBook.bids?.length > 0 || orderBook.asks?.length > 0) ? (
            <div className="space-y-0.5">
              {/* Asks (Sell orders) - Red */}
              <div className="space-y-0.5 mb-2">
                {topAsks.map((ask: any, idx: number) => {
                  const askPrice = parseFloat(ask.price)
                  const askSize = parseFloat(ask.size)
                  const depth = (askSize / (topAsks.reduce((sum: number, a: any) => sum + parseFloat(a.size), 0) || 1)) * 100
                  
                  return (
                    <div key={`ask-${idx}`} className="relative flex items-center justify-between text-xs py-0.5 px-2 rounded group hover:bg-terminal-danger/10 transition-colors">
                      <div 
                        className="absolute right-0 top-0 bottom-0 bg-terminal-danger/20 rounded"
                        style={{ width: `${Math.min(depth, 100)}%` }}
                      />
                      <span className="relative text-terminal-danger font-medium num">{(askPrice * 100).toFixed(2)}¢</span>
                      <span className="relative text-terminal-text-secondary num">{askSize.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
              
              {/* Current Price - Highlighted */}
              <div className="flex items-center justify-between py-2 px-3 bg-terminal-accent/10 border-y border-terminal-accent/30 my-1 rounded-md">
                <span className="text-sm font-bold text-terminal-accent num">{(currentPrice * 100).toFixed(2)}¢</span>
                <span className="text-xs text-terminal-text-secondary">Last price</span>
              </div>
              
              {/* Bids (Buy orders) - Green */}
              <div className="space-y-0.5 mt-2">
                {topBids.map((bid: any, idx: number) => {
                  const bidPrice = parseFloat(bid.price)
                  const bidSize = parseFloat(bid.size)
                  const depth = (bidSize / (topBids.reduce((sum: number, b: any) => sum + parseFloat(b.size), 0) || 1)) * 100
                  
                  return (
                    <div key={`bid-${idx}`} className="relative flex items-center justify-between text-xs py-0.5 px-2 rounded group hover:bg-terminal-success/10 transition-colors">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-terminal-success/20 rounded"
                        style={{ width: `${Math.min(depth, 100)}%` }}
                      />
                      <span className="relative text-terminal-success font-medium num">{(bidPrice * 100).toFixed(2)}¢</span>
                      <span className="relative text-terminal-text-secondary num">{bidSize.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-xl bg-terminal-elevated border border-terminal-border flex items-center justify-center mx-auto mb-3">
                <Layers className="text-terminal-text-muted" size={18} />
              </div>
              <p className="text-xs font-medium text-terminal-text-secondary">No order book data yet</p>
              <p className="text-xs mt-1 text-terminal-text-muted">Refreshes automatically every 5 seconds</p>
            </div>
          )}
        </div>

        {/* Trading Interface */}
        <div className="p-4 space-y-4">
          {/* Outcome Selection */}
          <div>
            <label className="section-label mb-2 block">Outcome</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedOutcome('Yes')}
                className={`relative p-4 rounded-xl border transition-all duration-200 ${
                  selectedOutcome === 'Yes'
                    ? 'bg-terminal-success/10 border-terminal-success shadow-glow-success'
                    : 'bg-terminal-bg border-terminal-border hover:border-terminal-success/50'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <TrendingUp size={16} className={selectedOutcome === 'Yes' ? 'text-terminal-success' : 'text-terminal-text-secondary'} />
                  <span className={`font-bold text-sm ${selectedOutcome === 'Yes' ? 'text-terminal-success' : 'text-terminal-text-primary'}`}>
                    Yes
                  </span>
                </div>
                <div className={`text-lg font-bold num ${selectedOutcome === 'Yes' ? 'text-terminal-success' : 'text-terminal-text-primary'}`}>
                  {yesPrice !== null && yesPrice !== undefined
                    ? `${(yesPrice * 100).toFixed(2)}¢`
                    : market.yesPrice !== null && market.yesPrice !== undefined
                    ? `${(market.yesPrice * 100).toFixed(2)}¢`
                    : '—'}
                </div>
              </button>

              <button
                onClick={() => setSelectedOutcome('No')}
                className={`relative p-4 rounded-xl border transition-all duration-200 ${
                  selectedOutcome === 'No'
                    ? 'bg-terminal-danger/10 border-terminal-danger shadow-glow-danger'
                    : 'bg-terminal-bg border-terminal-border hover:border-terminal-danger/50'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <TrendingDown size={16} className={selectedOutcome === 'No' ? 'text-terminal-danger' : 'text-terminal-text-secondary'} />
                  <span className={`font-bold text-sm ${selectedOutcome === 'No' ? 'text-terminal-danger' : 'text-terminal-text-primary'}`}>
                    No
                  </span>
                </div>
                <div className={`text-lg font-bold num ${selectedOutcome === 'No' ? 'text-terminal-danger' : 'text-terminal-text-primary'}`}>
                  {noPrice !== null && noPrice !== undefined
                    ? `${(noPrice * 100).toFixed(2)}¢`
                    : market.noPrice !== null && market.noPrice !== undefined
                    ? `${(market.noPrice * 100).toFixed(2)}¢`
                    : '—'}
                </div>
              </button>
            </div>
          </div>

          {/* Order Type Toggle */}
          <div>
            <label className="section-label mb-2 block">Order Type</label>
            <div className="flex gap-1 p-1 bg-terminal-bg rounded-lg border border-terminal-border">
              <button
                onClick={() => setOrderType('market')}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all duration-200 inline-flex items-center justify-center gap-1.5 ${
                  orderType === 'market'
                    ? 'bg-terminal-elevated text-terminal-text-primary shadow-sm border border-terminal-border-strong'
                    : 'text-terminal-text-secondary hover:text-terminal-text-primary border border-transparent'
                }`}
              >
                <Zap size={13} />
                Market
              </button>
              <button
                onClick={() => setOrderType('limit')}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all duration-200 inline-flex items-center justify-center gap-1.5 ${
                  orderType === 'limit'
                    ? 'bg-terminal-elevated text-terminal-text-primary shadow-sm border border-terminal-border-strong'
                    : 'text-terminal-text-secondary hover:text-terminal-text-primary border border-transparent'
                }`}
              >
                <Target size={13} />
                Limit
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="section-label">Amount (SOL)</label>
              <button
                onClick={() => {
                  const usable = Math.max(0, (displayBalance - SITE_FEE_SOL - 0.01) / (1 + TRADING_FEE_PERCENT))
                  setAmount(usable > 0 ? usable.toFixed(4) : '0')
                }}
                className="text-[11px] font-semibold text-terminal-accent hover:text-terminal-accent-hover px-2 py-0.5 rounded bg-terminal-accent/10 border border-terminal-accent/30 hover:bg-terminal-accent/15 transition-colors"
              >
                MAX
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0000"
                step="0.0001"
                min="0"
                className="terminal-input !py-3 !text-lg font-semibold num pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-terminal-text-muted pointer-events-none">SOL</span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[1, 5, 10, 50].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val.toString())}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors num ${
                    amount === val.toString()
                      ? 'bg-terminal-accent/10 border-terminal-accent/50 text-terminal-accent'
                      : 'bg-terminal-bg border-terminal-border text-terminal-text-secondary hover:border-terminal-border-strong hover:text-terminal-text-primary'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Limit Price */}
          {orderType === 'limit' && (
            <div className="animate-fade-in">
              <label className="section-label mb-2 block">Limit Price (¢)</label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder={`${(currentPrice * 100).toFixed(2)}`}
                step="0.01"
                min="0"
                max="100"
                className="terminal-input !py-3 !text-lg font-semibold num"
              />
            </div>
          )}

          {/* Leverage Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="section-label">Leverage</label>
              <div className="flex items-center gap-2">
                <span className={`text-base font-bold num ${leverage > 1 ? 'text-terminal-accent' : 'text-terminal-text-secondary'}`}>{leverage}x</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setLeverage(Math.max(1, leverage - 1))}
                    className="w-6 h-6 flex items-center justify-center bg-terminal-bg border border-terminal-border rounded-md hover:border-terminal-border-strong transition-colors text-xs"
                    aria-label="Decrease leverage"
                  >
                    −
                  </button>
                  <button
                    onClick={() => setLeverage(Math.min(10, leverage + 1))}
                    className="w-6 h-6 flex items-center justify-center bg-terminal-bg border border-terminal-border rounded-md hover:border-terminal-border-strong transition-colors text-xs"
                    aria-label="Increase leverage"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-terminal-accent"
              style={{
                background: `linear-gradient(to right, #FF7D5A 0%, #FF7D5A ${((leverage - 1) / 9) * 100}%, #262220 ${((leverage - 1) / 9) * 100}%, #262220 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-terminal-text-muted mt-1.5 num">
              <span>1x</span>
              <span>10x</span>
            </div>
          </div>

          {/* Trade Summary */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-4 bg-terminal-bg rounded-xl border border-terminal-border animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h4 className="section-label">Summary</h4>
                <span className="text-xs text-terminal-text-muted num">SOL ≈ ${solPrice.toFixed(2)}</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-terminal-text-secondary">Cost</span>
                  <span className="font-medium num">{margin.toFixed(4)} SOL <span className="text-terminal-text-muted text-xs">${marginUsd.toFixed(2)}</span></span>
                </div>
                {leverage > 1 && (
                  <div className="flex justify-between">
                    <span className="text-terminal-text-secondary">Position ({leverage}x)</span>
                    <span className="font-medium text-terminal-accent num">{positionSize.toFixed(4)} SOL</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-terminal-text-secondary">Fees</span>
                  <span className="font-medium text-terminal-warning num">{totalFees.toFixed(4)} SOL</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-terminal-border/60">
                  <span className="text-terminal-text-primary font-medium">Total</span>
                  <span className="font-bold num">{totalCost.toFixed(4)} SOL <span className="text-terminal-text-muted text-xs">${totalCostUsd.toFixed(2)}</span></span>
                </div>
                <div className="flex justify-between pt-2 border-t border-terminal-border/60">
                  <span className="text-terminal-text-secondary">Payout if win</span>
                  <span className="font-bold text-terminal-success num">{potentialPayout.toFixed(4)} SOL <span className="text-xs">${potentialPayoutUsd.toFixed(2)}</span></span>
                </div>
                <div className="flex justify-between text-xs text-terminal-text-muted">
                  <span>ROI</span>
                  <span className="text-terminal-success font-medium num">{totalCost > 0 ? ((potentialProfit / totalCost) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleTrade}
              disabled={loading || !isConnected || !amount || parseFloat(amount) <= 0}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 text-white ${
                selectedOutcome === 'Yes'
                  ? 'bg-terminal-success hover:brightness-110 shadow-glow-success'
                  : 'bg-terminal-danger hover:brightness-110 shadow-glow-danger'
              } disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.99]`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Placing order…
                </span>
              ) : !amount || parseFloat(amount) <= 0 ? (
                'Enter an amount'
              ) : (
                `Buy ${selectedOutcome}`
              )}
            </button>

            <button
              onClick={addToParlay}
              className="terminal-button w-full !py-3"
            >
              <Layers size={15} />
              <span>Add to Parlay</span>
            </button>
          </div>

          {mode === 'demo' && (
            <div className="p-3 bg-terminal-warning/10 border border-terminal-warning/30 rounded-xl flex items-start gap-2.5 text-xs text-terminal-warning">
              <AlertCircle size={15} className="flex-shrink-0 mt-px" />
              <span>
                {isSignedIn
                  ? 'Demo mode is on — these orders use practice funds. Switch to Live in the header to trade your real balance.'
                  : 'You\u2019re trading a demo balance. Create an account to trade a real balance and keep your portfolio across devices.'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
