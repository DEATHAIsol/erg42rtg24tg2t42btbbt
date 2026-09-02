'use client'

import { useState, useRef, useEffect } from 'react'
import { Settings, Bell, ChevronDown, Menu, X } from 'lucide-react'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { SyncIndicator } from './SyncIndicator'
import { WalletButton } from './WalletButton'
import { SettingsModal } from './SettingsModal'
import { AlertsModal } from './AlertsModal'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const navItems = [
  { href: '/markets', label: 'Markets' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/parlays', label: 'Parlays' },
  { href: '/liquidity', label: 'Liquidity' },
]

const infoItems = [
  { href: '/terms-of-use', label: 'Terms of use' },
  { href: '/legal', label: 'Legal' },
  { href: '/privacy-policy', label: 'Privacy policy' },
]

export function TerminalHeader() {
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const infoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Close the mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const openInfo = () => {
    if (infoCloseTimeoutRef.current) {
      clearTimeout(infoCloseTimeoutRef.current)
      infoCloseTimeoutRef.current = null
    }
    setInfoOpen(true)
  }

  const scheduleCloseInfo = () => {
    if (infoCloseTimeoutRef.current) {
      clearTimeout(infoCloseTimeoutRef.current)
    }
    infoCloseTimeoutRef.current = setTimeout(() => {
      setInfoOpen(false)
      infoCloseTimeoutRef.current = null
    }, 300)
  }

  const isActive = (href: string) =>
    pathname === href || (href === '/markets' && pathname.startsWith('/market'))

  return (
    <header className="relative z-40 h-14 border-b border-terminal-border bg-terminal-surface/90 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-6 min-w-0">
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <img
            src="/icon.png"
            alt=""
            className="h-7 w-7 object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <span className="font-display text-[15px] font-bold whitespace-nowrap tracking-tight text-terminal-text-primary">
            Probio
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'relative px-3 py-1.5 text-sm transition-colors duration-150',
                isActive(item.href)
                  ? 'text-terminal-text-primary font-medium'
                  : 'text-terminal-text-secondary hover:text-terminal-text-primary'
              )}
            >
              {item.label}
              {isActive(item.href) && (
                <span className="absolute left-3 right-3 -bottom-[11px] h-px bg-terminal-accent" />
              )}
            </Link>
          ))}

          {/* Information dropdown */}
          <div
            className="relative"
            onMouseEnter={openInfo}
            onMouseLeave={scheduleCloseInfo}
          >
            <button
              type="button"
              className={clsx(
                'px-3 py-1.5 text-sm transition-colors duration-150 flex items-center gap-1',
                infoOpen
                  ? 'text-terminal-text-primary'
                  : 'text-terminal-text-secondary hover:text-terminal-text-primary'
              )}
            >
              Info
              <ChevronDown
                size={14}
                className={clsx('transition-transform duration-200', infoOpen && 'rotate-180')}
              />
            </button>

            {infoOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-terminal-border bg-terminal-surface shadow-modal overflow-hidden animate-scale-in origin-top-left">
                <div className="py-1.5">
                  {infoItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-2 text-sm text-terminal-text-secondary hover:text-terminal-text-primary hover:bg-terminal-elevated transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>

      <div className="flex items-center gap-1">
        <SyncIndicator />
        <WalletButton />
        <button
          onClick={() => setAlertsOpen(true)}
          className="icon-button hidden sm:inline-flex"
          title="Alerts"
          aria-label="Alerts"
        >
          <Bell size={16} />
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="icon-button hidden sm:inline-flex"
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={16} />
        </button>

        {/* Accounts are optional: guests keep full access to the terminal. */}
        <div className="hidden sm:flex items-center gap-2 ml-1.5 pl-2.5 border-l border-terminal-border">
          <SignedOut>
            <Link
              href="/sign-in"
              className="terminal-button-ghost !px-2.5 !py-1.5 !text-[13px]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="terminal-button !px-3 !py-1.5 !text-[13px]"
            >
              Create account
            </Link>
          </SignedOut>
          <SignedIn>
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: 'h-7 w-7' } }}
            />
          </SignedIn>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="icon-button md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute top-full inset-x-0 md:hidden border-b border-terminal-border bg-terminal-surface shadow-modal animate-fade-in">
          <nav className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'block px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive(item.href)
                    ? 'text-terminal-text-primary bg-terminal-elevated font-semibold'
                    : 'text-terminal-text-secondary hover:text-terminal-text-primary hover:bg-terminal-elevated/60'
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="divider my-2" />
            {infoItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-lg text-sm text-terminal-text-secondary hover:text-terminal-text-primary hover:bg-terminal-elevated/60 transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="divider my-2" />
            <div className="flex gap-2 px-1 pb-1">
              <button
                onClick={() => { setMobileOpen(false); setAlertsOpen(true) }}
                className="terminal-button flex-1 text-xs"
              >
                <Bell size={14} /> Alerts
              </button>
              <button
                onClick={() => { setMobileOpen(false); setSettingsOpen(true) }}
                className="terminal-button flex-1 text-xs"
              >
                <Settings size={14} /> Settings
              </button>
            </div>

            <div className="divider my-2" />
            <SignedOut>
              <div className="px-1 pb-1 space-y-2">
                <Link href="/sign-up" className="terminal-button-primary w-full !py-2.5">
                  Create account
                </Link>
                <Link href="/sign-in" className="terminal-button w-full !py-2.5">
                  Sign in
                </Link>
                <p className="text-[11px] text-terminal-text-muted text-center pt-1">
                  Optional — the demo works without one.
                </p>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-3 px-3 py-2">
                <UserButton afterSignOutUrl="/" />
                <span className="text-sm text-terminal-text-secondary">Account</span>
              </div>
            </SignedIn>
          </nav>
        </div>
      )}

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AlertsModal isOpen={alertsOpen} onClose={() => setAlertsOpen(false)} />
    </header>
  )
}
