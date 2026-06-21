# Nodius Wallet

> Omnichain wallet — swap, bridge, and transfer across EVM, Solana, and TON with gas abstraction.

A mobile-first progressive web app (PWA) built with React 19, TypeScript, Vite, and Tailwind CSS v4. Uses Privy.io for auth and embedded wallets, LI.FI + deBridge for cross-chain routing, and a backend relayer for gas sponsorship via EIP-712 meta-transactions.

## Features

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/home` | Aggregate portfolio across all chains, wallet cards with quick actions (Swap/Bridge/Transfer), trending tokens preview |
| **Swap** | `/swap` | Token swap with live USD conversion, slippage presets, 0x/Jupiter aggregation, gas sponsorship toggle |
| **Bridge** | `/bridge` | Cross-chain transfer — EVM↔EVM via LI.FI, EVM↔Solana/TON via deBridge, chain selector modal, gas sponsorship |
| **Transfer** | `/transfer` | Send crypto to any address on any chain — auto-routes through LI.FI or deBridge for cross-chain/cross-token, QR scan, address book, sponsored same-chain SOL transfer |
| **History** | `/history` | Transaction history from Etherscan family, Solscan, and TonAPI with status badges and filter (All/Sent/Received/Swap) |
| **Wallet** | `/wallet` | Per-chain wallet cards with native balance, USD value, chain management |
| **Settings** | `/settings` | Profile, local currency, default network, gas abstraction toggle, gas speed, price alerts, push notifications, address book, TON wallet contract |
| **Trending** | `/trending` | Top cryptocurrencies with real-time price and 24h change |

### Key highlights

- **Omnichain** — unified interface for EVM (Ethereum, Base, Polygon, Arbitrum), Solana, and TON
- **Gas abstraction** — sponsored transactions via EIP-712 meta-tx (EVM) and relayer-as-fee-payer (Solana), toggleable in settings
- **Cross-chain routing** — auto-selects LI.FI (EVM↔EVM), deBridge (EVM↔Solana/TON), or direct transfer
- **Mobile-first** — phone-frame layout (`max-w-md` centered on desktop), gesture-friendly
- **PWA** — installable on mobile, auto-updating service worker via Workbox
- **Dark theme** — neon accent with frosted-glass UI

## Tech stack

| Layer | Library |
|-------|---------|
| Auth + EVM wallet | Privy.io |
| Solana wallet | Privy.io embedded + @solana/web3.js |
| TON wallet | @tonconnect/ui-react |
| Framework | React 19 |
| Bundler | Vite 8 |
| Language | TypeScript 6 (strict) |
| Styling | Tailwind CSS v4 (custom theme) |
| Routing | React Router v7 |
| State | Zustand (persisted) |
| Icons | lucide-react |
| Backend | Hono + SQLite (Drizzle ORM) |
| DEX API | 0x (EVM), Jupiter (Solana) |
| Bridge API | LI.FI, deBridge |
| Price API | CoinGecko |

## Getting started

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173).

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Preview the built app |
| `npm run lint` | Type-check only (`tsc -b --noEmit`) |

## Current status

All core pages use live data — real wallet connections via Privy, live prices from CoinGecko, swap quotes from 0x/Jupiter, bridge quotes from LI.FI/deBridge, transaction history from block explorers.

Gas abstraction is functional for EVM (EIP-712 meta-tx via relay contract on Sepolia/Base Sepolia) and same-chain Solana transfers (relayer pays SOL fee). Cross-chain Solana and TON paths are routed through deBridge.

## Upcoming

- Fund Solana relayer to enable sponsored Jupiter swaps and Solana→EVM bridging
- Deploy TonGaslessWallet contract for sponsored TON swaps
- Token verification and allowlist for production-grade spam filtering
- Solana↔TON and TON↔Solana bridge (waiting on provider support)
- deBridge TON broadcast for seamless TON→EVM (currently requires manual DLN claim)

## Design

All screens follow a mobile-first layout constrained to `max-w-md` (360-420px) and centered on larger screens. Colors: neon `#CCFF00`, darkbg `#050505`, surface `#121212`, surfaceLight `#1C1C1C`.

## License

GNU GPL v3
