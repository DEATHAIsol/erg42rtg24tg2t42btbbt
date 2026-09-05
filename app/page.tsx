import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { TerminalHeader } from '@/components/TerminalHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { MarketTicker, FeaturedMarkets } from '@/components/LiveMarketPreview'
import { INITIAL_DEMO_BALANCE_ETH } from '@/lib/trading-config'

/* Capability spec-sheet rows — typographic, not icon cards */
const capabilities = [
  {
    key: 'DATA',
    title: 'Live Polymarket feed',
    body:
      'Every market, price and order book is pulled from the Polymarket API in real time. Nothing on this terminal is a synthetic feed.',
  },
  {
    key: 'LEVERAGE',
    title: 'Up to 10× on any outcome',
    body:
      'Size a position with a slider and read the full cost breakdown (margin, fees, payout and ROI) before you commit to it.',
  },
  {
    key: 'PARLAY',
    title: 'Multi-market slips',
    body:
      'Chain outcomes across unrelated markets into one slip. Odds multiply, legs stay editable until you place it.',
  },
  {
    key: 'WALLET',
    title: 'Keys made in your browser',
    body:
      'A Ethereum keypair is generated locally the moment you ask for one. Export it whenever you want. It never leaves your device.',
  },
  {
    key: 'ACCOUNT',
    title: 'Optional account, real portability',
    body:
      'The whole terminal works signed out. Make an account only if you want your paper portfolio, parlays and settings to follow you to another browser or device.',
  },
  {
    key: 'PAPER',
    title: `${INITIAL_DEMO_BALANCE_ETH} ETH practice balance`,
    body:
      'Demo mode runs the same interface against the same live prices with simulated funds. Nothing at risk while you learn the desk.',
  },
]

