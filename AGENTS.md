# Nodius Wallet

Multi-chain aggregator wallet — unified interface for EVM, Solana, TON wallets with gas-free relayer. Privy.io for auth + embedded wallets. React 19 + Vite, TypeScript strict.

## Commands

| Command | What |
|---------|------|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | Vite preview of built app |
| `npm run lint` | `tsc -b --noEmit` (type-check only) |

## Workflow Rules

- **Jangan** jalankan `lint`, `build`, atau `test` setelah mengubah kode.
- **Jangan** `commit`, `push`, atau `git add` tanpa perintah eksplisit.
- Hanya jalankan `lint` → `build` ketika user menyuruh **push ke GitHub**.
- Urutan push: `lint` → `build` → `git add` → `git commit` → `git push`.

## Architecture

- **SPA** — single-page app, Vite at root, entry at `src/main.tsx`.
- **Entry**: `index.html` → `src/main.tsx` → `src/App.tsx`.
- **PWA**: Service worker via `vite-plugin-pwa` (auto-update, Workbox precache). Icons at `public/pwa-icon.svg`. Manifest registered on build.
- **Routing**: React Router v6 (`react-router-dom`). Pages in `src/pages/`. Layout with `BottomNavigation` in `src/components/`.
- **Styling**: Tailwind CSS v4 with custom theme (`neon`, `darkbg`, `surface`, `surfaceLight`). `Plus Jakarta Sans` + `Space Grotesk` fonts.
- **Icons**: `lucide-react` package.
- **State**: Zustand store (wallet connections, balances, preferences). Persisted via `zustand/middleware` (`nodius-settings` key).
- **Backend**: Hono + TypeScript, SQLite via Drizzle ORM.

## Wallet Provider

App entry (`main.tsx`) wraps with `WalletProvider` which nests:
```
TonConnectUIProvider → PrivyProvider
```

