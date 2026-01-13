'use client'

import { useState, useEffect } from 'react'
import { getWallet, getPublicKey, getKeypair, hasWallet } from './custodial-wallet'
import { PublicKey } from '@solana/web3.js'

export function useCustodialWallet() {
  const [wallet, setWallet] = useState<ReturnType<typeof getWallet>>(null)
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const init = () => {
      const w = getWallet()
      setWallet(w)
      
      if (w) {
        const pk = getPublicKey()
        setPublicKey(pk)
        setConnected(pk !== null)
      } else {
        setPublicKey(null)
        setConnected(false)
      }
    }

    init()
    
    // Listen for storage changes (e.g., wallet created/cleared)
    const handleStorageChange = () => {
      init()
    }
    
    window.addEventListener('storage', handleStorageChange)
    // Also check periodically in case of same-tab changes
    const interval = setInterval(init, 1000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  return {
    wallet,
    publicKey,
    connected,
    hasWallet: hasWallet(),
    getKeypair,
  }
}

