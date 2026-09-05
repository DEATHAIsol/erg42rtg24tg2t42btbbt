import Link from 'next/link'

const productLinks = [
  { href: '/markets', label: 'Markets' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/parlays', label: 'Parlays' },
  { href: '/liquidity', label: 'Liquidity' },
]

const legalLinks = [
  { href: '/terms-of-use', label: 'Terms of Use' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/legal', label: 'Legal' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-terminal-border bg-terminal-surface/50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-10 md:gap-16 justify-between">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <img src="/icon.png" alt="" className="h-7 w-7 object-contain" />
              <span className="font-display text-[15px] font-bold tracking-tight text-terminal-text-primary">
                Probio
              </span>
            </Link>
            <p className="text-sm text-terminal-text-secondary leading-relaxed">
              A professional trading terminal for prediction markets on Robinhood Chain.
              Market data sourced from the Polymarket API.
            </p>
          </div>

          <div className="flex gap-16 flex-wrap">
            <div>
              <div className="section-label mb-4">Product</div>
              <ul className="space-y-2.5">
                {productLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-terminal-text-secondary hover:text-terminal-text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="section-label mb-4">Legal</div>
              <ul className="space-y-2.5">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-terminal-text-secondary hover:text-terminal-text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="divider mt-10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-terminal-text-muted">
            © {new Date().getFullYear()} Probio Markets. All rights reserved.
          </p>
          <p className="text-xs text-terminal-text-muted">
            Trading involves risk. Nothing on this site is financial advice.
          </p>
        </div>
      </div>
    </footer>
  )
}
