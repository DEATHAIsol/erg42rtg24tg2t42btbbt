'use client'

/**
 * PARLAY CALCULATION SYSTEM
 * 
 * PRICE FORMAT:
 * - Prices are probabilities stored as decimals (0-1 range)
 * - Example: 0.99 = 99% probability, 0.50 = 50% probability
 * - When displayed, multiply by 100 to show as percentage/cents
 * 
 * CURRENCY FORMAT:
 * - All monetary values (stake, payout, value, P&L) are in SOL
 * - No currency conversion - SOL stays as SOL
 * 
 * COMBINED ODDS:
 * - Product of all leg probabilities (decimal 0-1)
 * - Example: 0.50 * 0.50 = 0.25 (25% combined probability)
 * 
 * CALCULATIONS:
 * - Shares Purchased = Stake (SOL) / Entry Combined Odds (decimal)
 *   Example: 25 SOL / 0.00792 = 3,156.57 shares
 * - Potential Payout (SOL) = Shares × Entry Combined Odds = Stake (SOL) / Entry Combined Odds
 * - Current Value (SOL) = Shares × Current Combined Odds (decimal)
 *   Example: 3,156.57 shares × 0.00099 = 3.125 SOL
 * - P&L (SOL) = Current Value (SOL) - Stake (SOL)
 */

import { PolymarketMarket } from './polymarket'

export interface ParlayLeg {
  market: PolymarketMarket
  outcome: 'Yes' | 'No'
  price: number // Probability in decimal format (0-1)
  id: string
  legStatus?: 'pending' | 'won' | 'lost'
  resolvedAt?: string
  currentPrice?: number // Current market price (decimal 0-1)
}

export interface PlacedParlay {
  id: string
  legs: ParlayLeg[]
  stakeAmount: number // In SOL
  combinedOdds: number // Decimal probability (0-1)
  potentialPayout: number // In SOL
  placedAt: string
  status: 'active' | 'won' | 'lost' | 'pending'
  resolvedAt?: string
  actualPayout?: number // In SOL
  currentValue?: number // In SOL
  currentCombinedOdds?: number // Decimal probability (0-1)
  currentPnL?: number // In SOL
}

const STORAGE_KEY = 'placed-parlays'
const PARLAY_STORAGE_KEY = 'active-parlays'

// Price validation and normalization
export function normalizePrice(price: any): number | null {
  if (price === null || price === undefined) return null
  
  let numPrice = typeof price === 'string' ? parseFloat(price) : price
  
  if (isNaN(numPrice) || !isFinite(numPrice)) return null
  
  // Check if price is in percentage format (1-100) instead of decimal (0-1)
  // Convert percentage to decimal if needed
  if (numPrice > 1 && numPrice <= 100) {
    numPrice = numPrice / 100
  }
  
  // Validate price is in valid decimal range (0-1)
  if (numPrice > 0 && numPrice < 1) {
    return numPrice
  }
  
  return null
}

// Calculate combined odds from leg prices
// Prioritizes currentPrice if available, otherwise uses entry price
export function calculateCombinedOdds(legs: ParlayLeg[]): number {
  if (legs.length === 0) return 0
  
  let combinedOdds = 1
  
  for (const leg of legs) {
    // Use currentPrice if available (for current value calculations), otherwise use entry price
    const price = normalizePrice(leg.currentPrice ?? leg.price)
    if (price === null || price <= 0 || price >= 1) {
      return 0 // Invalid price
    }
    combinedOdds *= price
  }
  
  // Validate combined odds
  if (combinedOdds <= 0 || combinedOdds >= 1) {
    return 0
  }
  
  // Round to 8 decimal places for precision
  return Math.round(combinedOdds * 100000000) / 100000000
}

// Calculate payout from stake and combined odds
// Returns payout in SOL
export function calculatePayout(stakeSOL: number, combinedOdds: number): number {
  if (stakeSOL <= 0 || combinedOdds <= 0 || combinedOdds >= 1) {
    return 0
  }
  
  const payout = stakeSOL / combinedOdds
  // Round to 4 decimal places for SOL precision
  return Math.round(payout * 10000) / 10000
}

