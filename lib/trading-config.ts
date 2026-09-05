/**
 * Amounts shown and charged across the terminal, denominated in ETH.
 *
 * These were originally sized for SOL. Moving to ETH on Robinhood Chain, every
 * figure is the old SOL value divided by 20, so the proportions a user sees
 * (fee vs stake, quick-buy vs balance) stay exactly as they were.
 *
 *   practice balance   100 SOL  -> 4 ETH
 *   site fee          0.01 SOL  -> 0.0005 ETH
 *   quick amounts  1/5/10/50    -> 0.05 / 0.25 / 0.5 / 2.5
 *   balance buffer    0.01 SOL  -> 0.0005 ETH
 *
 * Kept in one place because the fee used to be declared separately in the
 * trading panel and the parlay builder, which could drift apart.
 */

/** Flat fee charged per trade and per parlay. */
export const SITE_FEE_ETH = 0.0005

/** Practice balance handed to demo users. */
export const INITIAL_DEMO_BALANCE_ETH = 4

/** Small headroom required on top of a trade so a balance never lands at zero. */
export const BALANCE_BUFFER_ETH = 0.0005

/** One-tap stake amounts under the amount input. */
export const QUICK_AMOUNTS_ETH = [0.05, 0.25, 0.5, 2.5] as const
