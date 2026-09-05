# ProBioMarkets Terminal

A decentralized prediction market platform built on Solana, featuring real-time trading, leverage, parlays, and liquidity pools.

## Features

- 🎯 **Prediction Markets**: Trade on outcomes of real-world events
- 📊 **Real-time Data**: Live prices, order books, and market analytics
- 💰 **Leverage Trading**: Amplify positions with up to 10x leverage
- 🎲 **Parlays**: Combine multiple markets for multiplied returns
- 💧 **Liquidity Pools**: Earn yield by providing liquidity
- 📱 **Paper Trading**: Practice with virtual funds
- 🔒 **Custodial Wallets**: Secure Solana wallet management

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Solana wallet (auto-created on first use)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Documentation

Full documentation is available at [docs.probiomarkets.com](https://docs.probiomarkets.com)

### Local Documentation

To run the documentation locally with Mintlify:

```bash
# Install Mintlify CLI
npm install -g mintlify

# Start documentation server
mintlify dev
```

The documentation will be available at `http://localhost:3000`

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── market/            # Market pages
│   ├── portfolio/         # Portfolio page
│   ├── parlays/           # Parlay builder
│   └── liquidity/         # Liquidity page
├── components/            # React components
├── lib/                   # Utility libraries
├── docs/                  # Mintlify documentation
└── data/                  # SQLite database
```

## Accounts (Clerk)

Accounts are **optional**. The terminal, market data, paper trading, parlays and
the in-browser wallet all work fully while signed out.

Signing in adds one thing: your paper portfolio, parlays, alerts and terminal
settings are saved to your account and follow you to other browsers/devices.

**Your wallet's private key is never sent to the server.** It stays in the
browser that generated it — an account does not back it up.

Sync is last-write-wins: on sign-in, whichever side was updated most recently
wins. If you traded as a guest and then sign in to a fresh account, your guest
progress is pushed up rather than discarded.

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SOLANA_RPC_URL=your_rpc_url_here

# Clerk (required for accounts; the app still runs guest-only without them)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional: Postgres for account sync. Falls back to local SQLite when unset.
DATABASE_URL=postgres://...
```

> Deploying: set the Clerk keys in your host's environment, and switch the Clerk
> instance from development to production in the Clerk dashboard.

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Blockchain**: Solana
- **Database**: SQLite (better-sqlite3)
- **Charts**: TradingView Lightweight Charts
- **Documentation**: Mintlify

## License

MIT
