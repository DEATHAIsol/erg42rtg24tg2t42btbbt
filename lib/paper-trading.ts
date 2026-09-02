'use client'

export interface PaperPosition {
  id: string
  marketId: string
  marketQuestion: string
  outcome: 'Yes' | 'No'
  side: 'BUY' | 'SELL'
  size: number // Position size in shares
  entryPrice: number // Entry price (0-1)
  leverage: number
  openedAt: string
  closedAt?: string
  exitPrice?: number
  pnl?: number // Realized P&L if closed
}

export interface PaperOrder {
  id: string
  marketId: string
  marketQuestion: string
  outcome: 'Yes' | 'No'
  side: 'BUY' | 'SELL'
  size: number
  price: number // Limit price (0-1)
  orderType: 'market' | 'limit'
  status: 'open' | 'filled' | 'cancelled'
  createdAt: string
  filledAt?: string
}

export interface PaperTradingState {
  balance: number // SOL balance
  positions: PaperPosition[]
  orders: PaperOrder[]
  tradeHistory: PaperPosition[] // Closed positions
}

const STORAGE_KEY = 'paper-trading-state'
const INITIAL_BALANCE = 100 // Starting with 100 SOL for paper trading

// Get or initialize paper trading state
export function getPaperTradingState(): PaperTradingState {
  if (typeof window === 'undefined') {
    return {
      balance: INITIAL_BALANCE,
      positions: [],
      orders: [],
      tradeHistory: [],
    }
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // If parse fails, return initial state
    }
  }

  const initialState: PaperTradingState = {
    balance: INITIAL_BALANCE,
    positions: [],
    orders: [],
    tradeHistory: [],
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState))
  return initialState
}

