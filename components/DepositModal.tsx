'use client'

import { useState, useEffect } from 'react'
import { X, Copy, QrCode, ExternalLink, Check, ShieldCheck } from 'lucide-react'
import { ModalPortal } from './ModalPortal'

interface DepositModalProps {
  walletAddress: string
  onClose: () => void
}

export function DepositModal({ walletAddress, onClose }: DepositModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    import('qrcode').then((QRCode) => {
      QRCode.default
        .toDataURL(walletAddress, {
          width: 320,
          margin: 1,
          color: { dark: '#0A0908', light: '#F5F2EF' },
        })
        .then(setQrCodeDataUrl)
        .catch((err) => console.error('Failed to generate QR code:', err))
    })
  }, [walletAddress])

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (

    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel max-w-md max-h-[min(90vh,44rem)] my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Deposit SOL"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-terminal-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold mb-1">Deposit SOL</h2>
            <p className="text-sm text-terminal-text-secondary">
              Send SOL to this address to fund your account.
            </p>
          </div>
          <button onClick={onClose} className="icon-button flex-shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Scrolls instead of overflowing the viewport */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-5">
          <div className="flex justify-center">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Wallet address QR code"
                className="w-44 h-44 rounded-xl border border-terminal-border"
              />
            ) : (
              <div className="w-44 h-44 rounded-xl bg-terminal-elevated border border-terminal-border flex items-center justify-center">
                <QrCode size={36} className="text-terminal-text-muted animate-pulse-soft" />
              </div>
            )}
          </div>

          <div>
            <label className="section-label mb-2 block">Wallet address</label>
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 p-3 bg-terminal-bg rounded-lg border border-terminal-border hover:border-terminal-accent/60 transition-colors text-left group"
              title="Copy address"
            >
              <code className="flex-1 text-xs font-mono text-terminal-text-primary break-all leading-relaxed">
                {walletAddress}
              </code>
              {copied ? (
                <Check size={16} className="text-terminal-success flex-shrink-0" />
              ) : (
                <Copy
                  size={16}
                  className="text-terminal-text-muted group-hover:text-terminal-accent flex-shrink-0 transition-colors"
                />
              )}
            </button>
            <p className="text-xs text-terminal-success mt-2 h-4">
              {copied ? 'Copied to clipboard' : ''}
            </p>
          </div>

          <div className="p-4 bg-terminal-bg/60 rounded-lg border border-terminal-border">
            <p className="text-xs font-semibold text-terminal-text-primary mb-2">Before you send</p>
            <ul className="text-xs text-terminal-text-secondary space-y-1.5 list-disc list-inside marker:text-terminal-text-muted">
              <li>Send only SOL on the Solana network — other assets will be lost</li>
              <li>Check the address matches before confirming</li>
              <li>Deposits usually confirm within a minute</li>
            </ul>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg">
            <ShieldCheck size={14} className="text-terminal-accent flex-shrink-0 mt-0.5" />
            <p className="text-xs text-terminal-text-secondary leading-relaxed">
              This address belongs to your Probio account and is the same on every
              device you sign in from.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t border-terminal-border flex-shrink-0">
          <button
            onClick={() =>
              window.open(`https://solscan.io/account/${walletAddress}`, '_blank')
            }
            className="terminal-button flex-1"
          >
            <ExternalLink size={15} />
            Solscan
          </button>
          <button onClick={onClose} className="terminal-button-primary flex-1">
            Done
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}
