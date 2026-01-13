'use client'

import { useState } from 'react'
import { Settings, Bell } from 'lucide-react'
import { WalletButton } from './WalletButton'
import { SettingsModal } from './SettingsModal'
import { AlertsModal } from './AlertsModal'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

export function TerminalHeader() {
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)

  const navItems = [
    { href: '/', label: 'Markets' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/parlays', label: 'Parlays' },
    { href: '/liquidity', label: 'Liquidity' },
  ]

  return (
    <header className="h-14 border-b border-terminal-border bg-terminal-surface flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity group">
          <img 
            src="/icon.png" 
            alt="Probio Markets" 
            className="h-11 w-11 object-contain flex-shrink-0 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] group-hover:drop-shadow-[0_0_12px_rgba(59,130,246,0.7)] transition-all"
          />
          <h1 className="text-lg font-bold whitespace-nowrap bg-gradient-to-r from-terminal-text-primary via-terminal-accent to-terminal-text-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
            Probio Markets
          </h1>
        </Link>
        <nav className="flex items-center gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'transition-colors',
                pathname === item.href
                  ? 'text-terminal-accent font-semibold'
                  : 'text-terminal-text-secondary hover:text-terminal-text-primary'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <WalletButton />
        <button
          onClick={() => setAlertsOpen(true)}
          className="p-2 text-terminal-text-secondary hover:text-terminal-text-primary transition-colors relative"
        >
          <Bell size={18} />
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 text-terminal-text-secondary hover:text-terminal-text-primary transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AlertsModal isOpen={alertsOpen} onClose={() => setAlertsOpen(false)} />
    </header>
  )
}

