# Nodius Wallet

> Omni-chain self-custodial wallet — swap, bridge, and transfer across EVM, Solana, and TON with near-zero gas fees.

A mobile-first progressive web app (PWA) built with React 19, TypeScript, Vite, and Tailwind CSS v4. All data is hardcoded as a frontend UI prototype demonstrating a complete multi-chain wallet experience.

## Features

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/home` | Dashboard with wallet cards (horizontal scroll + pagination), quick actions (Swap / Bridge / Transfer), trending tokens preview |
| **Swap** | `/swap` | Token swap with live USD conversion, flip direction, slippage presets, and free network fee routing |
| **Bridge** | `/bridge` | Cross-chain transfer between Ethereum, Solana, Polygon, and Arbitrum with flip source/destination |
| **Transfer** | `/transfer` | Send crypto to any address with QR scan, address book, recent recipients, and quick amount presets (25%/50%/75%/Max) |
| **History** | `/history` | Transaction list with 4-type filter (All / Sent / Received / Swap), status badges (completed/pending/failed), and summary stats |
| **Wallet** | `/wallet` | Multi-wallet portfolio with allocation bars, total value, and per-wallet actions |
| **Settings** | `/settings` | Preferences: gas fee routing, gas speed, biometric unlock, notifications, connected dApps, and profile management |
| **Trending** | `/trending` | Top 12 cryptocurrencies ranked by volume with real-time price and change |

### Key highlights

- **Omni-chain architecture** — unified interface for EVM, Solana, and TON networks
- **Gas fee optimization** — 0 Gas Fee Routing toggle, best-price aggregator display
- **Mobile-first design** — phone-frame layout (`max-w-md` centered on desktop), gesture-friendly interactions
- **PWA** — installable on mobile, auto-updating service worker, offline-ready via Workbox
- **Dark theme** — neon (#CCFF00) accent on near-black background with frosted-glass sticky headers

## Tech stack

| Layer | Library |
|-------|---------|
| Framework | React 19 |
| Bundler | Vite 8 |
| Language | TypeScript 6 (strict) |
| Styling | Tailwind CSS v4 (custom theme, no CSS modules) |
| Routing | React Router v7 |
| Icons | lucide-react |
| PWA | vite-plugin-pwa (auto-update SW, Workbox precache) |
| Fonts | Plus Jakarta Sans (body), Space Grotesk (mono/numbers) |

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

## Design

All screens are derived from Figma exports in `flow-export/`. The design system uses:

- **Colors**: neon `#CCFF00`, darkbg `#050505`, surface `#121212`, surfaceLight `#1C1C1C`
- **Layout**: every page constrained to `max-w-md` (360–420 px) and centered on larger screens
- **Components**: bottom navigation, sticky headers with backdrop blur, card carousels, segmented controls

## License

GNU GPL v3
