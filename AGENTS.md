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
├── stores/           Zustand stores (walletStore, settingsStore, transactionStore, addressStore, alertStore)
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

## Backlog — Yang Perlu Dikerjakan

### 🔴 High Priority (broken UX)
- [ ] **Receive button** (`HomePage.tsx:261`) — no onClick, harusnya buka QR popup.
- [ ] **Disconnect Wallet** (`SettingsPage.tsx:318`) — no onClick, harusnya panggil `logout()`.
- [ ] **Nama & foto profil Settings** (`SettingsPage.tsx:58-60`) — hardcoded `Alex.eth`, pakai dari Privy user.
- [ ] **Help Center** (`SettingsPage.tsx:317`) — no onClick.

### 🟡 Medium Priority (lengkapi fitur)
- [ ] **Token selector modal** di SwapPage — kedua token button tidak ada onClick.
- [ ] **QR scanner** di TransferPage — tombol QrCode next to address input tidak fungsi.
- [ ] **Swap slippage** — tombol Auto/0.1%/0.5%/1.0% hanya visual, tidak ada state.
- [ ] **Auto-fetch quote** di Swap — harus auto-quote saat amount berubah (debounce).
- [ ] **Solana swap** — Jupiter quote ada di service tapi tidak dipanggil.

### 🟢 Low Priority (rapihin)
- [ ] **Hapus console.error** di `TransferPage.tsx:52`, `useTransfer.ts:115,182`.
- [ ] **Hapus unused stores** — `transactionStore.ts` tidak dipakai; `walletStore.ts` hanya di-return dari `useWalletConnection`, belum dipakai nyata.

### 🟣 Integration Gaps
- [ ] **TON balance fetch** (`useBalances.ts:88`) — selalu return `—`, tidak ada RPC call.
- [ ] **TON disconnect** (`useWalletConnection.ts:49`) — pakai `tonModal.close()` bukan disconnect sesungguhnya.
- [ ] **Disconnect per-chain** (`useWalletConnection.ts:36,42`) — EVM & Solana disconnect malah `logout()` full.
- [ ] **TON history** (`HistoryPage.tsx:67`) — `tonAddress` masuk dependency, tapi tidak ada fetch history TON.

### 🔵 Backend / Relayer Gaps
- [ ] **Solana relay broken** (`relayer.ts:34`) — `/relay/submit` selalu broadcast via `eth_sendRawTransaction`, walau `source: 'solana'`.
- [ ] **Worker queue tidak efektif** (`worker.ts:39`, `relayer.ts:51`) — worker proses `pending/raw`, tapi `submitRelay` langsung insert status `submitted`.
- [ ] **Worker chain list tidak sinkron** (`worker.ts:5`) — Sepolia/Base Sepolia ada di relayer, tidak ada di worker.
- [ ] **Gas pool monitor belum real sync** (`worker.ts:65`) — cuma baca DB dan warn, belum update dari relayer balance/on-chain.
- [ ] **Missing env guard** (`relayContract.ts:53`) — `RELAYER_PRIVATE_KEY` kosong bisa crash `privateKeyToAccount`.

### 🟤 Bridge / History Gaps
- [ ] **Bridge EVM-only** (`BridgePage.tsx:17`) — chain list hanya EVM, belum Solana/TON.
- [ ] **Bridge address mismatch** (`BridgePage.tsx:91,247`) — `fromAddress` bisa Solana/TON, tapi eksekusi wajib `evm.address`.
- [ ] **Bridge status unused** (`bridge.ts:36`) — `getBridgeStatus` ada tapi belum dipakai untuk tracking.

## Scan Summary

- File inti yang sudah discan: `HomePage`, `SettingsPage`, `SwapPage`, `TransferPage`, `BridgePage`, `HistoryPage`, `WalletPage`, hooks utama, services `swap/relay/bridge/transfer`, backend `index/relayer/relayContract/worker`, contract `NodiusRelay.sol`.
- File yang belum discan detail penuh: semua `src/components/*`, `src/stores/*`, `src/types/*`, `src/providers/*`, `App.tsx`, `main.tsx`, `services/price/explorer/notifications`, `backend/src/db/*`, `contracts/scripts/*`.

## Notable

- No CI, no test suite, no codegen.
- `tsc -b` (project references) used for type-checking.
- React 19 + TypeScript 6.
- Build warnings (`INVALID_ANNOTATION`, chunk size) are from third-party packages — safe to ignore.
- Privy bundle is large (PWA workbox limit increased to 4 MB).
- TON wallet kept independent — Privy doesn't support TON.
