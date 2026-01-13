// Admin API route to clear parlays and add funds
// This can be called from the browser console or as a one-time operation
import { NextResponse } from 'next/server'

export async function POST() {
  // This is a server-side route, but localStorage is client-side only
  // We need to handle this client-side or provide instructions
  return NextResponse.json({
    message: 'This operation must be performed client-side. Please run the script in the browser console.',
    instructions: [
      'Open browser console (F12)',
      'Run: localStorage.removeItem("placed-parlays"); localStorage.removeItem("active-parlays"); localStorage.removeItem("parlay-legs");',
      'Run: const state = JSON.parse(localStorage.getItem("paper-trading-state") || \'{"balance":100,"positions":[],"orders":[],"tradeHistory":[]}\'); state.balance = (state.balance || 0) + 1000; localStorage.setItem("paper-trading-state", JSON.stringify(state)); window.dispatchEvent(new CustomEvent("paper-trading-updated")); window.dispatchEvent(new CustomEvent("parlays-updated"));',
      'Refresh the page'
    ]
  })
}

