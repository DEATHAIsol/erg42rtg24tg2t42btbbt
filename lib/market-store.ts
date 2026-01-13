// Simple in-memory market store
// In production, this would be replaced with a database

import { PolymarketMarket } from './polymarket'

class MarketStore {
  private markets: Map<string, PolymarketMarket> = new Map()
  private lastUpdated: Date | null = null
  private updateInProgress = false

  // Store markets
  setMarkets(markets: PolymarketMarket[]) {
    this.markets.clear()
    markets.forEach(market => {
      this.markets.set(market.id, market)
    })
    this.lastUpdated = new Date()
    console.log(`Stored ${this.markets.size} markets`)
  }

  // Add or update a single market
  setMarket(market: PolymarketMarket) {
    this.markets.set(market.id, market)
  }

  // Get all markets
  getAllMarkets(): PolymarketMarket[] {
    return Array.from(this.markets.values())
  }

  // Get market by ID
  getMarket(id: string): PolymarketMarket | undefined {
    return this.markets.get(id)
  }

  // Search markets
  searchMarkets(query: string, filters?: {
    tags?: string[]
    minVolume?: number
    minLiquidity?: number
  }): PolymarketMarket[] {
    const lowerQuery = query.toLowerCase().trim()
    let results = Array.from(this.markets.values())

    // Text search
    if (lowerQuery) {
      results = results.filter(market => {
        const question = market.question.toLowerCase()
        const description = (market.description || '').toLowerCase()
        const tags = (market.tags || []).join(' ').toLowerCase()
        return question.includes(lowerQuery) ||
               description.includes(lowerQuery) ||
               tags.includes(lowerQuery)
      })
    }

    // Tag filter
    if (filters?.tags && filters.tags.length > 0) {
      const filterTags = filters.tags.map(t => t.toLowerCase())
      results = results.filter(market => {
        const marketTags = (market.tags || []).map(t => t.toLowerCase())
        return filterTags.some(ft => 
          marketTags.some(mt => mt === ft || mt.includes(ft) || ft.includes(mt))
        )
      })
    }

    // Volume filter
    if (filters?.minVolume && filters.minVolume > 0) {
      const minVolume = filters.minVolume
      results = results.filter(market => (market.volume || 0) >= minVolume)
    }

    // Liquidity filter
    if (filters?.minLiquidity && filters.minLiquidity > 0) {
      const minLiquidity = filters.minLiquidity
      results = results.filter(market => (market.liquidity || 0) >= minLiquidity)
    }

    return results
  }

  // Get top markets by volume
  getTopMarkets(limit: number = 500, sortBy: 'volume' | 'liquidity' | 'newest' | 'oldest' = 'volume'): PolymarketMarket[] {
    let markets = Array.from(this.markets.values())
      .filter(m => m.active !== false && m.closed !== true)

    // Sort
    markets.sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          // Primary sort by volume (descending), secondary by liquidity for ties
          const volumeDiff = (b.volume || 0) - (a.volume || 0)
          if (volumeDiff !== 0) return volumeDiff
          return (b.liquidity || 0) - (a.liquidity || 0)
        case 'liquidity':
          // Primary sort by liquidity (descending), secondary by volume for ties
          const liquidityDiff = (b.liquidity || 0) - (a.liquidity || 0)
          if (liquidityDiff !== 0) return liquidityDiff
          return (b.volume || 0) - (a.volume || 0)
        case 'newest':
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        case 'oldest':
          const dateAOld = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateBOld = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateAOld - dateBOld
        default:
          // Default to volume sorting
          const defaultVolumeDiff = (b.volume || 0) - (a.volume || 0)
          if (defaultVolumeDiff !== 0) return defaultVolumeDiff
          return (b.liquidity || 0) - (a.liquidity || 0)
      }
    })

    return markets.slice(0, limit)
  }

  // Get store stats
  getStats() {
    return {
      totalMarkets: this.markets.size,
      lastUpdated: this.lastUpdated,
      updateInProgress: this.updateInProgress,
    }
  }

  // Set update status
  setUpdateInProgress(status: boolean) {
    this.updateInProgress = status
  }

  // Clear all markets
  clear() {
    this.markets.clear()
    this.lastUpdated = null
  }
}

// Singleton instance
export const marketStore = new MarketStore()

