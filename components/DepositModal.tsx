'use client'

import { useState, useEffect } from 'react'
import { X, Copy, QrCode, ExternalLink } from 'lucide-react'

interface DepositModalProps {
  walletAddress: string
  onClose: () => void
}

export function DepositModal({ walletAddress, onClose }: DepositModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Generate QR code (only in browser)
    if (typeof window !== 'undefined') {
      import('qrcode').then((QRCode) => {
        QRCode.default.toDataURL(walletAddress, {
          width: 300,
          margin: 2,
          color: {
            dark: '#ffffff',
            light: '#131829',
          },
        })
          .then((url) => setQrCodeDataUrl(url))
          .catch((err) => console.error('Failed to generate QR code:', err))
      })
    }
  }, [walletAddress])

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-terminal-surface border border-terminal-border rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-terminal-text-secondary hover:text-terminal-text-primary transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Deposit SOL</h2>
          <p className="text-sm text-terminal-text-secondary">
            Send SOL to this address to fund your trading wallet
          </p>
        </div>

        {/* QR Code */}
        <div className="mb-6 flex justify-center">
          {qrCodeDataUrl ? (
            <div className="bg-white p-4 rounded-lg">
              <img src={qrCodeDataUrl} alt="Wallet QR Code" className="w-64 h-64" />
            </div>
          ) : (
            <div className="w-64 h-64 bg-terminal-bg rounded-lg flex items-center justify-center">
              <QrCode size={48} className="text-terminal-text-secondary animate-pulse" />
            </div>
          )}
        </div>

        {/* Address */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-terminal-text-secondary uppercase tracking-wide mb-2 block">
            Wallet Address
          </label>
          <div className="flex items-center gap-2 p-3 bg-terminal-bg rounded border border-terminal-border">
            <code className="flex-1 text-sm font-mono text-terminal-text-primary break-all">
              {walletAddress}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 text-terminal-text-secondary hover:text-terminal-accent transition-colors flex-shrink-0"
              title="Copy address"
            >
              <Copy size={16} />
            </button>
          </div>
          {copied && (
            <p className="text-xs text-terminal-success mt-2">Address copied to clipboard!</p>
          )}
        </div>

        {/* Info */}
        <div className="mb-6 p-4 bg-terminal-bg/50 rounded border border-terminal-border">
          <p className="text-xs text-terminal-text-secondary mb-2">
            <strong className="text-terminal-text-primary">Important:</strong>
          </p>
          <ul className="text-xs text-terminal-text-secondary space-y-1 list-disc list-inside">
            <li>Only send SOL to this address</li>
            <li>Double-check the address before sending</li>
            <li>Transactions may take a few minutes to confirm</li>
            <li>This wallet is stored in your browser&apos;s localStorage</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => window.open(`https://solscan.io/account/${walletAddress}`, '_blank')}
            className="flex-1 terminal-button-secondary px-4 py-2 flex items-center justify-center gap-2 text-sm"
          >
            <ExternalLink size={16} />
            View on Solscan
          </button>
          <button
            onClick={onClose}
            className="flex-1 terminal-button-primary px-4 py-2 text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