// Save paper trading state
function saveState(state: PaperTradingState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// Open a new position (simulate buying)
export function openPosition(
  marketId: string,
  marketQuestion: string,
  outcome: 'Yes' | 'No',
  side: 'BUY' | 'SELL',
  size: number,
  entryPrice: number,
  leverage: number,
  fees: number = 0
): { success: boolean; error?: string; position?: PaperPosition } {
  const state = getPaperTradingState()

  if (!(entryPrice > 0 && entryPrice < 1) || !(size > 0) || !isFinite(size)) {
    return { success: false, error: 'Invalid price or size for this market' }
  }

  // `size` is shares, so margin = shares * entryPrice / leverage. Fees are
  // charged on top — previously they were shown in the UI but never deducted.
  const margin = (size * entryPrice) / leverage
  const cost = margin + fees
  const required = cost + 0.01 // small buffer

  if (state.balance < required) {
    return { success: false, error: `Insufficient balance. Need ${required.toFixed(4)} SOL (including 0.01 SOL buffer), have ${state.balance.toFixed(4)} SOL` }
  }

  const position: PaperPosition = {
    id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    marketId,
    marketQuestion,
    outcome,
    side,
    size,
    entryPrice,
    leverage,
    openedAt: new Date().toISOString(),
  }

  // Deduct margin + fees
  state.balance -= cost
  state.positions.push(position)
  saveState(state)

  return { success: true, position }
}

// Close a position (simulate selling)
export function closePosition(
  positionId: string,
  exitPrice: number
): { success: boolean; error?: string; pnl?: number } {
  const state = getPaperTradingState()
  const positionIndex = state.positions.findIndex(p => p.id === positionId)
  
  if (positionIndex === -1) {
    return { success: false, error: 'Position not found' }
  }

  const position = state.positions[positionIndex]
  
  // Calculate P&L
  // For BUY: P&L = (exitPrice - entryPrice) * size * leverage
  // For SELL: P&L = (entryPrice - exitPrice) * size * leverage
  const pnl = calculatePositionPnL(position, exitPrice)

  // Return the margin plus P&L. Fees are sunk and are not refunded.
  const margin = (position.size * position.entryPrice) / position.leverage
  state.balance += margin + pnl

  // Move to trade history
  const closedPosition: PaperPosition = {
    ...position,
    closedAt: new Date().toISOString(),
    exitPrice,
    pnl,
  }
  state.tradeHistory.push(closedPosition)
  state.positions.splice(positionIndex, 1)
  saveState(state)

  return { success: true, pnl }
}

// Place an order (limit or market)
export function placePaperOrder(
  marketId: string,
  marketQuestion: string,
  outcome: 'Yes' | 'No',
  side: 'BUY' | 'SELL',
  size: number,
  price: number,
  orderType: 'market' | 'limit',
  leverage: number = 1,
  fees: number = 0
): { success: boolean; error?: string; order?: PaperOrder; position?: PaperPosition } {
  const state = getPaperTradingState()

  if (orderType === 'market') {
    // Market orders execute immediately
    const result = openPosition(marketId, marketQuestion, outcome, side, size, price, leverage, fees)
    if (result.success && result.position) {
      return { success: true, position: result.position }
    }
    return result
  } else {
    // Limit orders are stored
    const cost = (size * price) / leverage + fees
    const required = cost + 0.01
    
    if (state.balance < required) {
      return { success: false, error: `Insufficient balance. Need ${required.toFixed(4)} SOL (including 0.01 SOL buffer), have ${state.balance.toFixed(4)} SOL` }
    }

    // Reserve the cost (deduct from balance)
    state.balance -= cost

    const order: PaperOrder = {
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      marketId,
      marketQuestion,
      outcome,
      side,
      size,
      price,
      orderType: 'limit',
      status: 'open',
      createdAt: new Date().toISOString(),
    }

    state.orders.push(order)
    saveState(state)

    return { success: true, order }
  }
}

// Cancel an order
export function cancelOrder(orderId: string): { success: boolean; error?: string } {
  const state = getPaperTradingState()
  const orderIndex = state.orders.findIndex(o => o.id === orderId)
  
  if (orderIndex === -1) {
    return { success: false, error: 'Order not found' }
  }

  const order = state.orders[orderIndex]
  if (order.status !== 'open') {
    return { success: false, error: 'Order cannot be cancelled' }
  }

  // Refund the reserved balance
  const cost = (order.size * order.price) / 1
  state.balance += cost

  order.status = 'cancelled'
  state.orders.splice(orderIndex, 1)
  saveState(state)

  return { success: true }
}

// Get current P&L for a position based on current price
/**
 * P&L for a position.
 *
 * `size` is the number of shares, and leverage is already reflected in that
 * count (shares = margin * leverage / entryPrice). Multiplying by leverage
 * again here double-counted it and inflated every P&L figure.
 */
export function calculatePositionPnL(position: PaperPosition, currentPrice: number): number {
  const direction = position.side === 'BUY' ? 1 : -1
  return direction * (currentPrice - position.entryPrice) * position.size
}

// Get all positions with current P&L
export function getPositionsWithPnL(currentPrices: Map<string, { yes: number | null; no: number | null }>): (PaperPosition & { currentPnL: number; currentPrice: number })[] {
  const state = getPaperTradingState()
  
  return state.positions.map(position => {
    const prices = currentPrices.get(position.marketId)
    const currentPrice = position.outcome === 'Yes' 
      ? (prices?.yes ?? position.entryPrice)
      : (prices?.no ?? position.entryPrice)
    
    const currentPnL = calculatePositionPnL(position, currentPrice)
    
    return {
      ...position,
      currentPnL,
      currentPrice,
    }
  })
}

// Get total portfolio value
export function getPortfolioValue(currentPrices: Map<string, { yes: number | null; no: number | null }>): {
  totalValue: number
  totalPnL: number
  availableBalance: number
} {
  const state = getPaperTradingState()
  const positionsWithPnL = getPositionsWithPnL(currentPrices)
  
  const totalPnL = positionsWithPnL.reduce((sum, pos) => sum + pos.currentPnL, 0)
  const totalValue = state.balance + totalPnL
  
  return {
    totalValue,
    totalPnL,
    availableBalance: state.balance,
  }
}

// Set paper trading balance (used for demo mode)
export function setPaperTradingBalance(amount: number): number {
  if (typeof window === 'undefined') return amount
  const state = getPaperTradingState()
  state.balance = amount
  saveState(state)
  window.dispatchEvent(new CustomEvent('paper-trading-updated'))
  return state.balance
}

// Reset paper trading (for testing)
export function resetPaperTrading() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('paper-trading-updated'))
}

// Add SOL to paper trading balance (for testing)
export function addFunds(amount: number): number {
  if (typeof window === 'undefined') return 0
  
  const state = getPaperTradingState()
  state.balance = (state.balance || 0) + amount
  saveState(state)
  window.dispatchEvent(new CustomEvent('paper-trading-updated'))
  console.log(`✅ Added ${amount} SOL to paper trading balance. New balance: ${state.balance} SOL`)
  return state.balance
}