// Calculate P&L from current value and stake
// Returns P&L in SOL
export function calculatePnL(currentValueSOL: number, stakeSOL: number): number {
  const pnl = currentValueSOL - stakeSOL
  // Round to 4 decimal places for SOL precision
  return Math.round(pnl * 10000) / 10000
}

// Get all placed parlays
export function getPlacedParlays(): PlacedParlay[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Ensure we return an array (handle edge cases)
      if (Array.isArray(parsed)) {
        return parsed
      } else {
        console.warn('Storage contains non-array data, resetting to empty array')
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
        return []
      }
    }
  } catch (e) {
    console.error('Error loading placed parlays:', e)
  }
  
  return []
}

// Save placed parlay
export function savePlacedParlay(parlay: PlacedParlay): void {
  if (typeof window === 'undefined') return
  
  try {
    const existing = getPlacedParlays()
    // Check if parlay with this ID already exists (prevent duplicates)
    const existingIndex = existing.findIndex(p => p.id === parlay.id)
    if (existingIndex >= 0) {
      console.warn(`Parlay with ID ${parlay.id} already exists, updating instead of appending`)
      existing[existingIndex] = parlay
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
      console.log(`Updated parlay ${parlay.id}, total parlays: ${existing.length}`)
    } else {
      const updated = [...existing, parlay]
      console.log(`Saving parlay ${parlay.id}, total parlays: ${updated.length}`)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('parlays-updated'))
  } catch (e) {
    console.error('Error saving parlay:', e)
  }
}

// Update parlay status
export function updateParlayStatus(parlayId: string, updates: Partial<PlacedParlay>): boolean {
  if (typeof window === 'undefined') return false
  
  const parlays = getPlacedParlays()
  const index = parlays.findIndex(p => p.id === parlayId)
  
  if (index === -1) return false
  
  parlays[index] = { ...parlays[index], ...updates }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parlays))
  window.dispatchEvent(new CustomEvent('parlays-updated'))
  
  return true
}

// Check and update parlay leg status based on market resolution
export async function checkParlayLegStatus(leg: ParlayLeg): Promise<'pending' | 'won' | 'lost'> {
  try {
    const response = await fetch(`/api/markets/${leg.market.id}`, { cache: 'no-store' })
    if (response.ok) {
      const market = await response.json()
      
      if (market.closed || market.active === false) {
        const yesPrice = market.yesPrice ?? 0
        const noPrice = market.noPrice ?? 0
        
        if (leg.outcome === 'Yes') {
          if (yesPrice >= 0.99) return 'won'
          if (yesPrice <= 0.01) return 'lost'
        } else if (leg.outcome === 'No') {
          if (noPrice >= 0.99) return 'won'
          if (noPrice <= 0.01) return 'lost'
        }
      }
    }
  } catch (error) {
    console.warn('Error checking leg status:', error)
  }
  
  return 'pending'
}

// Check and update entire parlay status
export async function checkParlayStatus(parlay: PlacedParlay): Promise<PlacedParlay> {
  let allResolved = true
  let allWon = true
  let hasLost = false
  
  const updatedLegs = await Promise.all(
    parlay.legs.map(async (leg) => {
      const legStatus = await checkParlayLegStatus(leg)
      
      if (legStatus === 'pending') {
        allResolved = false
      }
      if (legStatus === 'lost') {
        allWon = false
        hasLost = true
      }
      
      return {
        ...leg,
        legStatus,
        resolvedAt: legStatus !== 'pending' ? new Date().toISOString() : leg.resolvedAt,
      }
    })
  )
  
  let newStatus = parlay.status
  let resolvedAt = parlay.resolvedAt
  let actualPayout = parlay.actualPayout
  
  if (allResolved) {
    if (allWon && !hasLost) {
      newStatus = 'won'
      actualPayout = parlay.potentialPayout
      resolvedAt = new Date().toISOString()
      addParlayWinnings(parlay.id, actualPayout)
    } else if (hasLost) {
      newStatus = 'lost'
      actualPayout = 0
      resolvedAt = new Date().toISOString()
    }
  } else {
    if (hasLost) {
      newStatus = 'lost'
      actualPayout = 0
      resolvedAt = new Date().toISOString()
    }
  }
  
  const updatedParlay: PlacedParlay = {
    ...parlay,
    legs: updatedLegs,
    status: newStatus,
    resolvedAt,
    actualPayout,
  }
  
  if (newStatus !== parlay.status) {
    updateParlayStatus(parlay.id, {
      legs: updatedLegs,
      status: newStatus,
      resolvedAt,
      actualPayout,
    })
  }
  
  return updatedParlay
}

