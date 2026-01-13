'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TerminalHeader } from '@/components/TerminalHeader'
import { Sidebar } from '@/components/Sidebar'
import { useCustodialWallet } from '@/lib/useCustodialWallet'
import { MarketFilters } from '@/components/Sidebar'
import { TrendingUp, TrendingDown, Clock, X, RefreshCw, ExternalLink, ArrowUpRight, ArrowDownRight, Filter, SortAsc, SortDesc, Download, BarChart3 } from 'lucide-react'
import { 
  getPaperTradingState, 
  getPositionsWithPnL, 
  getPortfolioValue, 
  closePosition,
  cancelOrder,
  PaperPosition,
  PaperOrder
} from '@/lib/paper-trading'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmModal'
import { playCloseTradeSound } from '@/lib/sounds'

interface PositionWithPnL extends PaperPosition {
  currentPnL: number
  currentPrice: number
  size: number
  entryPrice: number
  openedAt: string
  id: string
  marketId: string
  marketQuestion: string
  outcome: 'Yes' | 'No'
  side: 'BUY' | 'SELL'
  leverage: number
}

export default function PortfolioPage() {
  const router = useRouter()
  const toast = useToast()
  const { confirm } = useConfirm()
  const { connected } = useCustodialWallet()
  const isConnected = connected
  const [positions, setPositions] = useState<PositionWithPnL[]>([])
  const [orders, setOrders] = useState<PaperOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [portfolioValue, setPortfolioValue] = useState({ totalValue: 0, totalPnL: 0, availableBalance: 0 })
  const [filters, setFilters] = useState<MarketFilters>({
    searchQuery: '',
    selectedTags: [],
    sortBy: 'volume',
    minVolume: 0,
    minLiquidity: 0,
  })
  const [positionFilter, setPositionFilter] = useState<'all' | 'profitable' | 'losing'>('all')
  const [positionSort, setPositionSort] = useState<'pnl' | 'size' | 'date'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [portfolioStats, setPortfolioStats] = useState({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    totalRealizedPnL: 0,
  })

  useEffect(() => {
    if (!isConnected) return
    
    loadPortfolio()
    
    // Listen for paper trading updates
    const handleUpdate = () => {
      loadPortfolio()
    }
    window.addEventListener('paper-trading-updated', handleUpdate)
    
    // Refresh every 5 seconds to update P&L
    const interval = setInterval(loadPortfolio, 5000)
    
    return () => {
      window.removeEventListener('paper-trading-updated', handleUpdate)
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

  const loadPortfolio = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    
    try {
      const state = getPaperTradingState()
      
      // Fetch current prices for all positions - use bulk price sync for better performance
      const marketIds = Array.from(new Set([...state.positions.map(p => p.marketId), ...state.orders.map(o => o.marketId)]))
      const priceMap = new Map<string, { yes: number | null; no: number | null }>()
      
      if (marketIds.length > 0) {
        // First, sync prices in the background for better data
        try {
          await fetch('/api/markets/sync-prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marketIds }),
            cache: 'no-store',
          })
        } catch (error) {
          console.warn('Background price sync failed, continuing with direct fetch:', error)
        }
        
        // Then fetch prices for immediate display
        const pricePromises = marketIds.map(async (marketId) => {
          try {
            const response = await fetch(`/api/markets/${marketId}/price`, { cache: 'no-store' })
            if (response.ok) {
              const priceData = await response.json()
              return {
                marketId,
                prices: {
                  yes: priceData.yes?.price ?? null,
                  no: priceData.no?.price ?? null,
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch price for ${marketId}:`, error)
          }
          return null
        })
        
        const priceResults = await Promise.all(pricePromises)
        priceResults.forEach((result) => {
          if (result) {
            priceMap.set(result.marketId, result.prices)
          }
        })
      }
      
      // Get positions with P&L
      const positionsWithPnL = getPositionsWithPnL(priceMap)
      setPositions(positionsWithPnL)
      
      // Get orders
      setOrders(state.orders.filter(o => o.status === 'open'))
      
      // Get portfolio value
      const value = getPortfolioValue(priceMap)
      setPortfolioValue(value)
      
      // Calculate portfolio statistics
      calculatePortfolioStats(positionsWithPnL)
    } catch (error) {
      console.error('Failed to load portfolio:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  
  const calculatePortfolioStats = (positions: PositionWithPnL[]) => {
    const state = getPaperTradingState()
    const history = state.tradeHistory || []
    
    const totalTrades = history.length
    const winningTrades = history.filter(p => (p.pnl ?? 0) > 0).length
    const losingTrades = history.filter(p => (p.pnl ?? 0) < 0).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    
    const wins = history.filter(p => (p.pnl ?? 0) > 0).map(p => p.pnl ?? 0)
    const losses = history.filter(p => (p.pnl ?? 0) < 0).map(p => p.pnl ?? 0)
    
    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0
    const largestWin = wins.length > 0 ? Math.max(...wins) : 0
    const largestLoss = losses.length > 0 ? Math.min(...losses) : 0
    const totalRealizedPnL = history.reduce((sum, p) => sum + (p.pnl ?? 0), 0)
    
    setPortfolioStats({
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      totalRealizedPnL,
    })
  }
  
  const getFilteredAndSortedPositions = () => {
    let filtered = [...positions]
    
    // Filter by P&L
    if (positionFilter === 'profitable') {
      filtered = filtered.filter(p => p.currentPnL > 0)
    } else if (positionFilter === 'losing') {
      filtered = filtered.filter(p => p.currentPnL < 0)
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      switch (positionSort) {
        case 'pnl':
          comparison = a.currentPnL - b.currentPnL
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'date':
          comparison = new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }
  
  const handlePositionClick = (marketId: string) => {
    // Navigate to dedicated market page
    router.push(`/market/${marketId}`)
  }

  const handleClosePosition = async (e: React.MouseEvent, positionId: string) => {
    e.stopPropagation() // Prevent navigation when clicking close button
    const position = positions.find(p => p.id === positionId)
    if (!position) return
    
    const confirmed = await confirm({
      title: 'Close Position',
      message: `Are you sure you want to close this position?\n\nP&L: ${position.currentPnL > 0 ? '+' : ''}${position.currentPnL.toFixed(4)} SOL`,
      confirmText: 'Close Position',
      cancelText: 'Cancel',
      type: position.currentPnL >= 0 ? 'success' : 'warning',
    })
    
    if (!confirmed) return
    
    const result = closePosition(positionId, position.currentPrice)
    if (result.success) {
      playCloseTradeSound()
      await loadPortfolio(true)
      window.dispatchEvent(new CustomEvent('paper-trading-updated'))
    } else {
      toast.showError(result.error || 'Failed to close position')
    }
  }

  const handleCancelOrder = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation() // Prevent navigation when clicking cancel button
    const result = cancelOrder(orderId)
    if (result.success) {
      loadPortfolio(true)
      window.dispatchEvent(new CustomEvent('paper-trading-updated'))
    } else {
      toast.showError(result.error || 'Failed to cancel order')
    }
  }


  return (
    <div className="flex h-screen overflow-hidden bg-terminal-bg">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        filters={filters}
        onFiltersChange={setFilters}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TerminalHeader />

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-1">Portfolio</h1>
                <p className="text-sm text-terminal-text-secondary">Track your positions and performance</p>
              </div>
              <button
                onClick={() => loadPortfolio(true)}
                disabled={loading || refreshing}
                className="px-4 py-2 bg-terminal-surface border border-terminal-border rounded-lg hover:border-terminal-accent hover:bg-terminal-bg transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh market data and recalculate P&L"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-terminal-border">
              <button
                onClick={() => setActiveTab('positions')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'positions'
                    ? 'text-terminal-accent border-b-2 border-terminal-accent'
                    : 'text-terminal-text-secondary hover:text-terminal-text-primary'
                }`}
              >
                Positions ({positions.length})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'orders'
                    ? 'text-terminal-accent border-b-2 border-terminal-accent'
                    : 'text-terminal-text-secondary hover:text-terminal-text-primary'
                }`}
              >
                Open Orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'text-terminal-accent border-b-2 border-terminal-accent'
                    : 'text-terminal-text-secondary hover:text-terminal-text-primary'
                }`}
              >
                Trade History
              </button>
            </div>

            {/* Positions Tab */}
            {activeTab === 'positions' && (
              <div className="terminal-card p-0 overflow-hidden">
                {loading && !refreshing ? (
                  <div className="text-center py-12 text-terminal-text-secondary">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-3 opacity-50" />
                    <div>Loading positions...</div>
                  </div>
                ) : positions.length === 0 ? (
                  <div className="text-center py-12 text-terminal-text-secondary">
                    <div className="text-lg font-medium mb-2">No open positions</div>
                    <div className="text-sm">Start trading to see your positions here</div>
                  </div>
                ) : (
                  <>
                    {/* Filters and Sort */}
                    <div className="p-4 border-b border-terminal-border bg-terminal-bg/30 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Filter size={16} className="text-terminal-text-secondary" />
                        <button
                          onClick={() => setPositionFilter(positionFilter === 'all' ? 'profitable' : positionFilter === 'profitable' ? 'losing' : 'all')}
                          className="px-3 py-1.5 bg-terminal-surface border border-terminal-border rounded-lg hover:border-terminal-accent transition-colors text-sm"
                        >
                          {positionFilter === 'all' ? 'All Positions' : positionFilter === 'profitable' ? 'Profitable' : 'Losing'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <SortAsc size={16} className="text-terminal-text-secondary" />
                        <select
                          value={positionSort}
                          onChange={(e) => setPositionSort(e.target.value as any)}
                          className="px-3 py-1.5 bg-terminal-surface border border-terminal-border rounded-lg text-sm"
                        >
                          <option value="date">Date</option>
                          <option value="pnl">P&L</option>
                          <option value="size">Size</option>
                        </select>
                        <button
                          onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                          className="p-1.5 bg-terminal-surface border border-terminal-border rounded-lg hover:border-terminal-accent transition-colors"
                        >
                          {sortDirection === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-terminal-bg/50">
                          <tr className="border-b border-terminal-border text-left text-xs font-semibold text-terminal-text-secondary uppercase tracking-wider">
                            <th className="px-4 py-3">Market</th>
                            <th className="px-4 py-3">Outcome</th>
                            <th className="px-4 py-3 text-right">Size</th>
                            <th className="px-4 py-3 text-right">Entry</th>
                            <th className="px-4 py-3 text-right">Current</th>
                            <th className="px-4 py-3 text-right">Leverage</th>
                            <th className="px-4 py-3 text-right">P&L</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredAndSortedPositions().map((position) => {
                          const priceChange = position.currentPrice - position.entryPrice
                          const priceChangePercent = (priceChange / position.entryPrice) * 100
                          
                          return (
                            <tr
                              key={position.id}
                              onClick={() => handlePositionClick(position.marketId)}
                              className="border-b border-terminal-border/50 hover:bg-terminal-accent/5 cursor-pointer transition-all group"
                            >
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-terminal-text-primary group-hover:text-terminal-accent transition-colors truncate" title={position.marketQuestion}>
                                      {position.marketQuestion}
                                    </div>
                                  </div>
                                  <ExternalLink size={14} className="text-terminal-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                  position.outcome === 'Yes' 
                                    ? 'bg-terminal-success/20 text-terminal-success border border-terminal-success/30' 
                                    : 'bg-terminal-danger/20 text-terminal-danger border border-terminal-danger/30'
                                }`}>
                                  {position.outcome}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className="font-mono text-sm text-terminal-text-primary">{position.size.toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className="font-mono text-sm text-terminal-text-primary">{(position.entryPrice * 100).toFixed(2)}¢</span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="font-mono text-sm text-terminal-text-primary">{(position.currentPrice * 100).toFixed(2)}¢</span>
                                  {priceChange !== 0 && (
                                    <span className={`text-xs flex items-center ${
                                      priceChange > 0 ? 'text-terminal-success' : 'text-terminal-danger'
                                    }`}>
                                      {priceChange > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                      {Math.abs(priceChangePercent).toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className="text-sm text-terminal-text-secondary">{position.leverage}x</span>
                              </td>
                              <td className={`px-4 py-4 text-right font-semibold ${
                                position.currentPnL > 0 ? 'text-terminal-success' : position.currentPnL < 0 ? 'text-terminal-danger' : 'text-terminal-text-primary'
                              }`}>
                                <div className="flex items-center justify-end gap-1.5">
                                  {position.currentPnL > 0 ? <TrendingUp size={14} /> : position.currentPnL < 0 ? <TrendingDown size={14} /> : null}
                                  <span>{position.currentPnL > 0 ? '+' : ''}{position.currentPnL.toFixed(4)} SOL</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <button
                                  onClick={(e) => handleClosePosition(e, position.id)}
                                  className="px-3 py-1.5 bg-terminal-danger/10 hover:bg-terminal-danger/20 border border-terminal-danger/30 text-terminal-danger rounded-md text-xs font-semibold transition-all hover:scale-105"
                                >
                                  Close
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="terminal-card p-0 overflow-hidden">
                {loading && !refreshing ? (
                  <div className="text-center py-12 text-terminal-text-secondary">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-3 opacity-50" />
                    <div>Loading orders...</div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12 text-terminal-text-secondary">
                    <div className="text-lg font-medium mb-2">No open orders</div>
                    <div className="text-sm">Your limit orders will appear here</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-terminal-bg/50">
                        <tr className="border-b border-terminal-border text-left text-xs font-semibold text-terminal-text-secondary uppercase tracking-wider">
                          <th className="px-4 py-3">Market</th>
                          <th className="px-4 py-3">Outcome</th>
                          <th className="px-4 py-3">Side</th>
                          <th className="px-4 py-3 text-right">Size</th>
                          <th className="px-4 py-3 text-right">Limit Price</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr
                            key={order.id}
                            onClick={() => handlePositionClick(order.marketId)}
                            className="border-b border-terminal-border/50 hover:bg-terminal-accent/5 cursor-pointer transition-all group"
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-terminal-text-primary group-hover:text-terminal-accent transition-colors truncate" title={order.marketQuestion}>
                                    {order.marketQuestion}
                                  </div>
                                </div>
                                <ExternalLink size={14} className="text-terminal-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                order.outcome === 'Yes' 
                                  ? 'bg-terminal-success/20 text-terminal-success border border-terminal-success/30' 
                                  : 'bg-terminal-danger/20 text-terminal-danger border border-terminal-danger/30'
                              }`}>
                                {order.outcome}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                order.side === 'BUY'
                                  ? 'bg-terminal-success/20 text-terminal-success border border-terminal-success/30'
                                  : 'bg-terminal-danger/20 text-terminal-danger border border-terminal-danger/30'
                              }`}>
                                {order.side}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className="font-mono text-sm text-terminal-text-primary">{order.size.toFixed(2)}</span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className="font-mono text-sm text-terminal-text-primary">{(order.price * 100).toFixed(2)}¢</span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="flex items-center gap-1.5 text-xs text-terminal-text-secondary">
                                <Clock size={12} />
                                {order.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                onClick={(e) => handleCancelOrder(e, order.id)}
                                className="p-2 hover:bg-terminal-danger/20 rounded-md transition-all hover:scale-110"
                                title="Cancel order"
                              >
                                <X size={14} className="text-terminal-danger" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Trade History Tab */}
            {activeTab === 'history' && (
              <div className="terminal-card p-0 overflow-hidden">
                {(() => {
                  const tradingState = getPaperTradingState()
                  const history = tradingState.tradeHistory || []
                  return history.length === 0 ? (
                    <div className="text-center py-12 text-terminal-text-secondary">e
                      <div className="text-lg font-medium mb-2">No trade history</div>
                      <div className="text-sm">Your closed positions will appear here</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-terminal-bg/50">
                          <tr className="border-b border-terminal-border text-left text-xs font-semibold text-terminal-text-secondary uppercase tracking-wider">
                            <th className="px-4 py-3">Market</th>
                            <th className="px-4 py-3">Outcome</th>
                            <th className="px-4 py-3">Side</th>
                            <th className="px-4 py-3 text-right">Size</th>
                            <th className="px-4 py-3 text-right">Entry</th>
                            <th className="px-4 py-3 text-right">Exit</th>
                            <th className="px-4 py-3 text-right">P&L</th>
                            <th className="px-4 py-3 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.slice().reverse().map((position) => (
                            <tr
                              key={position.id}
                              onClick={() => handlePositionClick(position.marketId)}
                              className="border-b border-terminal-border/50 hover:bg-terminal-accent/5 cursor-pointer transition-all group"
                            >
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-terminal-text-primary group-hover:text-terminal-accent transition-colors truncate" title={position.marketQuestion}>
                                      {position.marketQuestion}
                                    </div>
                                  </div>
                                  <ExternalLink size={14} className="text-terminal-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                  position.outcome === 'Yes' 
                                    ? 'bg-terminal-success/20 text-terminal-success border border-terminal-success/30' 
                                    : 'bg-terminal-danger/20 text-terminal-danger border border-terminal-danger/30'
                                }`}>
                                  {position.outcome}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                  position.side === 'BUY'
                                    ? 'bg-terminal-success/20 text-terminal-success border border-terminal-success/30'
                                    : 'bg-terminal-danger/20 text-terminal-danger border border-terminal-danger/30'
                                }`}>
                                  {position.side}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className="font-mono text-sm text-terminal-text-primary">{position.size.toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className="font-mono text-sm text-terminal-text-primary">{(position.entryPrice * 100).toFixed(2)}¢</span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className="font-mono text-sm text-terminal-text-primary">
                                  {position.exitPrice ? ((position.exitPrice * 100).toFixed(2)) + '¢' : '—'}
                                </span>
                              </td>
                              <td className={`px-4 py-4 text-right font-semibold ${
                                (position.pnl ?? 0) > 0 ? 'text-terminal-success' : (position.pnl ?? 0) < 0 ? 'text-terminal-danger' : 'text-terminal-text-primary'
                              }`}>
                                <div className="flex items-center justify-end gap-1.5">
                                  {(position.pnl ?? 0) > 0 ? <TrendingUp size={14} /> : (position.pnl ?? 0) < 0 ? <TrendingDown size={14} /> : null}
                                  <span>{(position.pnl ?? 0) > 0 ? '+' : ''}{(position.pnl ?? 0).toFixed(4)} SOL</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className="text-xs text-terminal-text-secondary">
                                  {position.closedAt ? new Date(position.closedAt).toLocaleDateString() : '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

