'use client'

import { useState } from 'react'
import { TerminalHeader } from '@/components/TerminalHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { Droplets, TrendingUp, Landmark, Gift, Clock, Info } from 'lucide-react'

// Illustrative target rates for the yield calculator. The pool is not live yet —
// these are design targets, not live or historical returns.
const TARGET_APY = 12.5
const YIELD_SOURCES = [
  { label: 'Native staking', rate: 6.0, icon: Landmark, share: 48 },
  { label: 'Lending yields', rate: 5.0, icon: TrendingUp, share: 40 },
  { label: 'Protocol rewards', rate: 1.5, icon: Gift, share: 12 },
]

export default function LiquidityPage() {
  const [depositAmount, setDepositAmount] = useState('')
  const [activeAction, setActiveAction] = useState<'deposit' | 'withdraw'>('deposit')

  const amount = parseFloat(depositAmount) || 0
  const projectedAnnual = amount * (TARGET_APY / 100)

  return (
    <div className="flex flex-col min-h-screen bg-terminal-bg">
      <TerminalHeader />

      <main className="flex-1">
        <div className="relative overflow-hidden">
          <div className="orb w-96 h-96 -top-32 right-0 bg-terminal-accent/10" aria-hidden="true" />

          <div className="relative max-w-6xl mx-auto px-6 py-14 lg:py-20">
            {/* Header */}
            <div className="max-w-2xl mb-12">
              <div className="badge-warning mb-4">
                <Clock size={12} />
                Preview — deposits open at launch
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                Back the markets.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-terminal-accent to-terminal-accent-hover">
                  Earn the yield.
                </span>
              </h1>
              <p className="text-lg text-terminal-text-secondary leading-relaxed">
                The Probio liquidity pool will let you deposit SOL to back market-making
                activity and earn a share of the generated yield. Withdraw anytime.
              </p>
            </div>

            <div className="grid lg:grid-cols-5 gap-6 items-start">
              {/* Deposit/Withdraw card */}
              <div className="lg:col-span-2 terminal-card p-6">
                {/* Action Toggle */}
                <div className="flex gap-1 mb-5 p-1 bg-terminal-bg border border-terminal-border rounded-lg">
                  <button
                    onClick={() => setActiveAction('deposit')}
                    className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all ${
                      activeAction === 'deposit'
                        ? 'bg-terminal-elevated text-terminal-text-primary border border-terminal-border-strong shadow-sm'
                        : 'text-terminal-text-secondary hover:text-terminal-text-primary border border-transparent'
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => setActiveAction('withdraw')}
                    className={`flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all ${
                      activeAction === 'withdraw'
                        ? 'bg-terminal-elevated text-terminal-text-primary border border-terminal-border-strong shadow-sm'
                        : 'text-terminal-text-secondary hover:text-terminal-text-primary border border-transparent'
                    }`}
                  >
                    Withdraw
                  </button>
                </div>

                {/* Input Section */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="section-label">
                      {activeAction === 'deposit' ? 'Amount to deposit' : 'Amount to withdraw'}
                    </label>
                    <span className="text-xs text-terminal-text-muted">SOL</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="terminal-input !py-3.5 !text-2xl font-bold num pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-terminal-text-muted pointer-events-none">
                      SOL
                    </span>
                  </div>
                </div>

                {/* Projected Earnings - Only for Deposit */}
                {activeAction === 'deposit' && amount > 0 && (
                  <div className="mb-5 p-4 bg-terminal-bg rounded-xl border border-terminal-border animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <span className="section-label">Projected returns</span>
                      <span className="badge !text-[10px]">Illustrative</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-terminal-text-muted mb-1">Monthly</div>
                        <div className="text-sm font-semibold num">
                          {(projectedAnnual / 12).toFixed(3)} SOL
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-terminal-text-muted mb-1">Quarterly</div>
                        <div className="text-sm font-semibold num">
                          {(projectedAnnual / 4).toFixed(3)} SOL
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-terminal-text-muted mb-1">Annual</div>
                        <div className="text-sm font-bold text-terminal-accent num">
                          {projectedAnnual.toFixed(3)} SOL
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-terminal-text-muted mt-3 leading-relaxed">
                      Based on the {TARGET_APY}% target APY. Actual returns will vary and
                      are not guaranteed.
                    </p>
                  </div>
                )}

                <button
                  disabled
                  className="terminal-button-primary w-full !py-3"
                  title="The liquidity pool is not live yet"
                >
                  {activeAction === 'deposit' ? 'Deposits open at launch' : 'Withdrawals open at launch'}
                </button>

                <div className="mt-4 flex items-start gap-2.5 p-3 bg-terminal-accent/5 border border-terminal-accent/20 rounded-xl">
                  <Info size={14} className="text-terminal-accent flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-terminal-text-secondary leading-relaxed">
                    This is a UI preview. Pool contracts are in development — no deposits
                    are accepted yet. Follow the terminal for launch updates.
                  </p>
                </div>
              </div>

              {/* Right column: how it works + yield sources */}
              <div className="lg:col-span-3 space-y-6">
                {/* Visual band */}
                <div className="terminal-card relative overflow-hidden p-8">
                  <div className="orb w-64 h-64 -top-20 -right-16 bg-terminal-accent/15" aria-hidden="true" />
                  <div className="relative flex items-start gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-terminal-accent/10 border border-terminal-accent/30 flex items-center justify-center flex-shrink-0">
                      <Droplets size={22} className="text-terminal-accent" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold mb-2">How the pool works</h2>
                      <p className="text-sm text-terminal-text-secondary leading-relaxed max-w-lg">
                        Deposited SOL backs market-making on prediction markets and is put
                        to work across conservative on-chain strategies. Yield accrues to
                        the pool continuously and your share is claimable at any time —
                        deposits are never locked.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Yield sources */}
                <div className="terminal-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold">Target yield sources</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-terminal-accent num">{TARGET_APY}%</span>
                      <span className="badge !text-[10px]">Target APY</span>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {YIELD_SOURCES.map((source) => (
                      <div key={source.label}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="flex items-center gap-2 text-sm text-terminal-text-secondary">
                            <source.icon size={14} className="text-terminal-accent" />
                            {source.label}
                          </span>
                          <span className="text-sm font-medium num">{source.rate.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-terminal-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-terminal-accent/80 rounded-full transition-all duration-700"
                            style={{ width: `${source.share}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-terminal-text-muted mt-6 leading-relaxed">
                    Rates shown are design targets for the initial pool composition, not
                    live or historical returns.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
