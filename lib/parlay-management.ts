import { PolymarketMarket } from './polymarket'

// Types
export interface ParlayLeg {
  market: PolymarketMarket
  outcome: 'Yes' | 'No'
  price: number // Decimal 0-1
  id: string
  legStatus?: 'pending' | 'won' | 'lost' // Status of individual leg
  currentPrice?: number // Current price of the leg
}

export interface PlacedParlay {
  id: string
  legs: ParlayLeg[]
  stakeAmount: number // In ETH
  combinedOdds: number // Decimal 0-1, product of leg prices
  potentialPayout: number // In ETH
  placedAt: string // ISO date string
  status: 'active' | 'won' | 'lost' | 'partial'
  /** Guards against crediting the same winning parlay more than once. */
  payoutCredited?: boolean
  /** Legs whose price has pinned to a near-certain outcome. */
  legsWon?: number
  legsLost?: number
  currentValue?: number // Current value based on current prices
  currentCombinedOdds?: number // Current combined odds based on live prices
  currentPnL?: number // Current profit/loss
  actualPayout?: number // Actual payout when won
  settledAt?: string // When the parlay was settled
}

export interface ParlayStats {
  active: number
  won: number
  lost: number
  partial: number
  total: number
  winRate: number
  totalStaked: number
  totalWon: number
  totalLost: number
  netPnL: number
}

const STORAGE_KEY = 'placed-parlays'

// Calculate combined odds by multiplying all leg prices
export function calculateCombinedOdds(legs: ParlayLeg[]): number {
  if (legs.length === 0) return 0
  return legs.reduce((acc, leg) => acc * leg.price, 1)
}

// Calculate potential payout: stake / combinedOdds
/**
 * Combined odds for a multi-leg parlay are a tiny probability (three legs can
 * easily land near 0.000003), and rendering that as cents gives "0.0003¢",
 * which tells the user nothing. Express it the way a book does: as the payout
 * multiple on the stake.
 */
export function formatParlayOdds(combinedOdds: number): string {
  if (!(combinedOdds > 0) || !isFinite(combinedOdds)) return '—'
  const multiple = 1 / combinedOdds
  if (multiple >= 1000) return `${Math.round(multiple).toLocaleString()}x`
  if (multiple >= 100) return `${multiple.toFixed(0)}x`
  return `${multiple.toFixed(2)}x`
}

/** The same number as an implied percentage chance, for secondary display. */
export function formatImpliedChance(combinedOdds: number): string {
  if (!(combinedOdds > 0) || !isFinite(combinedOdds)) return '—'
  const pct = combinedOdds * 100
  if (pct < 0.01) return '<0.01%'
  return `${pct.toFixed(2)}%`
}

export function calculatePayout(stake: number, combinedOdds: number): number {
  if (combinedOdds <= 0 || combinedOdds >= 1) return 0
  return stake / combinedOdds
}

// Save a placed parlay to localStorage
export function savePlacedParlay(parlay: PlacedParlay): void {
  const parlays = getPlacedParlays()
  parlays.unshift(parlay) // Add to beginning
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parlays))
}

// Get all placed parlays from localStorage
export function getPlacedParlays(): PlacedParlay[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as PlacedParlay[]
  } catch (error) {
    console.error('Error loading parlays:', error)
    return []
  }
}

// Update a parlay in storage
export function updatePlacedParlay(updatedParlay: PlacedParlay): void {
  const parlays = getPlacedParlays()
  const index = parlays.findIndex(p => p.id === updatedParlay.id)
  if (index !== -1) {
    parlays[index] = updatedParlay
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parlays))
  }
}