// Add parlay winnings to paper trading balance
function addParlayWinnings(parlayId: string, amount: number): void {
  if (typeof window === 'undefined') return
  
  try {
    const stored = localStorage.getItem('paper-trading-state')
    if (stored) {
      const state = JSON.parse(stored)
      state.balance += amount
      localStorage.setItem('paper-trading-state', JSON.stringify(state))
      window.dispatchEvent(new CustomEvent('paper-trading-updated'))
    }
  } catch (error) {
    console.error('Error adding parlay winnings:', error)
  }
}

// Get parlay statistics
export function getParlayStats(parlays: PlacedParlay[]): {
  total: number
  active: number
  won: number
  lost: number
  pending: number
  totalStaked: number
  totalWon: number
  totalPotentialPayout: number
  winRate: number
} {
  const stats = {
    total: parlays.length,
    active: 0,
    won: 0,
    lost: 0,
    pending: 0,
    totalStaked: 0,
    totalWon: 0,
    totalPotentialPayout: 0,
    winRate: 0,
  }
  
  parlays.forEach(parlay => {
    stats.totalStaked += parlay.stakeAmount
    stats.totalPotentialPayout += parlay.potentialPayout
    
    switch (parlay.status) {
      case 'active':
        stats.active++
        break
      case 'won':
        stats.won++
        stats.totalWon += parlay.actualPayout || parlay.potentialPayout
        break
      case 'lost':
        stats.lost++
        break
      case 'pending':
        stats.pending++
        break
    }
  })
  
  const resolved = stats.won + stats.lost
  stats.winRate = resolved > 0 ? (stats.won / resolved) * 100 : 0
  
  return stats
}

// Get current price for a market leg
export async function getCurrentLegPrice(leg: ParlayLeg): Promise<number | null> {
  try {
    const response = await fetch(`/api/markets/${leg.market.id}/price`, { cache: 'no-store' })
    if (response.ok) {
      const priceData = await response.json()
      const rawPrice = leg.outcome === 'Yes' 
        ? (priceData.yes?.price ?? null)
        : (priceData.no?.price ?? null)
      
      return normalizePrice(rawPrice)
    }
  } catch (error) {
    console.warn('Error fetching current leg price:', error)
  }
  
  return null
}

