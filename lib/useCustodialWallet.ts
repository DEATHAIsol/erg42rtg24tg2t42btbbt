'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthState } from './auth'
import { getPaperTradingState } from './paper-trading'
import { getDemoMode, setDemoMode as persistDemoMode } from './demo-mode'

export type AccountMode = 'live' | 'demo'

/**
 * Single source of truth for who is trading and with what balance.
 *
 * Signed out -> demo is forced. A guest has no funded address, so the terminal
 *               assigns a practice balance automatically and cannot be switched
 *               to live mode.
 * Signed in  -> LIVE by default, showing the account's real Robinhood Chain
 *               balance (0 ETH until funded). Demo is an explicit opt-in.
 */
export function useCustodialWallet() {
  const { isLoaded, isSignedIn } = useAuthState()
  const [address, setAddress] = useState<string | null>(null)
  const [liveBalance, setLiveBalance] = useState<number | null>(null)
  const [paperBalance, setPaperBalance] = useState(0)
  const [demoPreference, setDemoPreference] = useState(false)
  const [ready, setReady] = useState(false)

  /* ------------------- Resolve the account address + balance ---------------- */
  const loadAccount = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet', { cache: 'no-store' })
      const body = await res.json()
      setAddress(body?.address ?? null)
      setLiveBalance(typeof body?.balance === 'number' ? body.balance : null)
    } catch {
      setAddress(null)
      setLiveBalance(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      setAddress(null)
      setLiveBalance(null)
      setReady(true)
      return
    }

    loadAccount()
    // Refresh the on-chain balance periodically while signed in.
    const interval = setInterval(loadAccount, 30000)
    return () => clearInterval(interval)
  }, [isLoaded, isSignedIn, loadAccount])

  /* ---------------------------- Paper balance ------------------------------- */
  useEffect(() => {
    const sync = () => setPaperBalance(getPaperTradingState().balance)
    sync()
    window.addEventListener('paper-trading-updated', sync)
    return () => window.removeEventListener('paper-trading-updated', sync)
  }, [])

  /* --------------------------- Demo preference ------------------------------ */
  useEffect(() => {
    const sync = () => setDemoPreference(getDemoMode())
    sync()
    window.addEventListener('demo-mode-updated', sync)
    return () => window.removeEventListener('demo-mode-updated', sync)
  }, [])

  // Guests are always in demo; signed-in users choose.
  const mode: AccountMode = !isSignedIn ? 'demo' : demoPreference ? 'demo' : 'live'
  const canToggleMode = !!isSignedIn

  const setMode = useCallback(
    (next: AccountMode) => {
      if (!isSignedIn) return // guests cannot leave demo
      persistDemoMode(next === 'demo')
    },
    [isSignedIn]
  )

  /**
   * Spendable balance for the active mode. In live mode this is the real
   * on-chain balance; `null` (unknown RPC) is treated as 0 for spending checks
   * but rendered as "—".
   */
  const balance = mode === 'demo' ? paperBalance : liveBalance ?? 0

  // Kept for call sites that only ever read `.toString()`.
  const publicKey = address ? { toString: () => address } : null

  return {
    publicKey,
    address,
    balance,
    liveBalance,
    paperBalance,
    /** True when the on-chain balance could not be read (render as "—"). */
    balanceUnknown: mode === 'live' && liveBalance === null,
    mode,
    canToggleMode,
    setMode,
    isSignedIn: !!isSignedIn,
    connected: ready,
    ready,
    refresh: loadAccount,
  }
}
