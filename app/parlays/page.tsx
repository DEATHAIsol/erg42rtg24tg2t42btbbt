'use client'

import { useState, useEffect } from 'react'
import { TerminalHeader } from '@/components/TerminalHeader'
import { useCustodialWallet } from '@/lib/useCustodialWallet'
import { fetchMarkets, PolymarketMarket } from '@/lib/polymarket'
import { Plus, X, TrendingUp, TrendingDown, Calculator, Trash2, ArrowRight, CheckCircle2, AlertCircle, Search, SlidersHorizontal, Zap, Eye, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { checkParlayStatus, getParlayStats, getPlacedParlays as getPlacedParlaysFromStorage, savePlacedParlay, updateAllParlayCurrentValues, calculateCombinedOdds, calculatePayout, type PlacedParlay, type ParlayLeg as ParlayLegType } from '@/lib/parlay-management'
import { getPaperTradingState, adjustPaperBalance } from '@/lib/paper-trading'
import { formatParlayOdds, formatImpliedChance } from '@/lib/parlay-management'
import { useRouter } from 'next/navigation'
import { getBestPrice } from '@/lib/clob-client'
import { useToast } from '@/components/Toast'
import { playSuccessSound } from '@/lib/sounds'

// Site fee only for parlays (no leverage = no liquidity fee)
const SITE_FEE_ETH = 0.0005 // site fee per parlay in ETH (was 0.01 SOL)

interface ParlayLeg {
  market: PolymarketMarket
  outcome: 'Yes' | 'No'
  price: number
  id: string
}

// Using PlacedParlay from parlay-management.ts

export default function ParlaysPage() {
  const router = useRouter()
  const toast = useToast()
  const { publicKey, connected, isSignedIn, balance: accountBalance } = useCustodialWallet()
  const address = publicKey?.toString() || null
  const isConnected = connected
  const [markets, setMarkets] = useState<PolymarketMarket[]>([])
  const [parlayLegs, setParlayLegs] = useState<ParlayLeg[]>([])
  const [showMarketSelector, setShowMarketSelector] = useState(false)
  const [stakeAmount, setStakeAmount] = useState('')
  const [marketSelectorSearch, setMarketSelectorSearch] = useState('')
  const [marketSelectorTags, setMarketSelectorTags] = useState<string[]>([])
  const [marketSelectorSort, setMarketSelectorSort] = useState<'volume' | 'liquidity' | 'newest' | 'oldest'>('volume')
  const [showMarketFilters, setShowMarketFilters] = useState(false)
  const [placedParlays, setPlacedParlays] = useState<PlacedParlay[]>([])
  const [selectedParlay, setSelectedParlay] = useState<PlacedParlay | null>(null)
  const [checkingParlays, setCheckingParlays] = useState(false)
  const [updatingValues, setUpdatingValues] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmedConsent, setConfirmedConsent] = useState(false)
  const [expandedParlays, setExpandedParlays] = useState<Set<string>>(new Set())
  const [solPrice, setSolPrice] = useState<number>(180) // ETH price in USD

  useEffect(() => {
    loadMarkets()
    loadPlacedParlays()
    const saved = localStorage.getItem('parlay-legs')
    if (saved) {
      try {
        const legs = JSON.parse(saved)
        localStorage.removeItem('parlay-legs')
      } catch (e) {
        console.error('Error loading saved parlay:', e)
      }
    }
    
    // Listen for parlay updates
    const handleParlayUpdate = () => {
      loadPlacedParlays()
    }
    window.addEventListener('parlays-updated', handleParlayUpdate)
    
    // Auto-check parlay status and update values every 30 seconds
    const interval = setInterval(() => {
      checkAllParlayStatuses()
      updateCurrentValues()
    }, 30000)
    
    // Initial value update
    updateCurrentValues()
    
    return () => {
      window.removeEventListener('parlays-updated', handleParlayUpdate)
      clearInterval(interval)
    }
  }, [])


  // Fetch ETH price
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        )
        if (response.ok) {
          const data = await response.json()
          if (data.ethereum?.usd) {
            setSolPrice(data.ethereum.usd)
          }
        }
      } catch (error) {
        console.error('Error fetching ETH price:', error)
      }
    }
    
    fetchSolPrice()
    const interval = setInterval(fetchSolPrice, 60000)
    return () => clearInterval(interval)
  }, [])


  // Balance now comes from useCustodialWallet (accountBalance).


  const loadPlacedParlays = async () => {
    try {
      const parlays = getPlacedParlaysFromStorage()
      console.log('Loaded parlays from storage:', parlays.length, parlays.map(p => ({ id: p.id, status: p.status })))
      setPlacedParlays(parlays)
      // Don't automatically call updateCurrentValues here - it creates an infinite loop
      // updateCurrentValues is called on initial load and periodically via the interval
    } catch (e) {
      console.error('Error loading placed parlays:', e)
      setPlacedParlays([])
    }
  }
  
  const updateCurrentValues = async () => {
    if (updatingValues) return
    
    // Always read from storage to ensure we have the latest data
    const currentParlays = getPlacedParlaysFromStorage()
    console.log('updateCurrentValues - currentParlays:', currentParlays.length, currentParlays.map(p => ({ id: p.id, status: p.status })))
    if (currentParlays.length === 0) return
    
    setUpdatingValues(true)
    try {
      // Recalculate current values for all active parlays (this returns ALL parlays, not just active ones)
      const updated = await updateAllParlayCurrentValues(currentParlays)
      console.log('updateCurrentValues - updated:', updated.length, updated.map(p => ({ id: p.id, status: p.status })))
      
      // Update state and storage (use the same storage key as parlay-management.ts)
      setPlacedParlays(updated)
      if (typeof window !== 'undefined') {
      localStorage.setItem('placed-parlays', JSON.stringify(updated))
        // Don't dispatch 'parlays-updated' event here - we're already updating state directly
        // The event would trigger loadPlacedParlays which would call updateCurrentValues again (infinite loop)
      }
      
      console.log('Updated parlay values:', updated.map(p => ({
        id: p.id,
        stake: p.stakeAmount,
        entryOdds: p.combinedOdds,
        currentOdds: p.currentCombinedOdds,
        currentValue: p.currentValue,
        currentPnL: p.currentPnL
      })))
    } catch (error) {
      console.error('Error updating parlay values:', error)
      toast.showError('Failed to update parlay values. Please try again.')
    } finally {
      setUpdatingValues(false)
    }
  }

  /**
   * Pays out a parlay that has just settled as a win. The payoutCredited flag
   * makes this safe to call from every settlement path, since statuses are
   * re-checked both individually and in bulk.
   */
  const creditIfWon = (parlay: PlacedParlay): PlacedParlay => {
    if (parlay.status !== 'won' || parlay.payoutCredited) return parlay
    const payout = parlay.actualPayout ?? parlay.potentialPayout ?? 0
    if (payout > 0) {
      adjustPaperBalance(payout)
      toast.showSuccess(`Parlay won. ${payout.toFixed(4)} ETH credited to your balance.`)
    }
    return { ...parlay, payoutCredited: true }
  }

  const checkAllParlayStatuses = async () => {
    if (checkingParlays || placedParlays.length === 0) return
    
    setCheckingParlays(true)
    try {
      const updatedParlays = await Promise.all(
        placedParlays.map(async (parlay) => {
          if (parlay.status === 'active') {
            return creditIfWon(await checkParlayStatus(parlay))
          }
          return parlay
        })
      )
      setPlacedParlays(updatedParlays)
      // Update storage to persist status changes
      if (typeof window !== 'undefined') {
        localStorage.setItem('placed-parlays', JSON.stringify(updatedParlays))
        window.dispatchEvent(new CustomEvent('parlays-updated'))
      }
    } catch (error) {
      console.error('Error checking parlay statuses:', error)
    } finally {
      setCheckingParlays(false)
    }
  }

  const handleCheckStatus = async (parlayId: string) => {
    const parlay = placedParlays.find(p => p.id === parlayId)
    if (!parlay) return
    
    setCheckingParlays(true)
    try {
      const updated = creditIfWon(await checkParlayStatus(parlay))
      const updatedParlays = placedParlays.map(p => p.id === parlayId ? updated : p)
      setPlacedParlays(updatedParlays)
      
      // Update storage to persist status changes
      if (typeof window !== 'undefined') {
        localStorage.setItem('placed-parlays', JSON.stringify(updatedParlays))
        window.dispatchEvent(new CustomEvent('parlays-updated'))
      }
      
      if (updated.status !== parlay.status) {
        if (updated.status === 'won') {
          playSuccessSound()
        } else if (updated.status === 'lost') {
          toast.showError('❌ Parlay lost. One or more legs did not resolve correctly.')
        }
      }
    } catch (error) {
      console.error('Error checking parlay status:', error)
      toast.showError('Failed to check parlay status')
    } finally {
      setCheckingParlays(false)
    }
  }

  const loadMarkets = async () => {
    try {
      const data = await fetchMarkets({ active: true, limit: 500 })
      setMarkets(data)
    } catch (error) {
      console.error('Failed to load markets:', error)
    }
  }

  // Filter and sort markets for selector
  const getFilteredMarkets = () => {
    let filtered = [...markets]

    // Filter out markets already in parlay
    const parlayMarketIds = new Set(parlayLegs.map(leg => leg.market.id))
    filtered = filtered.filter(market => !parlayMarketIds.has(market.id))

    // Search filter
    if (marketSelectorSearch.trim()) {
      const query = marketSelectorSearch.toLowerCase().trim()
      filtered = filtered.filter(
        (market) =>
          market.question.toLowerCase().includes(query) ||
          market.description?.toLowerCase().includes(query) ||
          market.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      )
    }

    // Tag filter
    if (marketSelectorTags.length > 0) {
      const selectedTagsLower = marketSelectorTags.map(tag => tag.toLowerCase().trim())
      
      filtered = filtered.filter((market) => {
        // Get all tags from market (already normalized by API route)
        const marketTags = (market.tags || []).map((tag: string) => 
          typeof tag === 'string' ? tag.toLowerCase().trim() : String(tag).toLowerCase().trim()
        ).filter(tag => tag.length > 0)
        
        // If market has no tags, skip it when filtering by category
        if (marketTags.length === 0) {
          return false
        }
        
        // Check if any selected tag matches any market tag
        const hasMatch = selectedTagsLower.some((selectedTag) => {
          // Direct match
          if (marketTags.includes(selectedTag)) return true
          
          // Partial match - check if any market tag contains or is contained by selected tag
          return marketTags.some((marketTag) => {
            // Exact match
            if (marketTag === selectedTag) return true
            
            // Contains match (e.g., "technology" matches "tech")
            if (marketTag.includes(selectedTag) || selectedTag.includes(marketTag)) return true
            
            // Word-based match (e.g., "us-current-affairs" matches "politics" via word parts)
            const marketTagParts = marketTag.split(/[-_\s]+/).filter(p => p.length > 0)
            const selectedTagParts = selectedTag.split(/[-_\s]+/).filter(p => p.length > 0)
            
            // Check if any word parts match
            return marketTagParts.some(part => 
              selectedTagParts.includes(part) || 
              selectedTagParts.some(st => part.includes(st) || st.includes(part))
            )
          })
        })
        
        return hasMatch
      })
    }

    // Sort
    filtered.sort((a, b) => {
      switch (marketSelectorSort) {
        case 'volume':
          return (b.volume || 0) - (a.volume || 0)
        case 'liquidity':
          return (b.liquidity || 0) - (a.liquidity || 0)
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        default:
          return 0
      }
    })

    return filtered
  }

  const filteredMarkets = getFilteredMarkets()

  // Categories for market selector
  const categories = [
    'politics', 'economics', 'crypto', 'sports', 'entertainment',
    'technology', 'business', 'health', 'science', 'weather',
    'gaming', 'nft', 'defi', 'stocks', 'elections',
  ]

  const categoryLabels: Record<string, string> = {
    'politics': 'Politics',
    'economics': 'Economics',
    'crypto': 'Crypto',
    'sports': 'Sports',
    'entertainment': 'Entertainment',
    'technology': 'Technology',
    'business': 'Business',
    'health': 'Health',
    'science': 'Science',
    'weather': 'Weather',
    'gaming': 'Gaming',
    'nft': 'NFT',
    'defi': 'DeFi',
    'stocks': 'Stocks',
    'elections': 'Elections',
  }

  const addLeg = async (market: PolymarketMarket, outcome: 'Yes' | 'No') => {
    if (parlayLegs.some((leg) => leg.market.id === market.id)) {
      toast.showWarning('This market is already in your parlay')
      return
    }
    
    // Fetch accurate price from CLOB API
    let price = outcome === 'Yes' 
      ? (market.yesPrice ?? 0.5)
      : (market.noPrice ?? 0.5)
    
    try {
      // Fetch real-time price from API for accurate entry price
      const response = await fetch(`/api/markets/${market.id}/price`, { cache: 'no-store' })
      if (response.ok) {
        const priceData = await response.json()
        const fetchedPrice = outcome === 'Yes' 
          ? (priceData.yes?.price ?? null)
          : (priceData.no?.price ?? null)
        
        // Prices from API should be in decimal format (0-1)
        // Validate and convert if necessary
        if (fetchedPrice !== null && !isNaN(fetchedPrice)) {
          let validatedPrice = parseFloat(String(fetchedPrice))
          
          // Check if price is in cents format (0-100) instead of decimal (0-1)
          // If price is between 1 and 100, it's likely in cents format
          if (validatedPrice > 1 && validatedPrice <= 100) {
            console.warn(`Price for ${market.question} appears to be in cents format (${validatedPrice}), converting to decimal: ${validatedPrice / 100}`)
            validatedPrice = validatedPrice / 100
          }
          
          // Validate price is in correct format (0-1 range for decimal probabilities)
          if (validatedPrice > 0 && validatedPrice < 1) {
            price = validatedPrice
          } else {
            // Fallback: Try to get best price from order book
            const bestPriceData = await getBestPrice(market.id, outcome === 'Yes' ? 'Yes' : 'No', 'buy')
            if (bestPriceData && bestPriceData.price > 0 && bestPriceData.price < 1) {
              let orderBookPrice = parseFloat(String(bestPriceData.price))
              if (orderBookPrice > 1 && orderBookPrice <= 100) {
                orderBookPrice = orderBookPrice / 100
              }
              if (orderBookPrice > 0 && orderBookPrice < 1) {
                price = orderBookPrice
              }
            }
          }
        } else {
          // Fallback: Try to get best price from order book
          const bestPriceData = await getBestPrice(market.id, outcome === 'Yes' ? 'Yes' : 'No', 'buy')
          if (bestPriceData && bestPriceData.price > 0 && bestPriceData.price < 1) {
            let orderBookPrice = parseFloat(String(bestPriceData.price))
            if (orderBookPrice > 1 && orderBookPrice <= 100) {
              orderBookPrice = orderBookPrice / 100
            }
            if (orderBookPrice > 0 && orderBookPrice < 1) {
              price = orderBookPrice
            }
          }
        }
      } else {
        // Fallback to order book if price endpoint fails
        const bestPriceData = await getBestPrice(market.id, outcome === 'Yes' ? 'Yes' : 'No', 'buy')
        if (bestPriceData && bestPriceData.price > 0 && bestPriceData.price < 1) {
          let orderBookPrice = parseFloat(String(bestPriceData.price))
          if (orderBookPrice > 1 && orderBookPrice <= 100) {
            orderBookPrice = orderBookPrice / 100
          }
          if (orderBookPrice > 0 && orderBookPrice < 1) {
            price = orderBookPrice
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching accurate price for parlay leg:', error)
      // Use fallback price from market data
    }
    
    // Final validation: ensure price is in decimal format (0-1)
    // If price is in cents format (1-100), convert to decimal
    if (price > 1 && price <= 100) {
      console.warn(`Price for ${market.question} appears to be in cents format (${price}), converting to decimal: ${price / 100}`)
      price = price / 100
    }
    
    // Validate price before adding - must be in decimal format (0-1)
    if (isNaN(price) || price <= 0 || price >= 1) {
      toast.showError(`Unable to fetch valid price for this market. Got: ${price}. Price must be between 0 and 1 (decimal format). Please try again.`)
      return
    }
    
    // Store leg with price in decimal format (0-1)
    const newLeg: ParlayLeg = {
      market,
      outcome,
      price, // Stored as decimal (0-1), e.g., 0.99 = 99¢, 0.008 = 0.8¢
      id: `${market.id}-${Date.now()}`,
    }
    
    setParlayLegs([...parlayLegs, newLeg])
    setShowMarketSelector(false)
  }

  const removeLeg = (id: string) => {
    setParlayLegs(parlayLegs.filter((leg) => leg.id !== id))
  }

  // Calculate combined odds using shared utility function
  const calculateParlayOdds = () => {
    // Convert local ParlayLeg format to ParlayLegType format for calculation
    // The local ParlayLeg is compatible with ParlayLegType (it's a subset)
    const legs: ParlayLegType[] = parlayLegs.map(leg => ({
      market: leg.market,
      outcome: leg.outcome,
      price: leg.price,
      id: leg.id,
    }))
    return calculateCombinedOdds(legs)
  }

  const combinedOdds = calculateParlayOdds()
  const stake = stakeAmount ? parseFloat(stakeAmount) : 0
  const grossPayout = stake > 0 && combinedOdds > 0 ? calculatePayout(stake, combinedOdds) : 0
  
  // Fee calculations - parlays only have site fee (no leverage = no liquidity fee)
  const siteFee = SITE_FEE_ETH
  const totalFees = siteFee
  const totalCost = stake + totalFees
  
  // Net payout after fees
  const potentialPayout = grossPayout
  const potentialProfit = potentialPayout - totalCost
  
  // USD conversions
  const stakeUsd = stake * solPrice
  const totalCostUsd = totalCost * solPrice
  const potentialPayoutUsd = potentialPayout * solPrice
  
  const canPlaceParlay = parlayLegs.length >= 2 && isConnected && stakeAmount && parseFloat(stakeAmount) > 0

  return (
    <div className="flex h-screen overflow-hidden bg-terminal-bg">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TerminalHeader />

        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Parlay Builder - Fluid Layout */}
          <div className="flex-1 overflow-auto">
            <div className="min-h-full">
              {/* Header */}
              <div className="max-w-6xl mx-auto px-6 pt-8 pb-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="h-px w-8 bg-terminal-accent" />
                  <span className="section-label !text-terminal-accent">Multi-market slips</span>
                </div>
                <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mb-2">
                  Parlay builder
                </h1>
                <p className="text-terminal-text-secondary max-w-lg">
                  Chain outcomes across unrelated markets into one slip. Every leg has to
                  land, so the odds multiply.
                </p>

                {/* Live slip summary */}
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px mt-7 bg-terminal-border border border-terminal-border rounded-card overflow-hidden">
                  {[
                    { label: 'Legs', value: String(parlayLegs.length), hint: parlayLegs.length < 2 ? 'min 2' : 'ready' },
                    { label: 'Odds', value: formatParlayOdds(combinedOdds), hint: combinedOdds > 0 ? `${formatImpliedChance(combinedOdds)} chance` : 'add legs' },
                    { label: 'To pay', value: stake > 0 ? `${totalCost.toFixed(3)}` : '—', hint: 'ETH incl. fee' },
                    { label: 'Balance', value: accountBalance.toFixed(2), hint: 'ETH' },
                  ].map((s) => (
                    <div key={s.label} className="bg-terminal-bg px-4 py-3">
                      <dd className="font-display text-xl font-bold tracking-tight num">{s.value}</dd>
                      <dt className="section-label mt-0.5">{s.label}</dt>
                      <div className="text-[10px] text-terminal-text-muted mt-0.5">{s.hint}</div>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="max-w-6xl mx-auto px-6 pb-12">
                {/* Current Parlays */}
                {placedParlays.length > 0 && (
                  <div className="mb-8">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <h2 className="text-xl font-bold mb-1">Current Parlays</h2>
                        {(() => {
                          const stats = getParlayStats(placedParlays)
                          return (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-terminal-text-secondary">
                              <span>{stats.active} Active</span>
                              <span>•</span>
                              <span className="text-terminal-success">{stats.won} Won</span>
                              <span>•</span>
                              <span className="text-terminal-danger">{stats.lost} Lost</span>
                              <span>•</span>
                              <span>Win Rate: {stats.winRate.toFixed(1)}%</span>
                            </div>
                          )
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={updateCurrentValues}
                          disabled={updatingValues}
                          className="px-3 py-1.5 bg-terminal-surface border border-terminal-border rounded-lg hover:border-terminal-accent transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                          title="Refresh current values"
                        >
                          <RefreshCw size={14} className={updatingValues ? 'animate-spin' : ''} />
                          {updatingValues ? 'Updating...' : 'Update Values'}
                        </button>
                        <button
                          onClick={checkAllParlayStatuses}
                          disabled={checkingParlays}
                          className="px-3 py-1.5 bg-terminal-surface border border-terminal-border rounded-lg hover:border-terminal-accent transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                          <RefreshCw size={14} className={checkingParlays ? 'animate-spin' : ''} />
                          {checkingParlays ? 'Checking...' : 'Check Status'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {placedParlays.map((parlay) => {
                        const isExpanded = expandedParlays.has(parlay.id)
                        const toggleExpand = () => {
                          setExpandedParlays(prev => {
                            const newSet = new Set(prev)
                            if (newSet.has(parlay.id)) {
                              newSet.delete(parlay.id)
                            } else {
                              newSet.add(parlay.id)
                            }
                            return newSet
                          })
                        }
                        
                        return (
                        <div
                          key={parlay.id}
                          className="bg-terminal-surface border border-terminal-border rounded-xl hover:border-terminal-accent/50 transition-colors overflow-hidden"
                        >
                          {/* Condensed Header - Always Visible */}
                          <div 
                            className="p-4 cursor-pointer"
                            onClick={toggleExpand}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                <ChevronDown size={18} className="text-terminal-text-secondary" />
                              </div>
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                                  parlay.status === 'active' 
                                    ? 'bg-terminal-success/10 text-terminal-success border border-terminal-success/30'
                                    : parlay.status === 'won'
                                    ? 'bg-terminal-success/20 text-terminal-success border border-terminal-success/50'
                                    : parlay.status === 'lost'
                                    ? 'bg-terminal-danger/20 text-terminal-danger border border-terminal-danger/50'
                                    : 'bg-terminal-warning/10 text-terminal-warning border border-terminal-warning/30'
                                }`}>
                                  {parlay.status.toUpperCase()}
                                </span>
                                <span className="text-xs text-terminal-text-secondary flex-shrink-0">
                                  {parlay.legs.length} leg{parlay.legs.length !== 1 ? 's' : ''}
                                </span>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm flex-1 min-w-0">
                                  <div className="flex-shrink-0">
                                    <div className="text-xs text-terminal-text-secondary">Stake</div>
                                    <div className="font-semibold">{parlay.stakeAmount.toFixed(4)} ETH</div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <div className="text-xs text-terminal-text-secondary">Odds</div>
                                    <div className="font-semibold num">{formatParlayOdds(parlay.combinedOdds)}</div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <div className="text-xs text-terminal-text-secondary">Pays if it lands</div>
                                    <div className="font-semibold text-terminal-success num">
                                      {(parlay.potentialPayout ?? 0).toFixed(2)} ETH
                                    </div>
                                  </div>
                                  {parlay.status === 'active' && (
                                    <div className="flex-shrink-0">
                                      <div className="text-xs text-terminal-text-secondary">Legs live</div>
                                      <div className="font-semibold num">
                                        {(parlay.legs.length - (parlay.legsLost ?? 0))}/{parlay.legs.length}
                                        {(parlay.legsLost ?? 0) > 0 && (
                                          <span className="ml-1.5 text-xs font-normal text-terminal-danger">
                                            {parlay.legsLost} out
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {(parlay.status === 'won' || parlay.status === 'lost') && (
                                    <>
                                      <div className="flex-shrink-0">
                                        <div className="text-xs text-terminal-text-secondary">
                                          {parlay.status === 'won' ? 'Payout' : 'Final Value'}
                                        </div>
                                        <div className={`font-semibold ${
                                          parlay.status === 'won' ? 'text-terminal-success' : 'text-terminal-danger'
                                        }`}>
                                          {parlay.actualPayout !== undefined ? parlay.actualPayout.toFixed(4) : '0.0000'} ETH
                                        </div>
                                      </div>
                                      <div className="flex-shrink-0">
                                        <div className="text-xs text-terminal-text-secondary">Final P&L</div>
                                        <div className={`font-semibold ${
                                          (parlay.actualPayout ?? 0) > parlay.stakeAmount ? 'text-terminal-success' : 'text-terminal-danger'
                                        }`}>
                                          {((parlay.actualPayout ?? 0) - parlay.stakeAmount) > 0 ? '+' : ''}{((parlay.actualPayout ?? 0) - parlay.stakeAmount).toFixed(4)} ETH
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Expandable Content */}
                          <div 
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${
                              isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                            }`}
                          >
                            <div className="px-4 pb-4 border-t border-terminal-border pt-4">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-terminal-text-secondary">
                                      {new Date(parlay.placedAt).toLocaleDateString()} {new Date(parlay.placedAt).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                                    {parlay.status === 'active' && parlay.currentValue !== undefined && parlay.currentCombinedOdds !== undefined && parlay.currentCombinedOdds > 0 && (
                                      <div>
                                        <div className="text-xs text-terminal-text-secondary mb-1">Current odds</div>
                                        <div className="font-semibold num">
                                          {formatParlayOdds(parlay.currentCombinedOdds)}
                                          <span className="ml-2 text-xs font-normal text-terminal-text-muted">
                                            {formatImpliedChance(parlay.currentCombinedOdds)} chance
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {parlay.currentPnL !== undefined && (
                                      <div>
                                        <div className="text-xs text-terminal-text-secondary mb-1">Unrealised %</div>
                                        <div className={`font-semibold ${
                                          parlay.currentPnL > 0 ? 'text-terminal-success' : 
                                          parlay.currentPnL < 0 ? 'text-terminal-danger' : 
                                          'text-terminal-text-primary'
                                        }`}>
                                          {((parlay.currentPnL / parlay.stakeAmount) * 100).toFixed(1)}%
                                        </div>
                                      </div>
                                    )}
                                    {parlay.status === 'partial' && (
                                      <div>
                                        <div className="text-xs text-terminal-text-secondary mb-1">Potential Payout</div>
                                        <div className="font-semibold text-terminal-success">{parlay.potentialPayout.toFixed(4)} ETH</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="border-t border-terminal-border pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="text-xs text-terminal-text-secondary">Legs ({parlay.legs.length}):</div>
                                  {parlay.status === 'active' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleCheckStatus(parlay.id)
                                      }}
                                      disabled={checkingParlays}
                                      className="px-2 py-1 text-xs bg-terminal-bg border border-terminal-border rounded hover:border-terminal-accent transition-colors disabled:opacity-50"
                                    >
                                      Check Status
                                    </button>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {parlay.legs.map((leg, idx) => {
                                    const legStatus = leg.legStatus || 'pending'
                                    return (
                                      <div 
                                        key={leg.id} 
                                        onClick={() => router.push(`/market/${leg.market.id}`)}
                                        className="flex items-start gap-2 text-sm p-2 rounded bg-terminal-bg/50 hover:bg-terminal-accent/10 border border-transparent hover:border-terminal-accent/30 cursor-pointer transition-all group"
                                      >
                                        <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-semibold ${
                                          legStatus === 'won'
                                            ? 'bg-terminal-success/20 text-terminal-success border border-terminal-success/50'
                                            : legStatus === 'lost'
                                            ? 'bg-terminal-danger/20 text-terminal-danger border border-terminal-danger/50'
                                            : 'bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/30'
                                        }`}>
                                          {legStatus === 'won' ? '✓' : legStatus === 'lost' ? '✗' : idx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                              leg.outcome === 'Yes'
                                                ? 'bg-terminal-success/10 text-terminal-success border border-terminal-success/30'
                                                : 'bg-terminal-danger/10 text-terminal-danger border border-terminal-danger/30'
                                            }`}>
                                              {leg.outcome}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-xs text-terminal-text-secondary">
                                                Entry: {(leg.price * 100).toFixed(2)}¢
                                              </span>
                                              {parlay.status === 'active' && leg.currentPrice !== undefined && (
                                                <span className={`text-xs font-medium ${
                                                  leg.currentPrice > leg.price 
                                                    ? 'text-terminal-success' 
                                                    : leg.currentPrice < leg.price 
                                                      ? 'text-terminal-danger' 
                                                      : 'text-terminal-text-primary'
                                                }`}>
                                                  • Current: {(leg.currentPrice * 100).toFixed(2)}¢
                                                  {leg.currentPrice !== leg.price && (
                                                    <span className="ml-1">
                                                      ({leg.currentPrice > leg.price ? '+' : ''}{((leg.currentPrice - leg.price) * 100).toFixed(1)}¢)
                                                    </span>
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                            {legStatus !== 'pending' && (
                                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                legStatus === 'won'
                                                  ? 'bg-terminal-success/20 text-terminal-success'
                                                  : 'bg-terminal-danger/20 text-terminal-danger'
                                              }`}>
                                                {legStatus.toUpperCase()}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="text-xs text-terminal-text-secondary line-clamp-1 group-hover:text-terminal-accent transition-colors flex-1">
                                              {leg.market.question}
                                            </div>
                                            <ExternalLink size={12} className="text-terminal-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                                {parlay.status === 'won' && parlay.actualPayout && (
                                  <div className="mt-4 p-3 bg-terminal-success/10 border border-terminal-success/30 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-semibold text-terminal-success">🎉 Parlay Won!</span>
                                      <span className="text-lg font-bold text-terminal-success">{parlay.actualPayout.toFixed(4)} ETH</span>
                                    </div>
                                  </div>
                                )}
                                {parlay.status === 'lost' && (
                                  <div className="mt-4 p-3 bg-terminal-danger/10 border border-terminal-danger/30 rounded-lg">
                                    <div className="text-sm font-semibold text-terminal-danger">❌ Parlay Lost - Stake forfeited</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        )
                      })}

                    </div>
                  </div>
                )}

                {/* Build Parlay Section */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold">Your slip</h2>
                  {parlayLegs.length > 0 && (
                    <span className="badge num">{parlayLegs.length} leg{parlayLegs.length === 1 ? '' : 's'}</span>
                  )}
                </div>

                {/* Parlay Legs */}
                <div className="space-y-3 mb-6">
                  {parlayLegs.length === 0 ? (
                    <div className="border border-dashed border-terminal-border rounded-card p-12 text-center bg-terminal-surface/40">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-terminal-accent/10 border border-terminal-accent/25 mb-4">
                        <Plus size={20} className="text-terminal-accent" />
                      </div>
                      <h3 className="font-semibold mb-1.5">Your slip is empty</h3>
                      <p className="text-sm text-terminal-text-secondary mb-6 max-w-xs mx-auto">
                        Add at least two markets. Each leg multiplies the odds, and every
                        one of them has to land.
                      </p>
                      <button
                        onClick={() => setShowMarketSelector(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-terminal-accent hover:bg-terminal-accent-hover text-terminal-ink font-semibold transition-colors"
                      >
                        <Plus size={16} />
                        Add First Market
                      </button>
                    </div>
                  ) : (
                    <>
                      {parlayLegs.map((leg, index) => (
                        <div
                          key={leg.id}
                          className="group relative flex items-start gap-3"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-terminal-accent/10 border border-terminal-accent/30 flex items-center justify-center mt-1">
                            <span className="text-xs font-semibold text-terminal-accent">{index + 1}</span>
                          </div>
                          <div 
                            onClick={() => router.push(`/market/${leg.market.id}`)}
                            className="flex-1 bg-terminal-surface border border-terminal-border rounded-xl p-4 hover:border-terminal-accent/50 hover:bg-terminal-accent/5 transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium ${
                                      leg.outcome === 'Yes'
                                        ? 'bg-terminal-success/10 text-terminal-success border border-terminal-success/30'
                                        : 'bg-terminal-danger/10 text-terminal-danger border border-terminal-danger/30'
                                    }`}
                                  >
                                    {leg.outcome === 'Yes' ? (
                                      <TrendingUp size={10} />
                                    ) : (
                                      <TrendingDown size={10} />
                                    )}
                                    {leg.outcome}
                                  </span>
                                  <span className="text-xs text-terminal-text-secondary font-medium">
                                    Entry: {(leg.price * 100).toFixed(2)}¢
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <h3 className="font-medium text-sm group-hover:text-terminal-accent transition-colors flex-1">{leg.market.question}</h3>
                                  <ExternalLink size={12} className="text-terminal-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                </div>
                                {leg.market.tags && leg.market.tags.length > 0 && (
                                  <div className="flex items-center gap-2 text-xs text-terminal-text-secondary">
                                    <span>{leg.market.tags[0]}</span>
                                    {leg.market.volume && (
                                      <>
                                        <span>•</span>
                                        <span>${((leg.market.volume || 0) / 1000).toFixed(0)}k vol</span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeLeg(leg.id)
                                }}
                                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-terminal-danger/10 text-terminal-danger opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => setShowMarketSelector(true)}
                        className="w-full border-2 border-dashed border-terminal-border rounded-xl p-4 hover:border-terminal-accent/50 bg-terminal-surface/30 hover:bg-terminal-surface/50 transition-colors"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Plus size={18} className="text-terminal-accent" />
                          <span className="font-medium text-terminal-text-primary">Add Another Market</span>
                        </div>
                      </button>
                    </>
                  )}
                </div>

                {/* Calculator */}
                {parlayLegs.length > 0 && (
                  <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Calculator className="text-terminal-accent" size={20} />
                      <h2 className="text-lg font-bold">Parlay Calculator</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                        <div className="text-xs text-terminal-text-secondary mb-1 uppercase tracking-wide">Combined Odds</div>
                        <div className="text-2xl font-bold text-terminal-accent num">
                          {formatParlayOdds(combinedOdds)}
                        </div>
                      </div>
                      <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                        <div className="text-xs text-terminal-text-secondary mb-1 uppercase tracking-wide">Legs</div>
                        <div className="text-2xl font-bold text-terminal-text-primary">
                          {parlayLegs.length}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-terminal-text-secondary mb-2 block">
                          Stake Amount (ETH)
                        </label>
                        <input
                          type="number"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="terminal-input w-full px-4 py-3 text-lg font-semibold"
                        />
                        <div className="flex gap-2 mt-2">
                          {[10, 25, 50, 100].map((val) => (
                            <button
                              key={val}
                              onClick={() => setStakeAmount(val.toString())}
                              className="flex-1 py-1.5 text-xs bg-terminal-bg border border-terminal-border rounded hover:border-terminal-accent transition-colors"
                            >
                              ${val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {stakeAmount && parseFloat(stakeAmount) > 0 && (
                        <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-terminal-text-secondary uppercase tracking-wide">Summary</h4>
                            <span className="text-xs text-terminal-text-muted">ETH ≈ ${solPrice.toFixed(2)}</span>
                              </div>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                              <span className="text-terminal-text-secondary">Stake</span>
                              <span className="font-medium">{stake.toFixed(4)} ETH <span className="text-terminal-text-muted text-xs">${stakeUsd.toFixed(2)}</span></span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-terminal-text-secondary">Fees</span>
                              <span className="font-medium text-terminal-warning">{totalFees.toFixed(4)} ETH</span>
                          </div>
                            <div className="flex justify-between pt-2 border-t border-terminal-border/50">
                              <span className="text-terminal-text-primary font-medium">Total Cost</span>
                              <span className="font-bold">{totalCost.toFixed(4)} ETH <span className="text-terminal-text-muted text-xs">${totalCostUsd.toFixed(2)}</span></span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-terminal-border/50">
                              <span className="text-terminal-text-secondary">Payout if Win</span>
                              <span className="font-bold text-terminal-success">{potentialPayout.toFixed(4)} ETH <span className="text-xs">${potentialPayoutUsd.toFixed(2)}</span></span>
                            </div>
                            <div className="flex justify-between text-xs text-terminal-text-muted">
                              <span>ROI</span>
                              <span className={`font-medium ${potentialProfit >= 0 ? 'text-terminal-success' : 'text-terminal-danger'}`}>
                                {totalCost > 0 ? ((potentialProfit / totalCost) * 100).toFixed(1) : 0}%
                            </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {parlayLegs.length > 0 && (
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setParlayLegs([])
                        setStakeAmount('')
                      }}
                      className="flex-1 py-3 rounded-lg border border-terminal-border bg-terminal-surface hover:border-terminal-danger hover:bg-terminal-danger/10 transition-colors flex items-center justify-center gap-2 font-semibold"
                    >
                      <Trash2 size={18} />
                      Clear Parlay
                    </button>
                    <button
                      onClick={async () => {
                        if (!isConnected) {
                          toast.showWarning('Please connect your wallet to place a parlay')
                          return
                        }
                        if (!canPlaceParlay) {
                          toast.showWarning('Please enter a valid stake amount')
                          return
                        }
                        // Show confirmation modal
                        setShowConfirmModal(true)
                        setConfirmedConsent(false)
                      }}
                      disabled={!canPlaceParlay}
                      className={`flex-1 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${
                        canPlaceParlay
                          ? 'bg-terminal-accent hover:bg-terminal-accent-hover text-terminal-ink'
                          : 'bg-terminal-surface border border-terminal-border text-terminal-text-muted cursor-not-allowed'
                      }`}
                    >
                      {canPlaceParlay ? (
                        <>
                          <Zap size={18} />
                          Place Parlay ({parlayLegs.length} legs)
                        </>
                      ) : (
                        <>
                          <AlertCircle size={18} />
                          {parlayLegs.length < 2 ? 'Need 2+ Markets' : 'Enter Stake Amount'}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Parlay Confirmation Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirmModal(false)}>
              <div
                className="bg-terminal-surface border border-terminal-border rounded-xl max-w-md w-full p-6 relative shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="absolute top-4 right-4 p-2 text-terminal-text-secondary hover:text-terminal-text-primary transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Confirm Parlay Placement</h2>
                  <p className="text-sm text-terminal-text-secondary">
                    Please review and acknowledge the fees before placing your parlay
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Fee Information */}
                  <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-terminal-text-secondary">Stake Amount</span>
                      <span className="text-lg font-bold text-terminal-text-primary">{parseFloat(stakeAmount).toFixed(4)} ETH</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-terminal-text-secondary">Site Fee</span>
                      <span className="text-lg font-bold text-terminal-text-primary num">{SITE_FEE_ETH} ETH</span>
                    </div>
                  </div>

                  {/* Consent Checkbox */}
                  <div className="flex items-start gap-3 p-3 bg-terminal-bg border border-terminal-border rounded-lg">
                    <input
                      type="checkbox"
                      id="consent-checkbox"
                      checked={confirmedConsent}
                      onChange={(e) => setConfirmedConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-terminal-border bg-terminal-surface text-terminal-accent focus:ring-terminal-accent focus:ring-2"
                    />
                    <label htmlFor="consent-checkbox" className="text-sm text-terminal-text-secondary cursor-pointer flex-1">
                      I acknowledge and consent to the 0.01 ETH site fee
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-3 px-4 rounded-lg border border-terminal-border bg-terminal-surface hover:bg-terminal-bg transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirmedConsent) {
                        toast.showWarning('Please acknowledge and consent to the fees')
                        return
                      }
                      
                      setShowConfirmModal(false)
                      
                      // Original parlay placement logic
                      try {
                        // Re-validate and update prices right before placing to ensure accuracy
                          const updatedLegs = await Promise.all(
                            parlayLegs.map(async (leg) => {
                              try {
                                // Fetch latest price from API
                                const response = await fetch(`/api/markets/${leg.market.id}/price`, { cache: 'no-store' })
                                if (response.ok) {
                                  const priceData = await response.json()
                                  const fetchedPrice = leg.outcome === 'Yes' 
                                    ? (priceData.yes?.price ?? null)
                                    : (priceData.no?.price ?? null)
                                  
                                  if (fetchedPrice !== null && !isNaN(fetchedPrice) && fetchedPrice > 0 && fetchedPrice < 1) {
                                    return { ...leg, price: fetchedPrice }
                                  } else {
                                    // Fallback to order book if price endpoint doesn't have valid data
                                    const bestPriceData = await getBestPrice(leg.market.id, leg.outcome === 'Yes' ? 'Yes' : 'No', 'buy')
                                    if (bestPriceData && bestPriceData.price > 0 && bestPriceData.price < 1) {
                                      return { ...leg, price: bestPriceData.price }
                                    }
                                  }
                                } else {
                                  // Fallback to order book if API fails
                                  const bestPriceData = await getBestPrice(leg.market.id, leg.outcome === 'Yes' ? 'Yes' : 'No', 'buy')
                                  if (bestPriceData && bestPriceData.price > 0 && bestPriceData.price < 1) {
                                    return { ...leg, price: bestPriceData.price }
                                  }
                                }
                              } catch (error) {
                                console.warn(`Error fetching updated price for leg ${leg.id}:`, error)
                              }
                              // Return original leg if price fetch fails
                              return leg
                            })
                          )
                          
                        // Recalculate odds and payout with updated prices using shared utility functions
                        // Convert to ParlayLegType format for calculation
                        const legsForCalculation: ParlayLegType[] = updatedLegs.map(leg => ({
                          market: leg.market,
                          outcome: leg.outcome,
                          price: leg.price,
                          id: leg.id,
                        }))
                        
                        const updatedCombinedOdds = calculateCombinedOdds(legsForCalculation)
                          
                          // Validate combined odds
                          if (updatedCombinedOdds <= 0 || updatedCombinedOdds >= 1) {
                            toast.showError('Invalid combined odds calculated. Please try again.')
                            return
                          }
                          
                        // Calculate payout using shared utility function
                        const stakeVal = parseFloat(stakeAmount)
                        const updatedPotentialPayout = calculatePayout(stakeVal, updatedCombinedOdds)

                        // Stake plus the flat site fee leaves the balance now.
                        const totalDeduction = stakeVal + SITE_FEE_ETH
                        const effectiveBalance = accountBalance
                        if (effectiveBalance < totalDeduction) {
                          toast.showError(`Insufficient balance. Need ${totalDeduction.toFixed(4)} ETH (stake ${stakeVal.toFixed(4)} plus ${SITE_FEE_ETH} fee), have ${effectiveBalance.toFixed(4)} ETH`)
                          return
                        }

                        // Actually debit it. This previously computed the amount
                        // and never moved the balance, so parlays were free.
                        const debit = adjustPaperBalance(-totalDeduction)
                        if (!debit.success) {
                          toast.showError(debit.error || 'Could not debit your balance')
                          return
                        }
                          
                          // Create placed parlay with accurate prices (all stored as decimals 0-1)
                          // stakeAmount is in ETH, combinedOdds is decimal (0-1), potentialPayout is in ETH
                          const newParlay: PlacedParlay = {
                            id: `parlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            legs: updatedLegs, // Each leg.price is stored as decimal (0-1)
                            stakeAmount: parseFloat(stakeAmount), // In ETH
                            combinedOdds: updatedCombinedOdds, // Decimal (0-1), product of leg prices
                            potentialPayout: updatedPotentialPayout, // In ETH, calculated as stake / combinedOdds
                            placedAt: new Date().toISOString(),
                            status: 'active',
                          }
                          
                          // If saving fails after the debit, hand the money back
                          // rather than leaving the user short with no parlay.
                          try {
                            savePlacedParlay(newParlay)
                          } catch (saveError) {
                            adjustPaperBalance(totalDeduction)
                            throw saveError
                          }
                          
                        // Reload parlays to ensure UI updates
                        await loadPlacedParlays()
                          
                          // Clear builder
                          setParlayLegs([])
                          setStakeAmount('')
                          
                          playSuccessSound()
                          toast.showSuccess(`Parlay placed successfully! Entry odds: ${(updatedCombinedOdds * 100).toFixed(2)}¢, Potential payout: ${updatedPotentialPayout.toFixed(4)} ETH`)
                        } catch (error) {
                          console.error('Error placing parlay:', error)
                          toast.showError('Error placing parlay. Please try again.')
                        }
                      }}
                    disabled={!confirmedConsent}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold transition-colors ${
                      confirmedConsent
                          ? 'bg-terminal-accent hover:bg-terminal-accent-hover text-terminal-ink'
                          : 'bg-terminal-surface border border-terminal-border text-terminal-text-muted cursor-not-allowed'
                      }`}
                    >
                    Confirm & Place Parlay
                    </button>
                  </div>
              </div>
            </div>
          )}

          {/* Market Selector Sidebar */}
          {showMarketSelector && (
            <div className="fixed inset-0 z-50 w-full lg:static lg:z-auto lg:w-[420px] lg:border-l border-terminal-border bg-terminal-surface flex flex-col shadow-xl">
              <div className="p-4 border-b border-terminal-border/50 bg-terminal-bg/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-bold text-sm">Select Market</h2>
                    <p className="text-xs text-terminal-text-secondary mt-0.5">
                      {filteredMarkets.length} {filteredMarkets.length === 1 ? 'market' : 'markets'} available
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMarketSelector(false)}
                    className="p-2 hover:bg-terminal-border rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-terminal-text-secondary" size={16} />
                  <input
                    type="text"
                    placeholder="Search markets..."
                    value={marketSelectorSearch}
                    onChange={(e) => setMarketSelectorSearch(e.target.value)}
                    className="terminal-input w-full pl-9 pr-3 py-2.5 text-sm bg-terminal-bg/50 border-terminal-border/50 focus:border-terminal-accent focus:ring-1 focus:ring-terminal-accent/20 backdrop-blur-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMarketFilters(!showMarketFilters)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      showMarketFilters || marketSelectorTags.length > 0
                        ? 'bg-terminal-accent/20 border border-terminal-accent text-terminal-accent'
                        : 'bg-terminal-bg/50 border border-terminal-border/50 text-terminal-text-secondary hover:border-terminal-accent/50'
                    }`}
                  >
                    <SlidersHorizontal size={14} />
                    Filters
                    {marketSelectorTags.length > 0 && (
                      <span className="bg-terminal-accent text-terminal-ink rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                        {marketSelectorTags.length}
                      </span>
                    )}
                  </button>
                  <select
                    value={marketSelectorSort}
                    onChange={(e) => setMarketSelectorSort(e.target.value as any)}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-terminal-bg/50 border border-terminal-border/50 text-terminal-text-primary focus:outline-none focus:border-terminal-accent backdrop-blur-sm"
                  >
                    <option value="volume">Volume</option>
                    <option value="liquidity">Liquidity</option>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </div>
              </div>

              {showMarketFilters && (
                <div className="p-4 border-b border-terminal-border/50 bg-terminal-bg/30 max-h-64 overflow-auto custom-scrollbar">
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-terminal-text-secondary mb-2 uppercase tracking-wide">Categories</div>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => {
                        const isSelected = marketSelectorTags.includes(category)
                        return (
                          <button
                            key={category}
                            onClick={() => {
                              if (isSelected) {
                                setMarketSelectorTags(marketSelectorTags.filter(t => t !== category))
                              } else {
                                setMarketSelectorTags([...marketSelectorTags, category])
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-terminal-accent text-terminal-ink border border-terminal-accent'
                                : 'bg-terminal-surface/50 border border-terminal-border/50 text-terminal-text-secondary hover:border-terminal-accent/50'
                            }`}
                          >
                            {categoryLabels[category as keyof typeof categoryLabels] || category}
                          </button>
                        )
                      })}
                    </div>
                    {marketSelectorTags.length > 0 && (
                      <button
                        onClick={() => setMarketSelectorTags([])}
                        className="mt-3 text-xs text-terminal-accent hover:text-terminal-accent/80 flex items-center gap-1.5"
                      >
                        <X size={12} />
                        Clear categories
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <div className="space-y-3">
                  {filteredMarkets.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-terminal-text-secondary text-sm mb-1">
                        {marketSelectorSearch || marketSelectorTags.length > 0
                          ? 'No markets found'
                          : 'Loading markets...'}
                      </p>
                      {(marketSelectorSearch || marketSelectorTags.length > 0) && (
                        <button
                          onClick={() => {
                            setMarketSelectorSearch('')
                            setMarketSelectorTags([])
                          }}
                          className="text-xs text-terminal-accent hover:text-terminal-accent/80 mt-2"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredMarkets.map((market) => {
                      const yesPrice = market.yesPrice ?? 0.5
                      const noPrice = market.noPrice ?? 0.5
                      
                      return (
                        <div 
                          key={market.id} 
                          className="bg-terminal-surface border border-terminal-border rounded-lg p-4 hover:border-terminal-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <h3 className="font-medium text-sm line-clamp-2 flex-1">
                              {market.question}
                            </h3>
                            {market.tags && market.tags.length > 0 && (
                              <span className="flex-shrink-0 px-2 py-0.5 bg-terminal-bg/50 border border-terminal-border/50 rounded text-xs text-terminal-text-secondary">
                                {market.tags[0]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mb-3 text-xs text-terminal-text-secondary">
                            <span>Vol: ${((market.volume || 0) / 1000).toFixed(0)}k</span>
                            <span>Liq: ${((market.liquidity || 0) / 1000).toFixed(0)}k</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await addLeg(market, 'Yes')
                                } catch (error) {
                                  console.error('Error adding leg:', error)
                                  toast.showError('Failed to add market to parlay. Please try again.')
                                }
                              }}
                              className="flex-1 py-2.5 px-3 bg-terminal-success/10 border border-terminal-success/30 rounded-lg text-sm font-semibold text-terminal-success hover:bg-terminal-success/20 hover:border-terminal-success transition-all flex items-center justify-center gap-2"
                            >
                              <TrendingUp size={14} />
                              Yes
                              <span className="text-xs opacity-75">{(yesPrice * 100).toFixed(1)}¢</span>
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await addLeg(market, 'No')
                                } catch (error) {
                                  console.error('Error adding leg:', error)
                                  toast.showError('Failed to add market to parlay. Please try again.')
                                }
                              }}
                              className="flex-1 py-2.5 px-3 bg-terminal-danger/10 border border-terminal-danger/30 rounded-lg text-sm font-semibold text-terminal-danger hover:bg-terminal-danger/20 hover:border-terminal-danger transition-all flex items-center justify-center gap-2"
                            >
                              <TrendingDown size={14} />
                              No
                              <span className="text-xs opacity-75">{(noPrice * 100).toFixed(1)}¢</span>
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