// Calculate current value of a parlay based on current market prices
export async function calculateParlayCurrentValue(parlay: PlacedParlay): Promise<{
  currentValue: number // In SOL
  currentCombinedOdds: number // Decimal probability (0-1)
  currentPnL: number // In SOL
  legPrices: Map<string, number>
  updatedLegs: ParlayLeg[]
}> {
  // If parlay is already resolved (won), return final values
  if (parlay.status === 'won' && parlay.actualPayout !== undefined) {
    return {
      currentValue: parlay.actualPayout,
      currentCombinedOdds: 0,
      currentPnL: calculatePnL(parlay.actualPayout, parlay.stakeAmount),
      legPrices: new Map(),
      updatedLegs: parlay.legs,
    }
  }
  
  // If parlay is lost, return zero values
  if (parlay.status === 'lost') {
    return {
      currentValue: 0,
      currentCombinedOdds: 0,
      currentPnL: -parlay.stakeAmount,
      legPrices: new Map(),
      updatedLegs: parlay.legs,
    }
  }
  
  // Check if any leg is lost - parlay value is 0
  const hasLostLeg = parlay.legs.some(leg => leg.legStatus === 'lost')
  if (hasLostLeg) {
    return {
      currentValue: 0,
      currentCombinedOdds: 0,
      currentPnL: -parlay.stakeAmount,
      legPrices: new Map(),
      updatedLegs: parlay.legs,
    }
  }
  
  // Fetch current prices for all legs
  const legPrices = new Map<string, number>()
  const updatedLegs = await Promise.all(
    parlay.legs.map(async (leg) => {
      // If leg already won, use 1.0 (100% probability)
      if (leg.legStatus === 'won') {
        legPrices.set(leg.id, 1.0)
        return { ...leg, currentPrice: 1.0 }
      }
      
      // If leg lost, parlay is already lost (checked above)
      if (leg.legStatus === 'lost') {
        legPrices.set(leg.id, 0)
        return { ...leg, currentPrice: 0 }
      }
      
      // Fetch current price, fallback to entry price
      const currentPrice = await getCurrentLegPrice(leg)
      const price = currentPrice ?? leg.price
      
      if (price !== null && price > 0 && price < 1) {
        legPrices.set(leg.id, price)
        return { ...leg, currentPrice: price }
      }
      
      // Fallback to entry price if current price fetch failed
      legPrices.set(leg.id, leg.price)
      return { ...leg, currentPrice: leg.price }
    })
  )
  
  // Calculate current combined odds (product of all leg probabilities)
  const currentCombinedOdds = calculateCombinedOdds(updatedLegs)
  
  // Calculate current value based on shares purchased at entry price
  // Shares = Stake / Entry Combined Odds
  // Current Value = Shares × Current Combined Odds
  let currentValue = 0
  if (currentCombinedOdds > 0 && parlay.combinedOdds > 0) {
    // Calculate number of shares purchased at entry
    const shares = parlay.stakeAmount / parlay.combinedOdds
    // Current value = shares × current price per share
    currentValue = shares * currentCombinedOdds
    // Round to 4 decimal places for SOL precision
    currentValue = Math.round(currentValue * 10000) / 10000
  } else {
    // Fallback to stake if odds invalid
    currentValue = parlay.stakeAmount
  }
  
  // Calculate P&L: current value (SOL) - stake (SOL)
  const currentPnL = calculatePnL(currentValue, parlay.stakeAmount)
  
  return {
    currentValue,
    currentCombinedOdds,
    currentPnL,
    legPrices,
    updatedLegs,
  }
}

// Update parlay with current values
export async function updateParlayCurrentValue(parlay: PlacedParlay): Promise<PlacedParlay> {
  const { currentValue, currentCombinedOdds, currentPnL, updatedLegs } = await calculateParlayCurrentValue(parlay)
  
  return {
    ...parlay,
    legs: updatedLegs,
    currentValue,
    currentCombinedOdds,
    currentPnL,
  }
}

// Update all active parlays with current values
export async function updateAllParlayCurrentValues(parlays: PlacedParlay[]): Promise<PlacedParlay[]> {
  const updatedParlays = await Promise.all(
    parlays.map(parlay => {
      if (parlay.status === 'active' || parlay.status === 'pending') {
        return updateParlayCurrentValue(parlay)
      }
      return Promise.resolve(parlay)
    })
  )
  
  return updatedParlays
}

// Clear all placed parlays from storage
export function clearAllParlays(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(PARLAY_STORAGE_KEY)
  localStorage.removeItem('parlay-legs')
  window.dispatchEvent(new CustomEvent('parlays-updated'))
  console.log('✅ All parlays cleared from storage')
}

// Delete a parlay (for cleanup/testing)
export function deleteParlay(parlayId: string): boolean {
  if (typeof window === 'undefined') return false
  
  const parlays = getPlacedParlays()
  const filtered = parlays.filter(p => p.id !== parlayId)
  
  if (filtered.length === parlays.length) return false
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  window.dispatchEvent(new CustomEvent('parlays-updated'))
  
  return true
}