const steps = [
  { n: 'i', label: 'Generate a wallet', copy: 'One click, no extension, no signup form.' },
  { n: 'ii', label: 'Find your market', copy: 'Filter hundreds of live markets by volume, liquidity or odds.' },
  { n: 'iii', label: 'Take the position', copy: 'Market or limit, with leverage or stacked into a parlay.' },
  { n: 'iv', label: 'Close it out', copy: 'Track live P&L and exit whenever the number suits you.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      <TerminalHeader />
      <MarketTicker />

      <main className="flex-1">
        {/* ---------------- Hero ---------------- */}
        <section className="relative overflow-hidden border-b border-terminal-border">
          <div className="absolute inset-0 bg-grid" aria-hidden="true" />
          {/* single warm wash, anchored to the brand mark's coral */}
          <div
            className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(255,125,90,0.13) 0%, rgba(255,125,90,0.04) 45%, transparent 70%)',
            }}
            aria-hidden="true"
          />

          <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-14 lg:pt-24 lg:pb-20">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-end">
              <div className="lg:col-span-7">
                <div className="flex items-center gap-3 mb-8">
                  <span className="h-px w-8 bg-terminal-accent" />
                  <span className="section-label !text-terminal-accent">
                    Prediction markets · Robinhood Chain
                  </span>
                </div>

                <h1 className="font-display font-bold tracking-[-0.035em] leading-[0.94] text-[clamp(2.75rem,7vw,5.25rem)] mb-7">
                  Put a price
                  <br />
                  on what
                  <br />
                  <span className="text-terminal-accent">happens next.</span>
                </h1>

                <p className="text-lg text-terminal-text-secondary leading-relaxed max-w-lg mb-9">
                  Probio is a trading desk for real-world outcomes: elections, rate
                  decisions, whatever the world hasn&apos;t settled yet. Live Polymarket
                  order books, leverage and parlays, in one terminal.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/markets" className="terminal-button-primary !px-6 !py-3 !text-[15px]">
                    Launch the terminal
                    <ArrowRight size={17} />
                  </Link>
                  <Link href="#inside" className="terminal-button !px-6 !py-3 !text-[15px]">
                    What&apos;s inside
                  </Link>
                </div>
              </div>

              {/* Right rail: honest, hard numbers, no invented metrics */}
              <div className="lg:col-span-5 lg:pl-10 lg:border-l lg:border-terminal-border">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-7">
                  {[
                    ['Max leverage', '10×'],
                    ['Settles in', 'ETH'],
                    ['Practice balance', `${INITIAL_DEMO_BALANCE_ETH} ETH`],
                    ['Account needed', 'No'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dd className="font-display text-4xl font-bold tracking-tight mb-1.5">
                        {value}
                      </dd>
                      <dt className="section-label">{label}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Live markets ---------------- */}
        <section className="border-b border-terminal-border">
          <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
            <div className="flex items-end justify-between gap-6 mb-8">
              <div>
                <div className="section-label mb-3">Trading now</div>
                <h2 className="text-2xl lg:text-3xl font-bold">
                  The board, live
                </h2>
              </div>
              <Link
                href="/markets"
                className="text-sm text-terminal-accent hover:text-terminal-accent-hover inline-flex items-center gap-1.5 pb-1 flex-shrink-0"
              >
                All markets
                <ArrowUpRight size={15} />
              </Link>
            </div>

            <FeaturedMarkets />
          </div>
        </section>

        {/* ---------------- Capabilities spec sheet ---------------- */}
        <section id="inside" className="border-b border-terminal-border scroll-mt-14">
          <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24">
            <div className="grid lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-24">
                  <div className="section-label mb-3">What&apos;s inside</div>
                  <h2 className="text-3xl lg:text-[2.6rem] font-bold leading-[1.05] mb-5">
                    Built like a desk,
                    <br />
                    not a landing page.
                  </h2>
                  <p className="text-terminal-text-secondary leading-relaxed">
                    Dense where it should be dense. Every number tabular, every
                    state accounted for.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-8">
                <dl>
                  {capabilities.map((c, i) => (
                    <div
                      key={c.key}
                      className={`grid sm:grid-cols-12 gap-x-8 gap-y-2 py-7 group ${
                        i === 0 ? 'border-t' : ''
                      } border-b border-terminal-border`}
                    >
                      <dt className="sm:col-span-3">
                        <span className="section-label group-hover:text-terminal-accent transition-colors">
                          {c.key}
                        </span>
                      </dt>
                      <dd className="sm:col-span-9">
                        <h3 className="text-lg font-semibold mb-1.5">{c.title}</h3>
                        <p className="text-sm text-terminal-text-secondary leading-relaxed max-w-xl">
                          {c.body}
                        </p>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Sequence ---------------- */}
        <section className="border-b border-terminal-border">
          <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
            <div className="section-label mb-3">The sequence</div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-12 max-w-lg leading-[1.08]">
              Four moves from cold open to open position.
            </h2>

            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-terminal-border border border-terminal-border">
              {steps.map((s) => (
                <li key={s.n} className="bg-terminal-bg p-6 lg:p-7">
                  <div className="font-mono text-sm text-terminal-accent mb-5 lowercase">
                    {s.n}
                  </div>
                  <h3 className="font-semibold mb-2 text-[15px]">{s.label}</h3>
                  <p className="text-sm text-terminal-text-secondary leading-relaxed">
                    {s.copy}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- Closing ---------------- */}
        <section className="relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-8">
                <h2 className="font-display font-bold tracking-[-0.03em] leading-[1.02] text-[clamp(2rem,5vw,3.5rem)]">
                  The market is already
                  <br />
                  <span className="text-terminal-accent">pricing it.</span> Go read it.
                </h2>
              </div>
              <div className="lg:col-span-4 lg:text-right">
                <Link
                  href="/markets"
                  className="terminal-button-primary !px-7 !py-3.5 !text-[15px]"
                >
                  Launch the terminal
                  <ArrowUpRight size={17} />
                </Link>
                <p className="mt-4 text-xs text-terminal-text-muted">
                  Demo mode needs no funds and no signup.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
