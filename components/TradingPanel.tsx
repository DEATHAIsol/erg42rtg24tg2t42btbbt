'use client'

import { useState, useEffect } from 'react'
import { PolymarketMarket } from '@/lib/polymarket'
import { TrendingUp, TrendingDown, Layers, Zap, Target, DollarSign, AlertCircle } from 'lucide-react'
import { useCustodialWallet } from '@/lib/useCustodialWallet'
import { getOrderBook, getBestPrice, placeOrder, OrderType, Side } from '@/lib/clob-client'
import { placePaperOrder, getPaperTradingState } from '@/lib/paper-trading'
import { fetchWalletBalanceHelius } from '@/lib/helius-api'
import { getDemoMode } from '@/lib/demo-mode'
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
  const { publicKey, connected } = useCustodialWallet()
  const address = publicKey?.toString() || null
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
const [paperBalance, setPaperBalance] = useState(0)
const [walletBalance, setWalletBalance] = useState<number | null>(null)
const [demoMode, setDemoMode] = useState<boolean>(false)
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
    
    // Load paper trading balance
    const updateBalance = () => {
      const state = getPaperTradingState()
      setPaperBalance(state.balance)
    }
    updateBalance()
    
    // Listen for paper trading updates
    window.addEventListener('paper-trading-updated', updateBalance)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('paper-trading-updated', updateBalance)
    }
  }, [market.id, selectedOutcome])

  // Load real wallet balance (live mode)
  useEffect(() => {
    if (!address) {
      setWalletBalance(null)
      return
    }

    let intervalId: NodeJS.Timeout | null = null

    const loadWalletBalance = async () => {
      try {
        const bal = await fetchWalletBalanceHelius(address)
        setWalletBalance(bal)
      } catch {
        setWalletBalance(0)
      }
    }

    loadWalletBalance()
    intervalId = setInterval(loadWalletBalance, 30000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [address])

  // Demo mode toggle listener
  useEffect(() => {
    setDemoMode(getDemoMode())
    const handleDemo = (e: Event) => {
      const enabled = (e as CustomEvent)?.detail?.enabled
      if (typeof enabled === 'boolean') {
        setDemoMode(enabled)
      } else {
        setDemoMode(getDemoMode())
      }
    }
    window.addEventListener('demo-mode-updated', handleDemo)
    return () => {
      window.removeEventListener('demo-mode-updated', handleDemo)
    }
  }, [])

  // Load real wallet balance via Helius (custodial wallet)
  useEffect(() => {
    if (!address) {
      setWalletBalance(null)
      return
    }

    let intervalId: NodeJS.Timeout | null = null

    const loadWalletBalance = async () => {
      try {
        const bal = await fetchWalletBalanceHelius(address)
        setWalletBalance(bal)
      } catch {
        // On failure, treat as 0 as per requirement
        setWalletBalance(0)
      }
    }

    loadWalletBalance()
    intervalId = setInterval(loadWalletBalance, 30000)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [address])
  
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
    // Reload order book when outcome changes
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
        const bestAsk = parseFloat(yesBook.asks[0].price)
        if (!isNaN(bestAsk) && isFinite(bestAsk) && bestAsk > 0 && bestAsk < 1) {
          // Only update if we don't have a price already
          setYesPrice((prev: number | null) => prev ?? bestAsk)
        }
      }
      if (noBook && noBook.asks && noBook.asks.length > 0) {
        const bestAsk = parseFloat(noBook.asks[0].price)
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

  const currentPrice = selectedOutcome === 'Yes' ? (yesPrice ?? market.yesPrice ?? 0.5) : (noPrice ?? market.noPrice ?? 0.5)

  const handleTrade = async () => {
    if (!isConnected || !address) {
      toast.showWarning('Please connect your wallet to trade')
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
      const size = parseFloat(amount) * leverage
      const price = orderType === 'market' 
        ? currentPrice 
        : parseFloat(limitPrice) / 100 // Convert cents to decimal

      // Cost calculation: margin is what user enters, cost is margin * price (actual share cost)
      // Fees are added on top: trading fee (2% of margin) + site fee
      // Total required = margin + trading fee + site fee + buffer
      const margin = parseFloat(amount)
      const tradingFee = margin * TRADING_FEE_PERCENT
      const totalFees = tradingFee + SITE_FEE_SOL
      const totalCost = margin + totalFees // Match what's displayed: margin + fees
      const required = totalCost + 0.01 // Add 0.01 SOL buffer
      const effectiveBalance = demoMode ? paperBalance : (walletBalance ?? 0)
      if (effectiveBalance < required) {
        toast.showError(`Insufficient balance. Need ${required.toFixed(4)} SOL (includes 0.01 SOL buffer), have ${effectiveBalance.toFixed(4)} SOL`)
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
        leverage
      )

      if (!result.success) {
        toast.showError(result.error || 'Failed to place order')
        return
      }

      // Update balance display
      const state = getPaperTradingState()
      setPaperBalance(state.balance)

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

  const displayBalance = demoMode ? paperBalance : (walletBalance ?? 0)
  const balanceLabel = demoMode ? 'Demo Balance' : 'Balance'
  
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
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-terminal-text-secondary mb-1">Trading Interface</h3>
            <p className="text-xs text-terminal-text-muted line-clamp-1">{market.question}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-terminal-text-muted mb-0.5">{balanceLabel}</div>
            <div className="text-sm font-bold text-terminal-accent">
              {displayBalance.toFixed(4)} SOL
            </div>
            <div className="text-xs text-terminal-text-muted">
              ${((displayBalance * solPrice)).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Order Book - Professional Style */}
        <div className="p-4 border-b border-terminal-border bg-terminal-bg/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-terminal-text-secondary uppercase tracking-wide">Order Book</h4>
            <span className="text-xs text-terminal-text-muted">{selectedOutcome}</span>
          </div>
          
          {orderBook && (orderBook.bids?.length > 0 || orderBook.asks?.length > 0) ? (
            <div className="space-y-0.5">
              {/* Asks (Sell orders) - Red */}
              <div className="space-y-0.5 mb-2">
                {orderBook.asks.slice(0, 5).reverse().map((ask: any, idx: number) => {
                  const askPrice = parseFloat(ask.price)
                  const askSize = parseFloat(ask.size)
                  const depth = (askSize / (orderBook.asks.reduce((sum: number, a: any) => sum + parseFloat(a.size), 0) || 1)) * 100
                  
                  return (
                    <div key={`ask-${idx}`} className="relative flex items-center justify-between text-xs py-0.5 px-2 rounded group hover:bg-terminal-danger/10 transition-colors">
                      <div 
                        className="absolute right-0 top-0 bottom-0 bg-terminal-danger/20 rounded"
                        style={{ width: `${Math.min(depth * 2, 100)}%` }}
                      />
                      <span className="relative text-terminal-danger font-medium">{(askPrice * 100).toFixed(2)}¢</span>
                      <span className="relative text-terminal-text-secondary">{askSize.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
              
              {/* Current Price - Highlighted */}
              <div className="flex items-center justify-between py-2 px-3 bg-terminal-accent/10 border-y border-terminal-accent/30 my-1">
                <span className="text-sm font-bold text-terminal-accent">{(currentPrice * 100).toFixed(2)}¢</span>
                <span className="text-xs text-terminal-text-secondary">Current</span>
              </div>
              
              {/* Bids (Buy orders) - Green */}
              <div className="space-y-0.5 mt-2">
                {orderBook.bids.slice(0, 5).map((bid: any, idx: number) => {
                  const bidPrice = parseFloat(bid.price)
                  const bidSize = parseFloat(bid.size)
                  const depth = (bidSize / (orderBook.bids.reduce((sum: number, b: any) => sum + parseFloat(b.size), 0) || 1)) * 100
                  
                  return (
                    <div key={`bid-${idx}`} className="relative flex items-center justify-between text-xs py-0.5 px-2 rounded group hover:bg-terminal-success/10 transition-colors">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-terminal-success/20 rounded"
                        style={{ width: `${Math.min(depth * 2, 100)}%` }}
                      />
                      <span className="relative text-terminal-success font-medium">{(bidPrice * 100).toFixed(2)}¢</span>
                      <span className="relative text-terminal-text-secondary">{bidSize.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-terminal-text-muted">
              <Layers className="mx-auto mb-2 opacity-50" size={24} />
              <p className="text-xs">No order book data available</p>
              <p className="text-xs mt-1 opacity-75">This market may not have active orders yet</p>
              <p className="text-xs mt-2 opacity-50">Order book refreshes every 5 seconds</p>
            </div>
          )}
        </div>

        {/* Trading Interface */}
        <div className="p-4 space-y-4">
          {/* Outcome Selection - Enhanced */}
          <div>
            <label className="text-xs font-semibold text-terminal-text-secondary mb-2 block uppercase tracking-wide">Select Outcome</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedOutcome('Yes')}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedOutcome === 'Yes'
                    ? 'bg-terminal-success/10 border-terminal-success shadow-lg shadow-terminal-success/20'
                    : 'bg-terminal-surface border-terminal-border hover:border-terminal-success/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp size={20} className={selectedOutcome === 'Yes' ? 'text-terminal-success' : 'text-terminal-text-secondary'} />
                  <span className={`font-bold text-sm ${selectedOutcome === 'Yes' ? 'text-terminal-success' : 'text-terminal-text-primary'}`}>
                    Yes
                  </span>
                </div>
                <div className={`text-lg font-bold ${selectedOutcome === 'Yes' ? 'text-terminal-success' : 'text-terminal-text-primary'}`}>
                  {yesPrice !== null && yesPrice !== undefined 
                    ? `${(yesPrice * 100).toFixed(2)}¢` 
                    : market.yesPrice !== null && market.yesPrice !== undefined
                    ? `${(market.yesPrice * 100).toFixed(2)}¢`
                    : 'N/A'}
                </div>
                {selectedOutcome === 'Yes' && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-terminal-success rounded-full animate-pulse" />
                  </div>
                )}
              </button>
              
              <button
                onClick={() => setSelectedOutcome('No')}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedOutcome === 'No'
                    ? 'bg-terminal-danger/10 border-terminal-danger shadow-lg shadow-terminal-danger/20'
                    : 'bg-terminal-surface border-terminal-border hover:border-terminal-danger/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown size={20} className={selectedOutcome === 'No' ? 'text-terminal-danger' : 'text-terminal-text-secondary'} />
                  <span className={`font-bold text-sm ${selectedOutcome === 'No' ? 'text-terminal-danger' : 'text-terminal-text-primary'}`}>
                    No
                  </span>
                </div>
                <div className={`text-lg font-bold ${selectedOutcome === 'No' ? 'text-terminal-danger' : 'text-terminal-text-primary'}`}>
                  {noPrice !== null && noPrice !== undefined 
                    ? `${(noPrice * 100).toFixed(2)}¢` 
                    : market.noPrice !== null && market.noPrice !== undefined
                    ? `${(market.noPrice * 100).toFixed(2)}¢`
                    : 'N/A'}
                </div>
                {selectedOutcome === 'No' && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-terminal-danger rounded-full animate-pulse" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Order Type Toggle */}
          <div>
            <label className="text-xs font-semibold text-terminal-text-secondary mb-2 block uppercase tracking-wide">Order Type</label>
            <div className="flex gap-2 p-1 bg-terminal-bg rounded-lg border border-terminal-border">
              <button
                onClick={() => setOrderType('market')}
                className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                  orderType === 'market'
                    ? 'bg-terminal-accent text-white shadow-md'
                    : 'text-terminal-text-secondary hover:text-terminal-text-primary'
                }`}
              >
                <Zap size={14} className="inline mr-1.5" />
                Market
              </button>
              <button
                onClick={() => setOrderType('limit')}
                className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                  orderType === 'limit'
                    ? 'bg-terminal-accent text-white shadow-md'
                    : 'text-terminal-text-secondary hover:text-terminal-text-primary'
                }`}
              >
                <Target size={14} className="inline mr-1.5" />
                Limit
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-semibold text-terminal-text-secondary mb-2 block uppercase tracking-wide">
              Amount (SOL)
            </label>
            <div className="relative">
              <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-text-muted" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0000"
                step="0.0001"
                min="0"
                className="terminal-input w-full pl-10 pr-4 py-3 text-lg font-semibold bg-terminal-bg border-terminal-border focus:border-terminal-accent"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[1, 5, 10, 50].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val.toString())}
                  className="flex-1 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded hover:border-terminal-accent transition-colors"
                >
                  {val} SOL
                </button>
              ))}
            </div>
          </div>

          {/* Limit Price */}
          {orderType === 'limit' && (
            <div>
              <label className="text-xs font-semibold text-terminal-text-secondary mb-2 block uppercase tracking-wide">
                Limit Price (¢)
              </label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder={`${(currentPrice * 100).toFixed(2)}`}
                step="0.01"
                min="0"
                max="100"
                className="terminal-input w-full px-4 py-3 text-lg font-semibold bg-terminal-bg border-terminal-border focus:border-terminal-accent"
              />
            </div>
          )}

          {/* Leverage Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-terminal-text-secondary uppercase tracking-wide">Leverage</label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-terminal-accent">{leverage}x</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setLeverage(Math.max(1, leverage - 1))}
                    className="w-6 h-6 flex items-center justify-center bg-terminal-bg border border-terminal-border rounded hover:border-terminal-accent transition-colors text-xs"
                  >
                    −
                  </button>
                  <button
                    onClick={() => setLeverage(Math.min(10, leverage + 1))}
                    className="w-6 h-6 flex items-center justify-center bg-terminal-bg border border-terminal-border rounded hover:border-terminal-accent transition-colors text-xs"
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
              className="w-full h-2 bg-terminal-bg rounded-lg appearance-none cursor-pointer accent-terminal-accent"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((leverage - 1) / 9) * 100}%, #1e2338 ${((leverage - 1) / 9) * 100}%, #1e2338 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-terminal-text-muted mt-1">
              <span>1x</span>
              <span>10x</span>
            </div>
          </div>

          {/* Trade Summary */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-4 bg-terminal-bg rounded-lg border border-terminal-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-terminal-text-secondary uppercase tracking-wide">Summary</h4>
                <span className="text-xs text-terminal-text-muted">SOL ≈ ${solPrice.toFixed(2)}</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-terminal-text-secondary">Cost</span>
                  <span className="font-medium">{margin.toFixed(4)} SOL <span className="text-terminal-text-muted text-xs">${marginUsd.toFixed(2)}</span></span>
                </div>
                {leverage > 1 && (
                  <div className="flex justify-between">
                    <span className="text-terminal-text-secondary">Position ({leverage}x)</span>
                    <span className="font-medium text-terminal-accent">{positionSize.toFixed(4)} SOL</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-terminal-text-secondary">Fees</span>
                  <span className="font-medium text-terminal-warning">{totalFees.toFixed(4)} SOL</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-terminal-border/50">
                  <span className="text-terminal-text-primary font-medium">Total</span>
                  <span className="font-bold">{totalCost.toFixed(4)} SOL <span className="text-terminal-text-muted text-xs">${totalCostUsd.toFixed(2)}</span></span>
                </div>
                <div className="flex justify-between pt-2 border-t border-terminal-border/50">
                  <span className="text-terminal-text-secondary">Payout if Win</span>
                  <span className="font-bold text-terminal-success">{potentialPayout.toFixed(4)} SOL <span className="text-xs">${potentialPayoutUsd.toFixed(2)}</span></span>
                </div>
                <div className="flex justify-between text-xs text-terminal-text-muted">
                  <span>ROI</span>
                  <span className="text-terminal-success font-medium">{totalCost > 0 ? ((potentialProfit / totalCost) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleTrade}
              disabled={loading || !isConnected || !amount || parseFloat(amount) <= 0}
              className={`w-full py-4 rounded-lg font-bold text-sm transition-all duration-200 ${
                selectedOutcome === 'Yes'
                  ? 'bg-gradient-to-r from-terminal-success to-green-500 hover:from-green-500 hover:to-terminal-success'
                  : 'bg-gradient-to-r from-terminal-danger to-red-500 hover:from-red-500 hover:to-terminal-danger'
              } text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Placing Order...
                </span>
              ) : (
                `Buy ${selectedOutcome}`
              )}
            </button>
            
            <button
              onClick={addToParlay}
              className="w-full py-3 rounded-lg border-2 border-terminal-border bg-terminal-surface hover:border-terminal-accent hover:bg-terminal-bg transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm"
            >
              <Layers size={16} />
              <span>Add to Parlay</span>
            </button>
          </div>

          {!isConnected && (
            <div className="p-3 bg-terminal-warning/10 border border-terminal-warning/30 rounded-lg flex items-center gap-2 text-xs text-terminal-warning">
              <AlertCircle size={16} />
              <span>Connect your wallet to place orders</span>
            </div>
          )}
          
        </div>
      </div>
    </div>
  )
}
