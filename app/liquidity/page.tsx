'use client'

import { useState } from 'react'
import { TerminalHeader } from '@/components/TerminalHeader'
import { useCustodialWallet } from '@/lib/useCustodialWallet'

export default function LiquidityPage() {
  const { connected } = useCustodialWallet()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [activeAction, setActiveAction] = useState<'deposit' | 'withdraw'>('deposit')

  const poolStats = {
    totalValueLocked: 146789.45,
    apy: 12.5,
    totalDepositors: 163,
    yourDeposit: 0,
    yourEarnings: 0,
    dailyYield: 0.034,
    weeklyYield: 0.24,
    monthlyYield: 1.02,
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatCompact = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}k`
    }
    return formatCurrency(value)
  }

  const projectedAnnual = depositAmount && parseFloat(depositAmount) > 0 
    ? parseFloat(depositAmount) * 150 * (poolStats.apy / 100) 
    : 0

  return (
    <div className="flex flex-col h-screen bg-terminal-bg">
      <TerminalHeader />
      
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Left: Content */}
          <div className="w-1/2 overflow-auto border-r border-terminal-border">
            <div className="max-w-4xl mx-auto px-8 py-12">
              {/* Header Section */}
              <div className="mb-8">
                <div className="inline-block px-3 py-1 bg-terminal-accent/10 border border-terminal-accent/30 rounded-full mb-4">
                  <span className="text-xs font-medium text-terminal-accent">Liquidity Pool</span>
                </div>
                <h1 className="text-4xl font-bold text-terminal-text-primary mb-3 tracking-tight">
                  Earn Yield on SOL
                </h1>
                <p className="text-lg text-terminal-text-secondary">
                  Deposit SOL into the liquidity pool and earn {poolStats.apy}% APY from market making activities. 
                  Withdraw anytime.
                </p>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-6 mb-8 pb-8 border-b border-terminal-border">
                <div>
                  <div className="text-2xl font-bold text-terminal-text-primary mb-1">
                    {formatCompact(poolStats.totalValueLocked)}
                  </div>
                  <div className="text-xs text-terminal-text-secondary">Total Value Locked</div>
                  <div className="text-xs text-terminal-success mt-1">+1852.4% 24h</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-terminal-text-primary mb-1">
                    {poolStats.totalDepositors.toLocaleString()}
                  </div>
                  <div className="text-xs text-terminal-text-secondary">Active Depositors</div>
                  <div className="text-xs text-terminal-success mt-1">+155 today</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-terminal-text-primary mb-1">
                    {poolStats.yourDeposit > 0 ? formatCompact(poolStats.yourDeposit) : '—'}
                  </div>
                  <div className="text-xs text-terminal-text-secondary">Your Position</div>
                  {poolStats.yourDeposit > 0 && (
                    <div className="text-xs text-terminal-accent mt-1">
                      +{formatCurrency(poolStats.yourEarnings)} earned
                    </div>
                  )}
                </div>
              </div>

            {/* Deposit/Withdraw Section - Compact */}
            <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-lg">
              {/* Action Toggle */}
              <div className="flex gap-2 mb-4 p-1 bg-terminal-bg border border-terminal-border rounded-lg">
                <button
                  onClick={() => setActiveAction('deposit')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded transition-all ${
                    activeAction === 'deposit'
                      ? 'bg-terminal-accent text-terminal-bg shadow-lg'
                      : 'text-terminal-text-secondary hover:text-terminal-text-primary'
                  }`}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setActiveAction('withdraw')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded transition-all ${
                    activeAction === 'withdraw'
                      ? 'bg-terminal-accent text-terminal-bg shadow-lg'
                      : 'text-terminal-text-secondary hover:text-terminal-text-primary'
                  }`}
                >
                  Withdraw
                </button>
              </div>

              {/* Input Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-terminal-text-secondary">
                    {activeAction === 'deposit' ? 'Amount to Deposit' : 'Amount to Withdraw'}
                  </label>
                  <span className="text-xs text-terminal-text-muted">SOL</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={activeAction === 'deposit' ? depositAmount : withdrawAmount}
                    onChange={(e) => activeAction === 'deposit' 
                      ? setDepositAmount(e.target.value) 
                      : setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-terminal-bg border-2 border-terminal-border rounded-lg text-2xl font-bold text-terminal-text-primary placeholder-terminal-text-muted/30 focus:outline-none focus:border-terminal-accent transition-colors"
                  />
                  <button 
                    onClick={() => {
                      if (activeAction === 'deposit') {
                        setDepositAmount('100')
                      } else {
                        setWithdrawAmount(poolStats.yourDeposit.toString())
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/30 rounded hover:bg-terminal-accent/20 transition-colors"
                  >
                    MAX
                  </button>
                </div>
                {(activeAction === 'deposit' ? depositAmount : withdrawAmount) && 
                 parseFloat(activeAction === 'deposit' ? depositAmount : withdrawAmount) > 0 && (
                  <div className="mt-2 text-xs text-terminal-text-secondary">
                    ≈ {formatCurrency(parseFloat(activeAction === 'deposit' ? depositAmount : withdrawAmount) * 150)} USD
                  </div>
                )}
              </div>

              {/* Projected Earnings - Only for Deposit */}
              {activeAction === 'deposit' && depositAmount && parseFloat(depositAmount) > 0 && (
                <div className="pt-4 pb-4 border-t border-terminal-border">
                  <div className="text-xs text-terminal-text-secondary mb-3 uppercase tracking-wide">Projected Returns</div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <div className="text-xs text-terminal-text-muted mb-1">Daily</div>
                      <div className="text-sm font-semibold text-terminal-text-primary">
                        {formatCurrency(parseFloat(depositAmount) * 150 * (poolStats.dailyYield / 100))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-terminal-text-muted mb-1">Weekly</div>
                      <div className="text-sm font-semibold text-terminal-text-primary">
                        {formatCurrency(parseFloat(depositAmount) * 150 * (poolStats.weeklyYield / 100))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-terminal-text-muted mb-1">Monthly</div>
                      <div className="text-sm font-semibold text-terminal-text-primary">
                        {formatCurrency(parseFloat(depositAmount) * 150 * (poolStats.monthlyYield / 100))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-terminal-text-muted mb-1">Annual</div>
                      <div className="text-sm font-bold text-terminal-accent">
                        {formatCurrency(projectedAnnual)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                disabled={
                  !connected || 
                  !(activeAction === 'deposit' ? depositAmount : withdrawAmount) || 
                  parseFloat(activeAction === 'deposit' ? depositAmount : withdrawAmount) <= 0 ||
                  (activeAction === 'withdraw' && poolStats.yourDeposit === 0)
                }
                className={`w-full py-3 text-sm font-semibold rounded-lg transition-all ${
                  activeAction === 'deposit'
                    ? 'bg-terminal-accent text-terminal-bg hover:bg-terminal-accent/90 shadow-lg shadow-terminal-accent/20'
                    : 'bg-terminal-danger text-white hover:bg-terminal-danger/90 shadow-lg shadow-terminal-danger/20'
                } disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none`}
              >
                {!connected 
                  ? 'Connect Wallet' 
                  : activeAction === 'deposit' 
                    ? 'Deposit SOL' 
                    : poolStats.yourDeposit === 0 
                      ? 'No Deposit Available' 
                      : 'Withdraw SOL'}
              </button>

              {/* Info Note */}
              {!connected && (
                <div className="mt-4 bg-terminal-bg/50 border-l-4 border-terminal-accent p-3 rounded">
                  <div className="text-xs text-terminal-text-secondary">
                    Connect your wallet to deposit SOL and start earning {poolStats.apy}% APY
                  </div>
                </div>
              )}
            </div>

            {/* Yield Sources */}
            <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-lg">
              <div className="text-sm font-semibold text-terminal-text-primary mb-5">Yield Sources</div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-terminal-text-secondary">Native Staking</span>
                    <span className="text-sm font-medium text-terminal-text-primary">6.0%</span>
                  </div>
                  <div className="h-1.5 bg-terminal-bg rounded-full overflow-hidden">
                    <div className="h-full bg-terminal-accent" style={{ width: '48%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-terminal-text-secondary">Lending Yields</span>
                    <span className="text-sm font-medium text-terminal-text-primary">5.0%</span>
                  </div>
                  <div className="h-1.5 bg-terminal-bg rounded-full overflow-hidden">
                    <div className="h-full bg-terminal-success" style={{ width: '40%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-terminal-text-secondary">Rewards</span>
                    <span className="text-sm font-medium text-terminal-text-primary">1.5%</span>
                  </div>
                  <div className="h-1.5 bg-terminal-bg rounded-full overflow-hidden">
                    <div className="h-full bg-terminal-accent/60" style={{ width: '12%' }}></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-terminal-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-terminal-text-primary">Total APY</span>
                    <span className="text-xl font-bold text-terminal-accent">{poolStats.apy}%</span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Right: 3D Vault Hero */}
          <div className="w-1/2 relative overflow-hidden bg-gradient-to-br from-terminal-bg via-terminal-surface/50 to-terminal-bg">
            <VaultHero apy={poolStats.apy} tvl={poolStats.totalValueLocked} />
          </div>
        </div>
      </main>
    </div>
  )
}

// 3D Vault Hero Component
function VaultHero({ apy, tvl }: { apy: number; tvl: number }) {
  const formatCompact = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}k`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="h-full flex items-center justify-center relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-terminal-accent/3 via-transparent to-terminal-success/3"></div>
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-terminal-accent/4 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-terminal-success/4 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* 3D Vault Container */}
      <div className="relative z-10 perspective-1000">
        <div className="vault-container">
          {/* Vault Safe */}
          <div className="vault-safe">
            {/* Vault Face */}
            <div className="vault-face">
              {/* Circular Dial Mechanism */}
              <div className="vault-dial">
                <div className="dial-outer-ring">
                  <div className="dial-inner-ring">
                    <div className="dial-center-disc">
                      {/* Cross bars */}
                      <div className="dial-cross-bar dial-bar-horizontal"></div>
                      <div className="dial-cross-bar dial-bar-vertical"></div>
                      <div className="dial-center-dot"></div>
                    </div>
                    {/* Dial markers */}
                    <div className="dial-marker marker-0"></div>
                    <div className="dial-marker marker-90"></div>
                    <div className="dial-marker marker-180"></div>
                    <div className="dial-marker marker-270"></div>
                  </div>
                </div>
              </div>

              {/* Vault Handle */}
              <div className="vault-handle">
                <div className="handle-base"></div>
                <div className="handle-grip"></div>
              </div>

              {/* Vault Rivets - Corner and edge reinforcement */}
              <div className="vault-rivet rivet-1"></div>
              <div className="vault-rivet rivet-2"></div>
              <div className="vault-rivet rivet-3"></div>
              <div className="vault-rivet rivet-4"></div>
              <div className="vault-rivet rivet-5"></div>
              <div className="vault-rivet rivet-6"></div>
              <div className="vault-rivet rivet-7"></div>
              <div className="vault-rivet rivet-8"></div>
            </div>

            {/* Vault Edges (3D depth) */}
            <div className="vault-edge edge-top"></div>
            <div className="vault-edge edge-bottom"></div>
            <div className="vault-edge edge-left"></div>
            <div className="vault-edge edge-right"></div>
          </div>

          {/* Glow Effect */}
          <div className="vault-glow"></div>
        </div>
      </div>

      {/* Stats Display */}
      <div className="absolute bottom-12 left-0 right-0 z-20 px-12">
        <div className="bg-terminal-surface/90 backdrop-blur-md border border-terminal-border/60 rounded-xl p-6 shadow-xl">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-xs text-terminal-text-secondary mb-2 uppercase tracking-wider">Total Locked</div>
              <div className="text-2xl font-bold text-terminal-text-primary">{formatCompact(tvl)}</div>
              <div className="text-xs text-terminal-success mt-1">+2.4% 24h</div>
            </div>
            <div className="text-center border-l border-terminal-border/50 pl-6">
              <div className="text-xs text-terminal-text-secondary mb-2 uppercase tracking-wider">APY</div>
              <div className="text-3xl font-bold text-terminal-accent">{apy}%</div>
              <div className="text-xs text-terminal-text-muted mt-1">Variable</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

