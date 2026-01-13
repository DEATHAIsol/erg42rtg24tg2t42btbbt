'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface HowItWorksModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-terminal-surface border border-terminal-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-terminal-surface border-b border-terminal-border p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-terminal-text-primary">How it works</h2>
          <button
            onClick={onClose}
            className="p-2 text-terminal-text-secondary hover:text-terminal-text-primary hover:bg-terminal-bg rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Introduction */}
          <p className="text-terminal-text-primary leading-relaxed">
            Probio Markets makes sure that all markets are safe. Each market on Probio is{' '}
            <span className="text-terminal-accent font-semibold">directly sourced from the polymarket API</span> with{' '}
            <span className="text-terminal-accent font-semibold">enabled (up to 10x) leverage markets</span> and{' '}
            <span className="text-terminal-accent font-semibold">LP sourced parlay building tools</span>.
          </p>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-terminal-accent/20 border border-terminal-accent/50 rounded-full flex items-center justify-center text-terminal-accent font-bold text-sm">
                1
              </div>
              <p className="text-terminal-text-primary pt-1">
                Pick a market that you like
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-terminal-accent/20 border border-terminal-accent/50 rounded-full flex items-center justify-center text-terminal-accent font-bold text-sm">
                2
              </div>
              <p className="text-terminal-text-primary pt-1">
                Buy positions on the market using SOL
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-terminal-accent/20 border border-terminal-accent/50 rounded-full flex items-center justify-center text-terminal-accent font-bold text-sm">
                3
              </div>
              <p className="text-terminal-text-primary pt-1">
                Sell at any time to lock in your profits or losses
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-terminal-accent/20 border border-terminal-accent/50 rounded-full flex items-center justify-center text-terminal-accent font-bold text-sm">
                4
              </div>
              <p className="text-terminal-text-primary pt-1">
                Explore leveraging your postions on markets to multiply profits
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-terminal-accent/20 border border-terminal-accent/50 rounded-full flex items-center justify-center text-terminal-accent font-bold text-sm">
                5
              </div>
              <p className="text-terminal-text-primary pt-1">
                Build a parlay on multiple outcomes occuring to increase payout
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-terminal-surface border-t border-terminal-border p-6">
          <button
            onClick={onClose}
            className="w-full terminal-button-primary px-6 py-3 text-lg font-semibold rounded-lg hover:bg-blue-600 transition-colors"
          >
            I&apos;m ready to trade
          </button>
        </div>
      </div>
    </div>
  )
}


