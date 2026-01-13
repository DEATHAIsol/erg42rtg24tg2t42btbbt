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

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SOLANA_RPC_URL=your_rpc_url_here
```

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
