'use client'

import { useState, useEffect } from 'react'
import { X, Download, Copy, Eye, EyeOff, AlertTriangle, CheckCircle, Shield, Key, FileText } from 'lucide-react'
import { CustodialWallet } from '@/lib/custodial-wallet'

interface WalletOnboardingModalProps {
  wallet: CustodialWallet
  onClose: () => void
  onComplete: () => void
}

export function WalletOnboardingModal({ wallet, onClose, onComplete }: WalletOnboardingModalProps) {
  const [step, setStep] = useState(1)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [savedBackup, setSavedBackup] = useState(false)

  const handleCopyPrivateKey = () => {
    if (!wallet) return
    navigator.clipboard.writeText(wallet.secretKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const handleExportWallet = () => {
    if (!wallet) return
    const dataStr = JSON.stringify(wallet, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wallet-backup-${wallet.publicKey.slice(0, 8)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setSavedBackup(true)
  }

  const handleExportPrivateKey = () => {
    if (!wallet) return
    const dataStr = `Solana Private Key Backup\n\nPublic Key: ${wallet.publicKey}\nPrivate Key: ${wallet.secretKey}\n\nCreated: ${wallet.createdAt}\n\n⚠️ WARNING: Keep this file secure and never share it with anyone!`
    const dataBlob = new Blob([dataStr], { type: 'text/plain' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `private-key-${wallet.publicKey.slice(0, 8)}.txt`
    link.click()
    URL.revokeObjectURL(url)
    setSavedBackup(true)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-terminal-surface border border-terminal-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-terminal-text-secondary hover:text-terminal-text-primary transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Step 1: Welcome & Overview */}
        {step === 1 && (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-terminal-accent/20 flex items-center justify-center">
                <Shield className="text-terminal-accent" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-terminal-text-primary">Welcome to Your New Wallet</h2>
                <p className="text-sm text-terminal-text-secondary">Your trading wallet has been created</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-terminal-bg/50 rounded-lg border border-terminal-border">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-terminal-success mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <div className="font-semibold text-terminal-text-primary mb-1">Wallet Created</div>
                    <div className="text-sm text-terminal-text-secondary font-mono break-all">
                      {wallet.publicKey}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-terminal-danger/10 border border-terminal-danger/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-terminal-danger mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <div className="font-semibold text-terminal-danger mb-1">Important: Backup Required</div>
                    <p className="text-sm text-terminal-text-secondary">
                      Your wallet is stored in this browser. If you clear browser data or use a different device, 
                      you will lose access unless you save your private key.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 terminal-button-primary px-6 py-3 text-sm font-semibold"
              >
                Continue to Backup
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 text-sm text-terminal-text-secondary hover:text-terminal-text-primary transition-colors"
              >
                Skip for Now
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Private Key Backup */}
        {step === 2 && (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-terminal-accent/20 flex items-center justify-center">
                <Key className="text-terminal-accent" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-terminal-text-primary">Backup Your Private Key</h2>
                <p className="text-sm text-terminal-text-secondary">Save this key to restore your wallet</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-terminal-danger/10 border border-terminal-danger/30 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="text-terminal-danger mt-0.5 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <div className="font-semibold text-terminal-danger mb-2">Security Warning</div>
                  <ul className="text-sm text-terminal-text-secondary space-y-1.5">
                    <li>• Never share your private key with anyone</li>
                    <li>• Store it in a secure location (password manager, encrypted file)</li>
                    <li>• Anyone with your private key can access your funds</li>
                    <li>• This is the only way to recover your wallet</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Private Key Display */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-terminal-text-secondary uppercase tracking-wide mb-2 block">
                Your Private Key
              </label>
              <div className="relative">
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
                    onClick={handleCopyPrivateKey}
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
            </div>

            {/* Backup Options */}
            <div className="mb-6">
              <div className="text-xs font-semibold text-terminal-text-secondary uppercase tracking-wide mb-3 block">
                Save Backup
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExportPrivateKey}
                  className="p-4 bg-terminal-bg border border-terminal-border rounded-lg hover:border-terminal-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="text-terminal-accent" size={20} />
                    <span className="font-semibold text-terminal-text-primary">Save as Text File</span>
                  </div>
                  <p className="text-xs text-terminal-text-secondary">
                    Download private key as a text file
                  </p>
                </button>
                <button
                  onClick={handleExportWallet}
                  className="p-4 bg-terminal-bg border border-terminal-border rounded-lg hover:border-terminal-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Download className="text-terminal-accent" size={20} />
                    <span className="font-semibold text-terminal-text-primary">Export Wallet JSON</span>
                  </div>
                  <p className="text-xs text-terminal-text-secondary">
                    Download complete wallet backup
                  </p>
                </button>
              </div>
              {savedBackup && (
                <p className="text-xs text-terminal-success mt-3 flex items-center gap-1">
                  <CheckCircle size={14} />
                  Backup file downloaded successfully!
                </p>
              )}
            </div>

            {/* Acknowledgment */}
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-terminal-border bg-terminal-bg text-terminal-accent focus:ring-terminal-accent focus:ring-2"
                />
                <span className="text-sm text-terminal-text-secondary">
                  I understand that I am responsible for backing up my private key. I have saved it in a secure location 
                  and will not share it with anyone.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 text-sm text-terminal-text-secondary hover:text-terminal-text-primary transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (acknowledged) {
                    setStep(3)
                  }
                }}
                disabled={!acknowledged}
                className="flex-1 terminal-button-primary px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Instructions */}
        {step === 3 && (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-terminal-success/20 flex items-center justify-center">
                <CheckCircle className="text-terminal-success" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-terminal-text-primary">You&apos;re All Set!</h2>
                <p className="text-sm text-terminal-text-secondary">Here&apos;s how to use your wallet</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-terminal-bg/50 rounded-lg border border-terminal-border">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-terminal-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-terminal-accent font-bold text-sm">1</span>
                  </div>
                  <div>
                    <div className="font-semibold text-terminal-text-primary mb-1">Deposit SOL</div>
                    <p className="text-sm text-terminal-text-secondary">
                      Click the &quot;Deposit&quot; button to see your wallet address and QR code. Send SOL from an exchange 
                      or another wallet to fund your trading account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-terminal-bg/50 rounded-lg border border-terminal-border">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-terminal-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-terminal-accent font-bold text-sm">2</span>
                  </div>
                  <div>
                    <div className="font-semibold text-terminal-text-primary mb-1">Start Trading</div>
                    <p className="text-sm text-terminal-text-secondary">
                      Browse markets, place trades, and build parlays. Your wallet balance will update automatically 
                      as you trade.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-terminal-bg/50 rounded-lg border border-terminal-border">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-terminal-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-terminal-accent font-bold text-sm">3</span>
                  </div>
                  <div>
                    <div className="font-semibold text-terminal-text-primary mb-1">Keep Your Backup Safe</div>
                    <p className="text-sm text-terminal-text-secondary">
                      Remember: Your private key is stored in this browser. If you clear browser data or switch devices, 
                      you&apos;ll need your backup to restore access.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 text-sm text-terminal-text-secondary hover:text-terminal-text-primary transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => {
                  onComplete()
                  onClose()
                }}
                className="flex-1 terminal-button-primary px-6 py-3 text-sm font-semibold"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


