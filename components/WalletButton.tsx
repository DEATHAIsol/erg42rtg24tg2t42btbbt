'use client'

import { useEffect, useState } from 'react'
import { Wallet, Copy, ExternalLink, LogOut } from 'lucide-react'
import { getOrCreateWallet, getWallet, clearWallet } from '@/lib/custodial-wallet'
import { fetchWalletBalanceHelius } from '@/lib/helius-api'
import { getPaperTradingState, setPaperTradingBalance } from '@/lib/paper-trading'
import { getDemoMode, setDemoMode } from '@/lib/demo-mode'
import { DepositModal } from './DepositModal'
import { WalletOnboardingModal } from './WalletOnboardingModal'
import { useConfirm } from './ConfirmModal'

export function WalletButton() {
  const { confirm } = useConfirm()
  const [wallet, setWallet] = useState<ReturnType<typeof getWallet>>(null)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [paperBalance, setPaperBalance] = useState<number>(0)
  const [demoMode, setDemoModeState] = useState<boolean>(false)
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

  // Sync paper trading balance (demo mode)
  useEffect(() => {
    const updatePaperBalance = () => {
      const state = getPaperTradingState()
      setPaperBalance(state.balance)
    }
    updatePaperBalance()
    window.addEventListener('paper-trading-updated', updatePaperBalance)
    return () => {
      window.removeEventListener('paper-trading-updated', updatePaperBalance)
    }
  }, [])

  // Load demo mode flag
  useEffect(() => {
    setDemoModeState(getDemoMode())
    const handleDemoMode = (e: Event) => {
      const enabled = (e as CustomEvent)?.detail?.enabled
      if (typeof enabled === 'boolean') {
        setDemoModeState(enabled)
      } else {
        setDemoModeState(getDemoMode())
      }
    }
    window.addEventListener('demo-mode-updated', handleDemoMode)
    return () => {
      window.removeEventListener('demo-mode-updated', handleDemoMode)
    }
  }, [])

  // Fetch balance using Helius API (live mode)
  useEffect(() => {
    if (!wallet) {
      setWalletBalance(null)
      return
    }

    let intervalId: NodeJS.Timeout | null = null

    const fetchBalance = async () => {
      try {
        const balance = await fetchWalletBalanceHelius(wallet.publicKey)
        setWalletBalance(balance)
      } catch (error) {
        // fetchWalletBalanceHelius already handles errors and returns 0
        // But we'll set it explicitly here for clarity
        setWalletBalance(0)
      }
    }

    // Fetch immediately on wallet load
    fetchBalance()
    
    // Refresh balance every 30 seconds
    intervalId = setInterval(fetchBalance, 30000)
    
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

  const toggleDemoMode = () => {
    const next = !demoMode
    setDemoMode(next)
    setDemoModeState(next)
    if (next) {
      setPaperTradingBalance(100)
    }
  }

  const displayBalance = demoMode ? paperBalance : (walletBalance ?? 0)


  const handleDisconnect = async () => {
    const confirmed = await confirm({
      title: 'Clear Wallet',
      message: 'Are you sure you want to clear your wallet?\n\nThis will remove it from this browser. Make sure you have exported your private key first!',
      confirmText: 'Clear Wallet',
      cancelText: 'Cancel',
      type: 'danger',
    })
    
    if (confirmed) {
      clearWallet()
      setWallet(null)
      setWalletBalance(null)
      setDemoMode(false)
      setDemoModeState(false)
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
        <div className="flex items-center gap-2">
          {/* Balance - clickable for deposit */}
          <button
            onClick={() => setShowDeposit(true)}
            className="h-9 flex items-center gap-2 px-3 bg-terminal-bg/80 rounded-lg border border-terminal-border/60 hover:border-terminal-accent/60 hover:bg-terminal-bg transition-all"
            title="Click to deposit"
          >
            <Wallet size={15} className="text-terminal-accent" />
            <span className="text-sm font-medium text-terminal-text-primary">
              {`${displayBalance.toFixed(4)} SOL`}
            </span>
          </button>
          <button
            onClick={toggleDemoMode}
            className={`h-9 px-3 text-xs font-semibold rounded-lg border transition-all ${
              demoMode
                ? 'border-terminal-accent text-terminal-accent bg-terminal-accent/10 hover:bg-terminal-accent/20'
                : 'border-terminal-border text-terminal-text-secondary hover:text-terminal-text-primary hover:border-terminal-accent'
            }`}
            title={demoMode ? 'Switch to live mode' : 'Switch to demo mode (100 SOL paper)'}
          >
            {demoMode ? 'Live mode' : 'Demo mode'}
          </button>
          
          {/* Address */}
          <button
            onClick={handleCopyAddress}
            className="h-9 px-3 text-xs text-terminal-text-secondary font-mono bg-terminal-bg/80 rounded-lg border border-terminal-border/60 hover:border-terminal-accent/60 hover:text-terminal-text-primary transition-all"
            title="Copy address"
          >
            {copied ? '✓ Copied' : `${wallet.publicKey.slice(0, 4)}...${wallet.publicKey.slice(-4)}`}
          </button>
          
          {/* Action buttons */}
          <div className="flex items-center">
            <button
              onClick={() => window.open(`https://solscan.io/account/${wallet.publicKey}`, '_blank')}
              className="h-9 w-9 flex items-center justify-center text-terminal-text-muted hover:text-terminal-accent hover:bg-terminal-border/30 rounded-lg transition-all"
              title="View on Solscan"
            >
              <ExternalLink size={15} />
            </button>
            <button
              onClick={handleDisconnect}
              className="h-9 w-9 flex items-center justify-center text-terminal-text-muted hover:text-terminal-danger hover:bg-terminal-danger/10 rounded-lg transition-all"
              title="Clear wallet"
            >
              <LogOut size={15} />
            </button>
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
