'use client'

import { useEffect, useState } from 'react'
import { Wallet, Copy, ExternalLink, LogOut, QrCode } from 'lucide-react'
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js'
import { getOrCreateWallet, getWallet, getPublicKey, clearWallet } from '@/lib/custodial-wallet'
import { DepositModal } from './DepositModal'
import { WalletOnboardingModal } from './WalletOnboardingModal'

export function WalletButton() {
  const [wallet, setWallet] = useState<ReturnType<typeof getWallet>>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [copied, setCopied] = useState(false)

  // Initialize wallet on mount
  useEffect(() => {
    const initWallet = () => {
      try {
        const existingWallet = getWallet()
        if (existingWallet) {
          setWallet(existingWallet)
          setLoading(false)
          return
        }

        // Check if user has completed onboarding
        const onboardingCompleted = localStorage.getItem('wallet-onboarding-completed')
        
        // Create new wallet
        const w = getOrCreateWallet()
        setWallet(w)
        
        // Show onboarding if this is a new wallet and onboarding hasn't been completed
        if (!onboardingCompleted) {
          setShowOnboarding(true)
        }
      } catch (error) {
        console.error('Failed to initialize wallet:', error)
      } finally {
        setLoading(false)
      }
    }
    initWallet()
  }, [])

  // Fetch balance
  useEffect(() => {
    if (!wallet) {
      setBalance(null)
      return
    }

    // Only fetch if we have a custom RPC URL, otherwise skip to avoid rate limits
    if (!process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      // No custom RPC URL - don't try to fetch balance to avoid rate limits
      setBalance(null)
      return
    }

    let retryCount = 0
    const maxRetries = 2
    let consecutiveFailures = 0
    const maxConsecutiveFailures = 3
    let intervalId: NodeJS.Timeout | null = null

    const fetchBalance = async () => {
      // Skip if we've hit too many consecutive failures (likely rate limited)
      if (consecutiveFailures >= maxConsecutiveFailures) {
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
        return
      }

      try {
        const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta')
        const connection = new Connection(endpoint, 'confirmed')
        const publicKey = new PublicKey(wallet.publicKey)
        const bal = await connection.getBalance(publicKey)
        setBalance(bal / LAMPORTS_PER_SOL)
        retryCount = 0 // Reset retry count on success
        consecutiveFailures = 0 // Reset failure count on success
      } catch (error: any) {
        consecutiveFailures++
        
        // Check if it's a rate limit or access forbidden error
        const isRateLimit = error?.message?.includes('403') || 
                           error?.message?.includes('Access forbidden') ||
                           error?.message?.includes('rate limit') ||
                           error?.message?.includes('Forbidden') ||
                           (error?.code === 403) ||
                           (error?.response?.status === 403)
        
        if (isRateLimit) {
          // Stop trying on rate limit - clear interval and stop
          if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
          }
          // Don't update balance, keep last known value
          return // Exit early, don't retry
        }
        
        // For non-rate-limit errors, only log if it's not a network error
        if (!error?.message?.includes('fetch') && !error?.message?.includes('network')) {
          // Only log once per error type to reduce noise
          if (consecutiveFailures === 1) {
            console.warn('Failed to fetch balance:', error?.message || error)
          }
        }
        
        // Don't clear balance on errors, keep last known value
        if (retryCount < maxRetries && !isRateLimit) {
          retryCount++
          // Retry with exponential backoff for non-rate-limit errors
          setTimeout(fetchBalance, Math.min(2000 * Math.pow(2, retryCount), 10000))
        }
      }
    }

    fetchBalance()
    // Increase interval to 60 seconds to reduce rate limit issues
    intervalId = setInterval(fetchBalance, 60000)
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [wallet])

  const handleCopyAddress = () => {
    if (!wallet) return
    navigator.clipboard.writeText(wallet.publicKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }


  const handleDisconnect = () => {
    if (confirm('Are you sure you want to clear your wallet? This will remove it from this browser. Make sure you have exported it first!')) {
      clearWallet()
      setWallet(null)
      setBalance(null)
    }
  }

  if (loading) {
    return (
      <div className="terminal-button-primary px-4 py-2 flex items-center gap-2 opacity-50">
        <Wallet size={16} />
        <span>Loading...</span>
      </div>
    )
  }

  if (wallet) {
    return (
      <>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-terminal-bg rounded border border-terminal-border">
            <Wallet size={16} className="text-terminal-text-secondary" />
            <span className="text-sm font-medium">
              {balance !== null 
                ? `${balance.toFixed(4)} SOL` 
                : process.env.NEXT_PUBLIC_SOLANA_RPC_URL 
                  ? 'Loading...' 
                  : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAddress}
              className="text-xs text-terminal-text-secondary font-mono px-2 py-1 bg-terminal-bg rounded border border-terminal-border hover:border-terminal-accent transition-colors"
              title="Copy address"
            >
              {copied ? 'Copied!' : `${wallet.publicKey.slice(0, 6)}...${wallet.publicKey.slice(-4)}`}
            </button>
            <button
              onClick={() => setShowDeposit(true)}
              className="px-4 py-2 bg-gradient-to-r from-terminal-accent to-blue-600 border border-terminal-accent/50 rounded-lg text-white font-medium text-sm flex items-center gap-2 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:shadow-terminal-accent/30 transition-all duration-200 hover:scale-105 active:scale-95"
              title="Deposit SOL"
            >
              <QrCode size={16} />
              Deposit
            </button>
            <div className="flex items-center gap-1 border-l border-terminal-border pl-2">
              <button
                onClick={() => window.open(`https://solscan.io/account/${wallet.publicKey}`, '_blank')}
                className="p-2 text-terminal-text-secondary hover:text-terminal-accent transition-colors"
                title="View on Solscan"
              >
                <ExternalLink size={16} />
              </button>
              <button
                onClick={handleDisconnect}
                className="p-2 text-terminal-text-secondary hover:text-terminal-danger transition-colors"
                title="Clear wallet"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
        {showDeposit && (
          <DepositModal
            walletAddress={wallet.publicKey}
            onClose={() => setShowDeposit(false)}
          />
        )}
        {showOnboarding && wallet && (
          <WalletOnboardingModal
            wallet={wallet}
            onClose={() => {
              setShowOnboarding(false)
              localStorage.setItem('wallet-onboarding-completed', 'true')
            }}
            onComplete={() => {
              setShowOnboarding(false)
              localStorage.setItem('wallet-onboarding-completed', 'true')
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => {
          const w = getOrCreateWallet()
          setWallet(w)
          // Show onboarding for new wallet
          const onboardingCompleted = localStorage.getItem('wallet-onboarding-completed')
          if (!onboardingCompleted) {
            setShowOnboarding(true)
          }
        }}
        className="terminal-button-primary px-4 py-2 flex items-center gap-2"
      >
        <Wallet size={16} />
        <span>Create Wallet</span>
      </button>
      {showOnboarding && wallet && (
        <WalletOnboardingModal
          wallet={wallet}
          onClose={() => {
            setShowOnboarding(false)
            localStorage.setItem('wallet-onboarding-completed', 'true')
          }}
          onComplete={() => {
            setShowOnboarding(false)
            localStorage.setItem('wallet-onboarding-completed', 'true')
          }}
        />
      )}
    </>
  )
}
