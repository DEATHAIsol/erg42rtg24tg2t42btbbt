// Utility script to clear parlays and add SOL funds
// Run this in the browser console or as a one-time script

(function() {
  // Clear all parlays
  localStorage.removeItem('placed-parlays')
  localStorage.removeItem('active-parlays')
  localStorage.removeItem('parlay-legs')
  console.log('✅ Cleared all parlays from storage')
  
  // Add SOL to paper trading balance
  const paperTradingKey = 'paper-trading-state'
  const stored = localStorage.getItem(paperTradingKey)
  let state = stored ? JSON.parse(stored) : { balance: 100, positions: [], orders: [], tradeHistory: [] }
  
  // Add 1000 SOL
  const amountToAdd = 1000
  state.balance = (state.balance || 0) + amountToAdd
  localStorage.setItem(paperTradingKey, JSON.stringify(state))
  console.log(`✅ Added ${amountToAdd} SOL to paper trading balance. New balance: ${state.balance} SOL`)
  
  // Dispatch events to update UI
  window.dispatchEvent(new CustomEvent('parlays-updated'))
  window.dispatchEvent(new CustomEvent('paper-trading-updated'))
  
  return {
    parlaysCleared: true,
    newBalance: state.balance,
    addedFunds: amountToAdd
  }
})()