// Delete a parlay from storage
export function deletePlacedParlay(parlayId: string): void {
  const parlays = getPlacedParlays()
  const filtered = parlays.filter(p => p.id !== parlayId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

// Get parlay statistics
export function getParlayStats(parlays: PlacedParlay[]): ParlayStats {
  const stats: ParlayStats = {
    active: 0,
    won: 0,
    lost: 0,
    partial: 0,
    total: parlays.length,
    winRate: 0,
    totalStaked: 0,
    totalWon: 0,
    totalLost: 0,
    netPnL: 0,
  }

  for (const parlay of parlays) {
    stats.totalStaked += parlay.stakeAmount

    switch (parlay.status) {
      case 'active':
        stats.active++
        break
      case 'won':
        stats.won++
        stats.totalWon += parlay.potentialPayout
        break
      case 'lost':
        stats.lost++
        stats.totalLost += parlay.stakeAmount
        break
      case 'partial':
        stats.partial++
        break
    }
  }

  const settled = stats.won + stats.lost
  stats.winRate = settled > 0 ? (stats.won / settled) * 100 : 0
  stats.netPnL = stats.totalWon - stats.totalLost

  return stats
}

// Check parlay status by fetching current market data
export async function checkParlayStatus(parlay: PlacedParlay): Promise<PlacedParlay> {
  if (parlay.status !== 'active') {
    return parlay // Already settled
  }

  try {
    // Check each leg's market status
    let allWon = true
    let anyLost = false

    for (const leg of parlay.legs) {
      // Fetch current market data
      const response = await fetch(`/api/markets/${leg.market.id}`)
      if (!response.ok) continue

      const market = await response.json()
      
      // Check if market is closed/resolved
      if (market.closed) {
        // Determine if this leg won or lost based on resolution
        // If yesPrice is 1 (or very close), Yes won
        // If yesPrice is 0 (or very close), No won
        const yesPrice = market.yesPrice ?? 0.5
        const yesWon = yesPrice > 0.95
        const noWon = yesPrice < 0.05

        if (leg.outcome === 'Yes' && !yesWon) {
          anyLost = true
          allWon = false
        } else if (leg.outcome === 'No' && !noWon) {
          anyLost = true
          allWon = false
        } else if (!yesWon && !noWon) {
          // Market not fully resolved yet
          allWon = false
        }
      } else {
        // Market still active
        allWon = false
      }
    }

    // Update status based on leg results
    let newStatus: PlacedParlay['status'] = 'active'
    if (anyLost) {
      newStatus = 'lost'
    } else if (allWon) {
      newStatus = 'won'
    }

    if (newStatus !== parlay.status) {
      const isSettled = newStatus === 'won' || newStatus === 'lost' || newStatus === 'partial'
      const actualPayout = newStatus === 'won' ? parlay.potentialPayout : undefined

      // Settle the P&L too. Previously only the status changed, and because
      // updateAllParlayCurrentValues skips non-active parlays, a settled slip
      // kept whatever mark-to-market figure it happened to hold: a lost parlay
      // could sit there reading -19.53 when the real loss is the whole stake.
      const settledValue =
        newStatus === 'won' ? (actualPayout ?? 0) : newStatus === 'lost' ? 0 : parlay.currentValue

      const updated: PlacedParlay = {
        ...parlay,
        status: newStatus,
        settledAt: isSettled ? new Date().toISOString() : undefined,
        actualPayout,
        currentValue: isSettled ? settledValue : parlay.currentValue,
        currentCombinedOdds:
          newStatus === 'won' ? 1 : newStatus === 'lost' ? 0 : parlay.currentCombinedOdds,
        currentPnL: isSettled
          ? (settledValue ?? 0) - parlay.stakeAmount
          : parlay.currentPnL,
      }
      updatePlacedParlay(updated)
      return updated
    }

    return parlay
  } catch (error) {
    console.error('Error checking parlay status:', error)
    return parlay
  }
}

// Update current values for all parlays based on current prices
export async function updateAllParlayCurrentValues(parlays: PlacedParlay[]): Promise<PlacedParlay[]> {
  const updated: PlacedParlay[] = []

  for (const parlay of parlays) {
    if (parlay.status !== 'active') {
      updated.push(parlay)
      continue
    }

    try {
      let currentCombinedOdds = 1

      let legsResolvedWon = 0
      let legsLost = 0

      for (const leg of parlay.legs) {
        // Fetch current market prices
        const response = await fetch(`/api/markets/${leg.market.id}`)
        if (!response.ok) {
          currentCombinedOdds *= leg.price // Use original price if fetch fails
          continue
        }

        const market = await response.json()
        
        // Get current price for the leg's outcome
        let currentPrice = leg.price
        if (leg.outcome === 'Yes') {
          currentPrice = market.yesPrice ?? market.yesBuyPrice ?? leg.price
        } else {
          currentPrice = market.noPrice ?? market.noBuyPrice ?? leg.price
        }

        currentCombinedOdds *= currentPrice

        // A leg is effectively decided once its price pins to an extreme.
        if (currentPrice >= 0.99) legsResolvedWon++
        else if (currentPrice <= 0.01) legsLost++
      }

      // Calculate current value and PnL
      // Current Value = Stake × (Current Odds / Entry Odds)
      // This reflects what the position is worth NOW, not potential future payout
      const currentValue = parlay.combinedOdds > 0 
        ? parlay.stakeAmount * (currentCombinedOdds / parlay.combinedOdds)
        : parlay.stakeAmount
      const currentPnL = currentValue - parlay.stakeAmount

      const updatedParlay: PlacedParlay = {
        ...parlay,
        currentValue,
        currentCombinedOdds,
        currentPnL,
        legsWon: legsResolvedWon,
        legsLost,
      }

      updatePlacedParlay(updatedParlay)
      updated.push(updatedParlay)
    } catch (error) {
      console.error('Error updating parlay values:', error)
      updated.push(parlay)
    }
  }

  return updated
}

// Clear all parlays (for testing/reset)
export function clearAllParlays(): void {
  localStorage.removeItem(STORAGE_KEY)
}
