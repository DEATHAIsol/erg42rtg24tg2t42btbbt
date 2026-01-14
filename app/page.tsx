'use client'

import { useState, useEffect, useRef } from 'react'
import { TerminalHeader } from '@/components/TerminalHeader'
import { MarketGrid } from '@/components/MarketGrid'
import { MarketList } from '@/components/MarketList'
import { MarketChart } from '@/components/MarketChart'
import { TradingPanel } from '@/components/TradingPanel'
import { Sidebar } from '@/components/Sidebar'
import { fetchMarkets, PolymarketMarket } from '@/lib/polymarket'
import { LayoutGrid, List, RefreshCw, ChevronDown, ChevronUp, Image as ImageIcon, ExternalLink, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Pagination } from '@/components/Pagination'
import { MarketFilters } from '@/components/Sidebar'
import { HowItWorksModal } from '@/components/HowItWorksModal'
import Image from 'next/image'

export default function MarketsPage() {
  const router = useRouter()
  const [markets, setMarkets] = useState<PolymarketMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [totalMarkets, setTotalMarkets] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [marketPrice, setMarketPrice] = useState<any>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const priceRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const itemsPerPage = 24
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [panelExpanded, setPanelExpanded] = useState(true)

  // Market Description Component
  function MarketDescription({ description }: { description: string }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const maxLength = 150
    const shouldTruncate = description.length > maxLength
    
    return (
      <div className="text-sm text-terminal-text-secondary">
        <p className={isExpanded ? '' : 'line-clamp-3'}>
          {isExpanded ? description : (shouldTruncate ? description.slice(0, maxLength) + '...' : description)}
        </p>
        {shouldTruncate && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="mt-2 flex items-center gap-1 text-xs text-terminal-accent hover:text-terminal-accent/80 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                See Full Description
              </>
            )}
          </button>
        )}
      </div>
    )
  }
  const [filters, setFilters] = useState<MarketFilters>({
    searchQuery: '',
    selectedTags: [],
    sortBy: 'volume',
    minVolume: 0,
    minLiquidity: 0,
    minOdds: 1,
    maxOdds: 99,
  })
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check if first-time visitor
    const hasSeenHowItWorks = localStorage.getItem('probio-how-it-works-seen')
    if (!hasSeenHowItWorks) {
      // Small delay to ensure page is loaded
      setTimeout(() => {
        setShowHowItWorks(true)
      }, 1000)
    }

    // Immediately try to load markets from database (don't wait for initialization)
    loadMarkets()
    
    // Then initialize/store markets in background if needed (non-blocking)
    initializeMarkets().catch(err => {
      console.error('Failed to initialize markets:', err)
    })
    
    // Load settings and set up auto-refresh
    const settings = localStorage.getItem('terminal-settings')
    if (settings) {
      try {
        const parsed = JSON.parse(settings)
        if (parsed.autoRefresh && parsed.refreshInterval) {
          const interval = parsed.refreshInterval * 1000
          refreshIntervalRef.current = setInterval(() => {
            loadMarkets(false) // Silent refresh
          }, interval)
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1)
  }, [filters.searchQuery, filters.selectedTags, filters.minVolume, filters.minLiquidity, filters.minOdds, filters.maxOdds, filters.sortBy])

  useEffect(() => {
    // Load markets when page or filters change
    // Use a small delay to ensure state is ready
    const timer = setTimeout(() => {
      loadMarkets()
    }, 100)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters.searchQuery, filters.selectedTags, filters.minVolume, filters.minLiquidity, filters.minOdds, filters.maxOdds, filters.sortBy])

  // Initialize markets in backend
  const initializeMarkets = async () => {
    try {
      // Check if markets are already stored
      const statusResponse = await fetch('/api/markets/store')
      const status = await statusResponse.json()
      
      // If no markets stored, fetch and store them
      if (!status.totalMarkets || status.totalMarkets === 0) {
        console.log('Storing markets in backend...')
        const storeResponse = await fetch('/api/markets/store', { method: 'POST' })
        
        if (!storeResponse.ok) {
          throw new Error(`Failed to store markets: ${storeResponse.statusText}`)
        }
        
        const storeResult = await storeResponse.json()
        console.log('Store result:', storeResult)
        
        // Wait a bit longer and verify the store was populated
        let retries = 0
        while (retries < 10) {
          await new Promise(resolve => setTimeout(resolve, 500))
          const verifyResponse = await fetch('/api/markets/store')
          const verifyStatus = await verifyResponse.json()
          
          if (verifyStatus.totalMarkets > 0) {
            console.log(`Store verified: ${verifyStatus.totalMarkets} markets`)
            break
          }
          
          retries++
          if (retries >= 10) {
            console.warn('Store verification failed after retries, using fallback')
            return loadMarketsFallback()
          }
        }
      }
      
      // Don't call loadMarkets here - it will be called by the useEffect
      // This prevents double-loading on initial mount
    } catch (error) {
      console.error('Error initializing markets:', error)
      // Fallback: try to load markets directly
      loadMarketsFallback()
    }
  }
  
  // Fallback: load markets directly from API if backend store fails
  const loadMarketsFallback = async () => {
    setLoading(true)
    try {
      const data = await fetchMarkets({
        active: true,
        closed: false,
        limit: 500,
        offset: 0,
      })
      
      // Apply filters
      let filtered = [...data]
      
      if (filters.selectedTags.length > 0) {
        filtered = filtered.filter((market) => {
          const marketTags = (market.tags || []).map((tag: string) => 
            typeof tag === 'string' ? tag.toLowerCase().trim() : String(tag).toLowerCase().trim()
          ).filter(tag => tag.length > 0)
          const selectedTagsLower = filters.selectedTags.map(tag => tag.toLowerCase().trim())
          return selectedTagsLower.some((selectedTag) => {
            return marketTags.some((marketTag) => {
              if (marketTag === selectedTag) return true
              if (marketTag.includes(selectedTag) || selectedTag.includes(marketTag)) return true
              const marketTagParts = marketTag.split(/[-_\s]+/)
              const selectedTagParts = selectedTag.split(/[-_\s]+/)
              return marketTagParts.some(part => selectedTagParts.includes(part)) ||
                     selectedTagParts.some(part => marketTagParts.includes(part))
            })
          })
        })
      }
      
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim()
        filtered = filtered.filter(
          (market) =>
            market.question.toLowerCase().includes(query) ||
            market.description?.toLowerCase().includes(query) ||
            market.tags?.some((tag: string) => tag.toLowerCase().includes(query))
        )
      }
      
      if (filters.minVolume > 0) {
        filtered = filtered.filter((market) => (market.volume || 0) >= filters.minVolume)
      }
      
      if (filters.minLiquidity > 0) {
        filtered = filtered.filter((market) => (market.liquidity || 0) >= filters.minLiquidity)
      }
      
      // Filter by odds range (yesPrice is 0-1, convert filters from 0-100 to 0-1)
      if (filters.minOdds > 0 || filters.maxOdds < 100) {
        filtered = filtered.filter((market) => {
          const yesPrice = market.yesPrice ?? 0.5
          const yesPriceCents = yesPrice * 100
          return yesPriceCents >= filters.minOdds && yesPriceCents <= filters.maxOdds
        })
      }
      
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'volume': {
            // Primary sort by volume (descending), secondary by liquidity for ties
            const volumeDiff = (b.volume || 0) - (a.volume || 0)
            if (volumeDiff !== 0) return volumeDiff
            return (b.liquidity || 0) - (a.liquidity || 0)
          }
          case 'liquidity': {
            // Primary sort by liquidity (descending), secondary by volume for ties
            const liquidityDiff = (b.liquidity || 0) - (a.liquidity || 0)
            if (liquidityDiff !== 0) return liquidityDiff
            return (b.volume || 0) - (a.volume || 0)
          }
          case 'newest': {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return dateB - dateA
          }
          case 'oldest': {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return dateA - dateB
          }
          default: {
            // Default to volume sorting
            const defaultVolumeDiff = (b.volume || 0) - (a.volume || 0)
            if (defaultVolumeDiff !== 0) return defaultVolumeDiff
            return (b.liquidity || 0) - (a.liquidity || 0)
          }
        }
      })
      
      const offset = (currentPage - 1) * itemsPerPage
      const paginated = filtered.slice(offset, offset + itemsPerPage)
      
      setMarkets(paginated)
      setTotalMarkets(filtered.length)
    } catch (error) {
      console.error('Fallback load failed:', error)
      setMarkets([])
      setTotalMarkets(0)
    } finally {
      setLoading(false)
    }
  }

  const loadMarkets = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    try {
      // Check if backend store has markets
      const statusResponse = await fetch('/api/markets/store')
      const status = await statusResponse.json()
      
      // If backend store is empty, use fallback
      if (!status.totalMarkets || status.totalMarkets === 0) {
        console.log('Backend store is empty, using fallback')
        await loadMarketsFallback()
        return
      }
      
      // If search query exists, search all markets from backend
      if (filters.searchQuery.trim() || filters.selectedTags.length > 0 || filters.minVolume > 0 || filters.minLiquidity > 0 || filters.minOdds > 0 || filters.maxOdds < 100) {
        const searchParams = new URLSearchParams()
        if (filters.searchQuery.trim()) searchParams.append('q', filters.searchQuery.trim())
        filters.selectedTags.forEach(tag => searchParams.append('tags', tag))
        if (filters.minVolume > 0) searchParams.append('minVolume', String(filters.minVolume))
        if (filters.minLiquidity > 0) searchParams.append('minLiquidity', String(filters.minLiquidity))
        if (filters.minOdds > 0) searchParams.append('minOdds', String(filters.minOdds))
        if (filters.maxOdds < 100) searchParams.append('maxOdds', String(filters.maxOdds))
        searchParams.append('sortBy', filters.sortBy)
        searchParams.append('limit', String(itemsPerPage))
        searchParams.append('offset', String((currentPage - 1) * itemsPerPage))
        
        const response = await fetch(`/api/markets/search?${searchParams.toString()}`)
        if (!response.ok) {
          throw new Error('Search failed')
        }
        const data = await response.json()
        
        setMarkets(data.markets || [])
        setTotalMarkets(data.total || 0)
      } else {
        // Otherwise, get top markets with pagination
        const offset = (currentPage - 1) * itemsPerPage
        const response = await fetch(`/api/markets/top?limit=${itemsPerPage}&offset=${offset}&sortBy=${filters.sortBy}`)
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Top markets fetch failed:', response.status, errorText)
          throw new Error(`Top markets fetch failed: ${response.status}`)
        }
        const data = await response.json()
        
        if (!data || !Array.isArray(data.markets)) {
          console.error('Invalid response format:', data)
          throw new Error('Invalid response format from API')
        }
        
        setMarkets(data.markets || [])
        setTotalMarkets(data.total || 0)
      }
    } catch (error) {
      console.error('Failed to load markets from backend:', error)
      // Fallback to direct API fetch
      console.log('Falling back to direct API fetch')
      await loadMarketsFallback()
    } finally {
      // Always clear loading state
      if (showLoading) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  // Fetch price info when market is selected
  const handleMarketSelect = async (market: PolymarketMarket & {
    yesBuyPrice?: number
    yesSellPrice?: number
    noBuyPrice?: number
    noSellPrice?: number
    yesOrderBook?: any
    noOrderBook?: any
  }) => {
    // Clear any existing price refresh interval
    if (priceRefreshIntervalRef.current) {
      clearInterval(priceRefreshIntervalRef.current)
      priceRefreshIntervalRef.current = null
    }
    
    setSelectedMarket(market)
    setPanelExpanded(true) // Auto-expand when selecting a market
    setLoadingPrice(true)
    setMarketPrice(null)
    
    // Use stored price data if available, otherwise fetch
    // Check if market has price data stored (from database)
    const hasStoredPrices = (market.yesPrice !== null && market.yesPrice !== undefined && !isNaN(market.yesPrice)) ||
                            (market.noPrice !== null && market.noPrice !== undefined && !isNaN(market.noPrice))
    
    const storedPriceData = hasStoredPrices ? {
      marketId: market.id,
      yes: {
        price: (market.yesPrice !== null && market.yesPrice !== undefined && !isNaN(market.yesPrice) && market.yesPrice > 0 && market.yesPrice < 1) ? market.yesPrice : null,
        buyPrice: (market.yesBuyPrice !== null && market.yesBuyPrice !== undefined && !isNaN(market.yesBuyPrice) && market.yesBuyPrice > 0 && market.yesBuyPrice < 1) ? market.yesBuyPrice : market.yesPrice ?? null,
        sellPrice: (market.yesSellPrice !== null && market.yesSellPrice !== undefined && !isNaN(market.yesSellPrice) && market.yesSellPrice > 0 && market.yesSellPrice < 1) ? market.yesSellPrice : market.yesPrice ?? null,
        orderBook: market.yesOrderBook && typeof market.yesOrderBook === 'object' ? market.yesOrderBook : { bids: [], asks: [] },
      },
      no: {
        price: (market.noPrice !== null && market.noPrice !== undefined && !isNaN(market.noPrice) && market.noPrice > 0 && market.noPrice < 1) ? market.noPrice : null,
        buyPrice: (market.noBuyPrice !== null && market.noBuyPrice !== undefined && !isNaN(market.noBuyPrice) && market.noBuyPrice > 0 && market.noBuyPrice < 1) ? market.noBuyPrice : market.noPrice ?? null,
        sellPrice: (market.noSellPrice !== null && market.noSellPrice !== undefined && !isNaN(market.noSellPrice) && market.noSellPrice > 0 && market.noSellPrice < 1) ? market.noSellPrice : market.noPrice ?? null,
        orderBook: market.noOrderBook && typeof market.noOrderBook === 'object' ? market.noOrderBook : { bids: [], asks: [] },
      },
      timestamp: new Date().toISOString(),
      source: 'database',
    } : null
    
    if (storedPriceData) {
      setMarketPrice(storedPriceData)
      setLoadingPrice(false)
    }
    
    const fetchPrice = async () => {
      try {
        const response = await fetch(`/api/markets/${market.id}/price`, {
          cache: 'no-store',
          headers: {
            'Accept': 'application/json',
          },
        })
        if (response.ok) {
          const priceData = await response.json()
          
          // Only update if we have valid price or order book data
          // Don't overwrite good data with empty data
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
          
          // Only update if we have new valid data
          if (hasValidYesPrice || hasValidNoPrice || hasYesOrderBook || hasNoOrderBook) {
            // Merge with existing data - don't overwrite good data with null/empty
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
          
          // Trigger background sync to update database
          fetch(`/api/markets/sync-prices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marketIds: [market.id] }),
          }).catch(err => console.warn('Background price sync failed:', err))
        } else {
          console.error('Failed to fetch market price:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Failed to fetch market price:', error)
      } finally {
        setLoadingPrice(false)
      }
    }
    
    // Always fetch latest price, but show stored data immediately if available
    await fetchPrice()
    
    // Set up auto-refresh for price data every 5 seconds
    priceRefreshIntervalRef.current = setInterval(fetchPrice, 5000)
  }
  
  // Cleanup price refresh interval on unmount
  useEffect(() => {
    return () => {
      if (priceRefreshIntervalRef.current) {
        clearInterval(priceRefreshIntervalRef.current)
      }
    }
  }, [])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }


  return (
    <div className="flex h-screen overflow-hidden bg-terminal-bg">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TerminalHeader />

        {/* Main Trading Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Markets View */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-terminal-border">
            {/* View Toggle */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border bg-terminal-surface">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Active Markets</h2>
                <span className="text-sm text-terminal-text-secondary">
                  (1000+)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadMarkets()}
                  disabled={loading || refreshing}
                  className={`p-2 rounded transition-colors ${
                    loading || refreshing
                      ? 'text-terminal-text-muted cursor-not-allowed'
                      : 'text-terminal-text-secondary hover:text-terminal-text-primary'
                  }`}
                  title="Refresh markets"
                >
                  <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-terminal-accent text-white' : 'text-terminal-text-secondary hover:text-terminal-text-primary'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-terminal-accent text-white' : 'text-terminal-text-secondary hover:text-terminal-text-primary'}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>

            {/* Markets Display */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-terminal-text-secondary">Loading markets...</div>
                  </div>
                ) : markets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-terminal-text-secondary">
                    <p className="mb-2">No active markets found</p>
                    <button
                      onClick={() => loadMarkets()}
                      className="terminal-button-primary px-4 py-2"
                    >
                      Retry
                    </button>
                  </div>
                ) : viewMode === 'grid' ? (
                  <MarketGrid
                    markets={markets}
                    onMarketSelect={handleMarketSelect}
                    selectedMarket={selectedMarket}
                  />
                ) : (
                  <MarketList
                    markets={markets}
                    onMarketSelect={handleMarketSelect}
                    selectedMarket={selectedMarket}
                  />
                )}
              </div>

              {/* Pagination */}
              {markets.length > 0 && totalMarkets > itemsPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalMarkets / itemsPerPage)}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalMarkets}
                />
              )}

            </div>
          </div>

          {/* Trading Panel - Collapsible Drawer */}
          <div className={`relative flex transition-all duration-300 ease-in-out ${panelExpanded ? 'w-96' : 'w-0'}`}>
            {/* Collapse/Expand Toggle Button */}
            <button
              onClick={() => setPanelExpanded(!panelExpanded)}
              className={`absolute top-1/2 -translate-y-1/2 z-10 w-6 h-16 bg-terminal-surface border border-terminal-border rounded-l-lg flex items-center justify-center hover:bg-terminal-bg transition-colors ${panelExpanded ? '-left-6' : '-left-6'}`}
              title={panelExpanded ? 'Collapse panel' : 'Expand panel'}
            >
              <ChevronRight size={16} className={`text-terminal-text-secondary transition-transform duration-300 ${panelExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Panel Content */}
            <div className={`flex flex-col border-l border-terminal-border bg-terminal-surface overflow-hidden transition-all duration-300 ${panelExpanded ? 'w-96 opacity-100' : 'w-0 opacity-0'}`}>
              {selectedMarket ? (
                <>
                  <div className="p-4 border-b border-terminal-border">
                    <div className="flex items-start gap-3 mb-2">
                      {/* Market Image Icon */}
                      <div className="flex-shrink-0">
                        {selectedMarket.imageUrl ? (
                          <div className="relative w-12 h-12 bg-terminal-bg rounded overflow-hidden border border-terminal-border">
                            <Image
                              src={selectedMarket.imageUrl}
                              alt={selectedMarket.question}
                              fill
                              className="object-cover"
                              sizes="48px"
                              onError={(e: any) => {
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
                          <h3 className="font-semibold text-lg flex-1">{selectedMarket.question}</h3>
                          <button
                            onClick={() => router.push(`/market/${selectedMarket.id}`)}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-terminal-accent hover:text-terminal-accent/80 hover:bg-terminal-accent/10 rounded border border-terminal-border hover:border-terminal-accent transition-colors flex-shrink-0"
                            title="Expand to full page"
                          >
                            <ExternalLink size={14} />
                            Expand
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {selectedMarket.description && (
                      <div className="mt-2">
                        <MarketDescription description={selectedMarket.description} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-auto">
                    {loadingPrice ? (
                      <div className="p-4 text-center text-terminal-text-secondary">
                        Loading price data...
                      </div>
                    ) : (
                      <>
                        {marketPrice && (
                          <div className="p-4 border-b border-terminal-border bg-terminal-bg/50">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-terminal-text-secondary mb-1">Yes Price</div>
                                <div className="text-lg font-bold text-terminal-success">
                                  {marketPrice.yes?.price !== null && marketPrice.yes?.price !== undefined 
                                    ? `${(marketPrice.yes.price * 100).toFixed(1)}¢` 
                                    : 'N/A'}
                                </div>
                                {marketPrice.yes?.buyPrice && (
                                  <div className="text-xs text-terminal-text-muted mt-1">
                                    Buy: {(marketPrice.yes.buyPrice * 100).toFixed(1)}¢
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-xs text-terminal-text-secondary mb-1">No Price</div>
                                <div className="text-lg font-bold text-terminal-danger">
                                  {marketPrice.no?.price !== null && marketPrice.no?.price !== undefined 
                                    ? `${(marketPrice.no.price * 100).toFixed(1)}¢` 
                                    : 'N/A'}
                                </div>
                                {marketPrice.no?.buyPrice && (
                                  <div className="text-xs text-terminal-text-muted mt-1">
                                    Buy: {(marketPrice.no.buyPrice * 100).toFixed(1)}¢
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        <MarketChart market={selectedMarket} priceData={marketPrice} />
                        <TradingPanel market={selectedMarket} priceData={marketPrice} />
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-terminal-text-secondary">
                  <div className="text-center">
                    <p>Select a market to view details</p>
                    <p className="text-sm mt-2">and start trading</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => {
          setShowHowItWorks(false)
          localStorage.setItem('probio-how-it-works-seen', 'true')
        }}
      />
    </div>
  )
}