- **EVM/Solana**: Privy embedded wallet (social login via Google/Email).
- **TON**: TonConnect (kept as-is, Privy doesn't support TON).
- No wagmi, no @solana/wallet-adapter-*, no @tanstack/react-query.

## Project Structure

```
src/
├── config/           solana, ton provider configs
├── components/       Shared UI components (NeonButton, TokenSelectButton, SegmentedControl, QuickAmount, AddressBookModal)
├── hooks/            useTransfer, useBalances, useWalletConnection
├── pages/            Home, Swap, Bridge, Transfer, History, Wallet, Settings, Trending
├── providers/        WalletProvider (PrivyProvider + TonConnectUIProvider)
├── services/         API integrations (price/CoinGecko, transfer, swap/0x+Jupiter, bridge/LI.FI, notifications, relay)
├── stores/           Zustand stores (walletStore, settingsStore, addressStore, alertStore)
├── types/            Shared TypeScript types (wallet, token, transaction, chain, settings, address)
├── App.tsx           Routes config
└── main.tsx          Entry with WalletProvider wrapper

backend/
├── src/
│   ├── index.ts         Hono server (relay submit + meta-submit + info endpoints)
│   ├── relayer.ts       DB operations + broadcast + meta-tx orchestration
│   ├── relayContract.ts Viem wallet client + contract ABI + executeRelayTx
│   ├── worker.ts        Queue processor (pending relays) + gas pool monitor
│   └── db/
│       ├── index.ts     @libsql/client setup
│       └── schema.ts    Drizzle schema (relay_queue, nonce_tracker, gas_pool)
├── package.json
├── tsconfig.json
└── drizzle.config.ts

contracts/
├── contracts/
│   └── NodiusRelay.sol  EIP-712 relay contract (execute, nonce, deadline)
├── scripts/
│   ├── deploy.ts        Hardhat deploy script
│   └── shared.ts        shared deploy helper
├── hardhat.config.ts
├── package.json
└── tsconfig.json
```

## Pages & Data Sources

| Route | Data Source |
|-------|-------------|
| `/home` | Connected wallets + CoinGecko prices (auto-refresh 30s) |
| `/wallet` | Privy wallet state + balance + prices |
| `/transfer` | Privy useSendTransaction + useSignTypedData + relay routing (gas-free toggle) |
| `/swap` | 0x API quote + Privy useSendTransaction + relay routing |
| `/trending` | CoinGecko API via useBalances |
| `/settings` | settingsStore (persisted) |
| `/history` | Etherscan + Solscan API (auto-refresh 60s) |
| `/bridge` | LI.FI quote API + chain selector modal |

## Services Layer

| File | Integration |
|------|-------------|
| `price.ts` | CoinGecko `/simple/price` |
| `transfer.ts` | viem, Solana Web3.js, TON Connect |
| `swap.ts` | 0x API `/swap/v1/quote` + Jupiter `/quote` |
| `bridge.ts` | LI.FI `/quote` + `/status` |
| `explorer.ts` | Etherscan + Solscan API |
| `relay.ts` | Backend relayer client (raw + meta-tx, EIP-712 domain & types exports) |
| `notifications.ts` | Browser Notification API (tx status, price alerts) |

## Env Variables

### Root `.env` (frontend)

| Variable | Cara Dapat | Contoh |
|----------|-----------|--------|
| `VITE_PRIVY_APP_ID` | Daftar di https://privy.io (free) | `cmc00117800rojo0mwzq3fgsz` |
| `VITE_SOLSCAN_API_KEY` | Daftar di https://solscan.io (free tier) | `abc123...` |
| `VITE_ETHERSCAN_API_KEY` | Daftar di https://etherscan.io (free tier) | `abc123...` |
| `VITE_ZEROX_API_KEY` | Daftar di https://0x.org (free, rate-limited) | `abc123...` |
| `VITE_ALCHEMY_API_KEY` | Daftar di https://alchemy.com (Token API) | `abc123...` |
| `VITE_HELIUS_API_KEY` | Daftar di https://helius.dev (DAS/Solana tokens) | `abc123...` |
| `VITE_TONAPI_KEY` | Daftar di https://tonconsole.com (TonAPI) | `abc123...` |
| `VITE_SOLANA_RPC` | Daftar di https://helius.dev (free tier) | `https://mainnet.helius-rpc.com/?api-key=...` |
| `VITE_BACKEND_URL` | Backend URL (default `http://localhost:3001`) | `http://localhost:3001` |

### `backend/.env`

| Variable | Cara Dapat | Contoh |
|----------|-----------|--------|
| `ALCHEMY_API_KEY` | Daftar di https://alchemy.com (free) | `V7PLWLwRYAuHP0EmjNOFb` |
| `RELAYER_PRIVATE_KEY` | MetaMask → Account Details → Export Private Key (0x...) | `0x5d1b12fb99294425...` |
| `RELAY_CONTRACT_ETH` | Muncul setelah `npm run deploy:sepolia` | `0x67f36e0c0bac9c2c...` |
| `RELAY_CONTRACT_BASE` | Muncul setelah `NETWORK=base-sepolia npx tsx scripts/deploy.ts` | `0x67f36e0c0bac9c2c...` |

### `contracts/.env`

| Variable | Cara Dapat | Contoh |
|----------|-----------|--------|
| `ALCHEMY_API_KEY` | Sama dengan backend | `V7PLWLwRYAuHP0EmjNOFb` |
| `DEPLOYER_PRIVATE_KEY` | MetaMask → Account Details → Export Private Key (0x...) | `0x5d1b12fb99294425...` |

## Tech Stack

| Layer | Choice | Version |
|-------|--------|---------|
| Auth + EVM wallet | Privy.io | 3.30.0 |
| Solana wallet | Privy.io (embedded) + @solana/web3.js | 1.91 |
| TON wallet | @tonconnect/ui-react | latest |
| State management | Zustand | 5.x |
| Backend | Hono (TypeScript) | 4.x |
| DB (MVP) | SQLite via @libsql/client + Drizzle ORM | 0.30 |
| DEX API | 0x (EVM), Jupiter (Solana) | REST |
| Bridge API | LI.FI | REST |
| Price API | CoinGecko | Free tier |

## Status

✅ **Privy migration complete** — wagmi, @tanstack/react-query, @solana/wallet-adapter-* removed. All pages use Privy hooks.
✅ **Fase 0-3 selesai.** Semua halaman real data, wallet connection multi-chain, backend relayer + queue worker + gas pool monitoring.
✅ **Fase 4.2 selesai.** Address Book — type, Zustand store, modal component, integrated di TransferPage & SettingsPage.
✅ **Fase 4.3 selesai.** Push Notifications — service wrapper (Browser Notification API), tx status alert di useTransfer, price alert system.
✅ **Fase 4.4 selesai (partial).** Gas Sponsorship Contract (EIP-712) — `NodiusRelay.sol` deployed to Sepolia & Base Sepolia. Backend endpoints work. Frontend uses Privy `useSignTypedData` for gas-free flow.
✅ **UX fixes done.** Home Receive quick button opens QR, Settings disconnect calls `logout()`, Settings profile uses Privy user, Help Center has fallback action, Transfer QR button has fallback address input.
✅ **Swap UX upgraded.** Swap token selector modal added, slippage has state, quote auto-fetches with debounce.
✅ **TON basics upgraded.** TON balance fetch added, TON disconnect uses `tonUI.disconnect()`, TON history fetch uses TonAPI.
✅ **Relayer gaps reduced.** Solana relay path no longer uses `eth_sendRawTransaction`, raw relay inserts pending then updates submitted/failed, worker chain list synced with Sepolia/Base Sepolia, gas pool syncs live relayer balance, `RELAYER_PRIVATE_KEY` guard added.
✅ **Bridge cleanup done.** Bridge uses EVM-only clean path with gas sponsorship (EIP-712 meta-tx), route shows actual LI.FI tool name (`quote.tool`), Network Fee Free badge functional via `gasFreeAvailable` flag.
✅ **Portfolio scan upgraded.** Home balances use Alchemy for EVM native/ERC-20 across Ethereum/Base/Polygon/Arbitrum, Helius for Solana SPL, TonAPI for TON jettons; Home hides tokens without USD price to reduce spam/scam tokens.
✅ **Solana sponsored swap.** Backend `POST /relay/sponsored-solana-swap` builds Jupiter swap tx with relayer as fee payer, returns partially signed tx. Frontend signs user portion and submits via relay.
✅ **TON gasless wallet contract.** `TonGaslessWallet.tact` — AA wallet with external message support + ed25519 signature verification. Backend `tonSponsor.ts` + `POST /relay/sponsored-ton-swap` endpoint ready.
✅ **Bridge gas sponsorship functional.** EVM bridge LI.FI tx wrapped in EIP-712 meta-tx and submitted via relay contract. Network Fee line-through + Free badge shown when `gasFreeAvailable` (gasFeeRouting enabled + EVM source chain).
✅ **Bridge Route shows tool name.** Route row displays `quote.tool` (e.g., "Across", "Stargate") from LI.FI quote instead of generic aggregator name.
✅ **Bridge aggregator buttons real.** Both 0x and LI.FI fetch from LI.FI API (0x doesn't support cross-chain). Routes show actual bridge provider name.
✅ **Bridge Solana + TON via deBridge.** deBridge API integrated for Solana↔EVM and TON↔EVM bridging. Source chain auto-detects EVM→EVM (LI.FI) vs non-EVM (deBridge). Dest chains include Solana/TON for EVM tokens, and EVM chains for Solana/TON tokens. Solana execution uses `useSignTransaction` + relay submit. TON execution shows manual claim instructions.
✅ **Unused stores removed.** `transactionStore.ts` deleted.

## Gas-Free Bridge — Status per Chain

| Chain | Mech | Frontend | Backend | Status |
|-------|------|----------|---------|--------|
| EVM↔EVM | LI.FI API + EIP-712 meta-tx | ✅ | ✅ | **Siap** |
| Solana→EVM | deBridge API + Solana sign + relay submit | ✅ | ✅ (relay) | **Siap — isi SOL ke relayer** |
| EVM→Solana | deBridge API + EVM sendTransaction / meta-tx | ✅ | ✅ | **Siap** |
| TON→EVM | deBridge API (manual claim instructions) | ✅ | ❌ (no broadcast) | **Partial — TON side menunggu deBridge claim** |
| EVM→TON | deBridge API + EVM sendTransaction / meta-tx | ✅ | ✅ | **Siap** |
| Solana→TON | Not supported yet | ❌ | ❌ | **Belum** |
| TON→Solana | Not supported yet | ❌ | ❌ | **Belum** |

## Backlog — Yang Perlu Dikerjakan

### 🔴 High Priority
- [ ] **Fund Solana relayer** — kirim SOL ke `9ErX5EiqVtr9Hr9G4y3kiJxm7xvXUL1dLjrmnXQgaUq1` agar sponsored swap jalan.
- [ ] **Fund & deploy TonGaslessWallet** — kirim test TON ke `EQCUhWYp6TZ_hAo6hoQa32U86ktKRepuEt9HXDU7hnv78wip`, lalu `npm run deploy` di `ton-contracts/`.

### 🟡 Medium Priority
- [ ] **TON frontend sponsored** — blocked karena TonConnect UI tidak punya `signData`. Alternatif: custom signing via TON wallet raw methods atau tunggu TonConnect update.
- [ ] **Gas pool monitoring** untuk Solana & TON (currently EVM-only).

### 🟢 Low Priority
- [ ] **Hapus unused stores** — `transactionStore.ts` masih tidak pakai.
- [ ] **Integrate wallet contract address** ke frontend (user deploys once, stores address).

### 🟠 Portfolio / Balance
- [ ] **Token verification/allowlist** — stronger spam filtering still needed for production.

## Notable

- No CI, no test suite, no codegen.
- `tsc -b` (project references) used for type-checking.
- React 19 + TypeScript 6.
- Build warnings (`INVALID_ANNOTATION`, chunk size) are from third-party packages — safe to ignore.
- Privy bundle is large (PWA workbox limit increased to 4 MB).
- TON wallet kept independent — Privy doesn't support TON.
- **TON relay limitation** — TonConnect UI (`@tonconnect/ui-react`) tidak punya `signData` API, jadi user tidak bisa sign arbitrary data untuk sponsored swap. Contract + backend infra sudah siap, menunggu workaround atau TonConnect update.
- **Solana fee sponsorship** — backend `solanaSponsor.ts` build Jupiter swap dengan relayer sebagai fee payer, sign partial, return partially-signed tx. User sign sisanya di frontend via `useSignTransaction`, kirim fully-signed ke `/relay/submit`.
- **Relayer keys sudah diisi** — `SOLANA_RELAYER_PRIVATE_KEY` dan `TON_RELAYER_MNEMONIC` sudah ada di `backend/.env`. Solana relayer pubkey: `9ErX5EiqVtr9Hr9G4y3kiJxm7xvXUL1dLjrmnXQgaUq1`. TON deployer (testnet): `EQCUhWYp6TZ_hAo6hoQa32U86ktKRepuEt9HXDU7hnv78wip`.
- **TonGaslessWallet compiled** — ada di `ton-contracts/build/`, tinggal fund deployer dan `npm run deploy`.
- **Bridge deBridge integration** — `src/services/debridge.ts` menggunakan deBridge DLN API (`POST /v1.0/order/quote`, `POST /v1.0/order/create-tx`). Mendukung Solana↔EVM dan TON↔EVM. Solana execution: deBridge create-tx → Solana tx base64 → `useSignTransaction` → `submitRelayTx`. EVM execution: deBridge create-tx → `sendTransaction` atau EIP-712 meta-tx. TON execution: manual claim requirement via deBridge DLN interface.

## Scan Summary

- File inti yang sudah discan: `HomePage`, `SettingsPage`, `SwapPage`, `TransferPage`, `BridgePage`, `HistoryPage`, `WalletPage`, hooks utama, services `swap/relay/bridge/debridge/transfer`, backend `index/relayer/relayContract/worker`, contract `NodiusRelay.sol`.
- File yang belum discan detail penuh: semua `src/components/*`, `src/stores/*`, `src/types/*`, `src/providers/*`, `App.tsx`, `main.tsx`, `services/price/explorer/notifications`, `backend/src/db/*`, `contracts/scripts/*`.

