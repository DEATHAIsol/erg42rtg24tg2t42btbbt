'use client'

import { useState } from 'react'
import { X, Copy, Eye, EyeOff, Download, AlertTriangle, CheckCircle, FileText } from 'lucide-react'
import { CustodialWallet } from '@/lib/custodial-wallet'

interface PrivateKeyModalProps {
  wallet: CustodialWallet
  onClose: () => void
}

export function PrivateKeyModal({ wallet, onClose }: PrivateKeyModalProps) {
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.secretKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const handleExportPrivateKey = () => {
    const dataStr = `Solana Private Key Backup\n\nPublic Key: ${wallet.publicKey}\nPrivate Key: ${wallet.secretKey}\n\nCreated: ${wallet.createdAt}\n\n⚠️ WARNING: Keep this file secure and never share it with anyone!`
    const dataBlob = new Blob([dataStr], { type: 'text/plain' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `private-key-${wallet.publicKey.slice(0, 8)}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportWallet = () => {
    const dataStr = JSON.stringify(wallet, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wallet-backup-${wallet.publicKey.slice(0, 8)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-terminal-surface border border-terminal-border rounded-xl max-w-lg w-full p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-terminal-text-secondary hover:text-terminal-text-primary transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-terminal-text-primary mb-2">Private Key</h2>
          <p className="text-sm text-terminal-text-secondary">
            Your private key is required to restore this wallet
          </p>
        </div>

        <div className="mb-6 p-4 bg-terminal-danger/10 border border-terminal-danger/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-terminal-danger mt-0.5 flex-shrink-0" size={20} />
            <div className="text-sm text-terminal-text-secondary">
              <div className="font-semibold text-terminal-danger mb-1">Security Warning</div>
              <p>Never share your private key. Anyone with access can control your wallet and funds.</p>
            </div>
          </div>
        </div>

        {/* Private Key Display */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-terminal-text-secondary uppercase tracking-wide mb-2 block">
            Private Key
          </label>
          <div className="flex items-center gap-2 p-4 bg-terminal-bg rounded-lg border border-terminal-border">
            <code className="flex-1 text-sm font-mono text-terminal-text-primary break-all pr-2">
              {showPrivateKey ? wallet.secretKey : '•'.repeat(64)}
            </code>
            <button
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="p-2 text-terminal-text-secondary hover:text-terminal-accent transition-colors flex-shrink-0"
              title={showPrivateKey ? 'Hide private key' : 'Show private key'}
            >
              {showPrivateKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={handleCopy}
              className="p-2 text-terminal-text-secondary hover:text-terminal-accent transition-colors flex-shrink-0"
              title="Copy private key"
            >
              <Copy size={18} />
            </button>
          </div>
          {copied && (
            <p className="text-xs text-terminal-success mt-2 flex items-center gap-1">
              <CheckCircle size={14} />
              Private key copied to clipboard!
            </p>
          )}
        </div>

        {/* Export Options */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-terminal-text-secondary uppercase tracking-wide mb-3 block">
            Export Options
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportPrivateKey}
              className="p-3 bg-terminal-bg border border-terminal-border rounded-lg hover:border-terminal-accent transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="text-terminal-accent" size={16} />
                <span className="text-sm font-semibold text-terminal-text-primary">Text File</span>
              </div>
              <p className="text-xs text-terminal-text-secondary">
                Save as .txt
              </p>
            </button>
            <button
              onClick={handleExportWallet}
              className="p-3 bg-terminal-bg border border-terminal-border rounded-lg hover:border-terminal-accent transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <Download className="text-terminal-accent" size={16} />
                <span className="text-sm font-semibold text-terminal-text-primary">JSON File</span>
              </div>
              <p className="text-xs text-terminal-text-secondary">
                Complete backup
              </p>
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full terminal-button-primary px-4 py-2 text-sm font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  )
}

