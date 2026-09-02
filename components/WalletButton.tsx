'use client'

import { useState } from 'react'
import { Wallet, Copy, ExternalLink, FlaskConical, Check } from 'lucide-react'
import { useCustodialWallet } from '@/lib/useCustodialWallet'
import { DepositModal } from './DepositModal'

/**
 * Header account strip. Identity is managed entirely through Clerk — there is
 * no "create wallet" action.
 *
 * Guests see a practice balance (demo is forced). Signed-in users see their
 * real balance and can opt into demo mode with the Live/Demo switch.
 */
export function WalletButton() {
  const {
    address,
    balance,
    balanceUnknown,
    mode,
    canToggleMode,
    setMode,
    isSignedIn,
    ready,
  } = useCustodialWallet()

  const [copied, setCopied] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)

  const handleCopy = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!ready) {
    return <div className="h-9 w-32 skeleton rounded-lg" aria-label="Loading account" />
  }

  /* ------------------------------- Guest / demo ----------------------------- */
  if (!isSignedIn) {
    return (
      <div
        className="h-9 flex items-center gap-2 px-3 bg-terminal-bg/80 rounded-lg border border-terminal-border"
        title="Practice balance — sign in to trade with a real balance"
      >
        <FlaskConical size={14} className="text-terminal-warning" />
        <span className="text-sm font-medium num">
          {balance.toFixed(2)} <span className="text-terminal-text-muted font-sans">SOL</span>
        </span>
        <span className="text-[10px] font-medium text-terminal-warning uppercase tracking-wider hidden lg:inline">
          Demo
        </span>
      </div>
    )
  }

  /* ------------------------------ Signed-in user ---------------------------- */
  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => mode === 'live' && setShowDeposit(true)}
          disabled={mode === 'demo'}
          className="h-9 flex items-center gap-2 px-3 bg-terminal-bg/80 rounded-lg border border-terminal-border transition-all enabled:hover:border-terminal-accent/60 disabled:cursor-default"
          title={
            mode === 'demo'
              ? 'Practice balance — switch to Live to deposit'
              : 'Deposit SOL'
          }
        >
          {mode === 'demo' ? (
            <FlaskConical size={14} className="text-terminal-warning" />
          ) : (
            <Wallet size={15} className="text-terminal-accent" />
          )}
          <span className="text-sm font-medium num">
            {balanceUnknown ? '—' : balance.toFixed(4)}{' '}
            <span className="text-terminal-text-muted font-sans">SOL</span>
          </span>
        </button>

        {/* Live / Demo switch — signed-in only */}
        {canToggleMode && (
          <div
            className="hidden sm:flex items-center h-9 p-0.5 bg-terminal-bg/80 rounded-lg border border-terminal-border"
            role="group"
            aria-label="Balance mode"
          >
            <button
              onClick={() => setMode('live')}
              className={`px-2.5 h-8 rounded-md text-[11px] font-semibold transition-colors ${
                mode === 'live'
                  ? 'bg-terminal-elevated text-terminal-text-primary'
                  : 'text-terminal-text-muted hover:text-terminal-text-secondary'
              }`}
              title="Trade your real balance"
            >
              Live
            </button>
            <button
              onClick={() => setMode('demo')}
              className={`px-2.5 h-8 rounded-md text-[11px] font-semibold transition-colors ${
                mode === 'demo'
                  ? 'bg-terminal-warning/15 text-terminal-warning'
                  : 'text-terminal-text-muted hover:text-terminal-text-secondary'
              }`}
              title="Practice with simulated funds"
            >
              Demo
            </button>
          </div>
        )}

        {address && (
          <>
            <button
              onClick={handleCopy}
              className="h-9 px-3 text-xs text-terminal-text-secondary font-mono bg-terminal-bg/80 rounded-lg border border-terminal-border hover:border-terminal-accent/60 hover:text-terminal-text-primary transition-all hidden md:inline-flex items-center gap-1.5"
              title={copied ? 'Copied' : 'Copy address'}
            >
              {copied ? (
                <span className="text-terminal-success inline-flex items-center gap-1">
                  <Check size={12} /> Copied
                </span>
              ) : (
                <>
                  {`${address.slice(0, 4)}…${address.slice(-4)}`}
                  <Copy size={12} className="opacity-60" />
                </>
              )}
            </button>

            <button
              onClick={() => window.open(`https://solscan.io/account/${address}`, '_blank')}
              className="icon-button hidden lg:inline-flex"
              title="View on Solscan"
              aria-label="View on Solscan"
            >
              <ExternalLink size={15} />
            </button>
          </>
        )}
      </div>

      {showDeposit && address && (
        <DepositModal walletAddress={address} onClose={() => setShowDeposit(false)} />
      )}
    </>
  )
}
