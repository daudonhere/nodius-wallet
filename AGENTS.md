# Nodius Wallet

Multi-chain aggregator wallet — unified interface for EVM, Solana, TON wallets (MetaMask, Phantom, TonKeeper, etc.) with gas-free relayer. React 19 + Vite, TypeScript strict.

## Commands

| Command | What |
|---------|------|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | Vite preview of built app |
| `npm run lint` | `tsc -b --noEmit` (type-check only) |

Order: `lint -> build` (no test suite exists).

## Architecture

- **SPA** — single-page app, Vite at root, entry at `src/main.tsx`.
- **Entry**: `index.html` → `src/main.tsx` → `src/App.tsx`.
- **PWA**: Service worker via `vite-plugin-pwa` (auto-update, Workbox precache). Icons at `public/pwa-icon.svg`. Manifest registered on build.
- **Routing**: React Router v6 (`react-router-dom`). Pages in `src/pages/`. Layout with `BottomNavigation` in `src/components/`.
- **Styling**: Tailwind CSS v4 with custom theme (`neon`, `darkbg`, `surface`, `surfaceLight`). `Plus Jakarta Sans` + `Space Grotesk` fonts.
- **Icons**: `lucide-react` package (not iconify CDN).
- **State**: Zustand store (wallet connections, balances, preferences). Persisted via `zustand/middleware` (`nodius-settings` key).
- **Backend**: Hono + TypeScript, SQLite via Drizzle ORM (initialized, not yet running).

## Wallet Providers

App entry (`main.tsx`) wraps with `WalletProvider` which nests:
```
TonConnectUIProvider → Solana ConnectionProvider + WalletProvider → WagmiProvider → QueryClientProvider
```

## Project Structure

```
src/
├── config/           wagmi, solana, ton provider configs
├── components/       Shared UI components (NeonButton, TokenSelectButton, SegmentedControl, QuickAmount, AddressBookModal)
├── hooks/            useTransfer, useBalances, useWalletConnection
├── pages/            Home, Swap, Bridge, Transfer, History, Wallet, Settings, Trending
├── providers/        WalletProvider (nested chain providers)
├── services/         API integrations (price/CoinGecko, transfer, swap/0x+Jupiter, bridge/LI.FI, notifications)
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

## Pages & Status

All pages ✅ functional.

| Route | Data Source |
|-------|-------------|
| `/home` | Connected wallets + CoinGecko prices (auto-refresh 30s) |
| `/wallet` | wagmi/Solana/TON connection state |
| `/transfer` | wagmi sendTransaction + relay routing (gas-free toggle) |
| `/swap` | 0x API quote + wagmi sendTransaction + relay routing |
| `/trending` | CoinGecko API via useBalances |
| `/settings` | settingsStore (persisted) |
| `/history` | Etherscan + Solscan API (auto-refresh 60s) |
| `/bridge` | LI.FI quote API + chain selector modal |

## Services Layer

All services ✅ connected.

| File | Integration |
|------|-------------|
| `price.ts` | CoinGecko `/simple/price` |
| `transfer.ts` | viem, Solana Web3.js, TON Connect |
| `swap.ts` | 0x API `/swap/v1/quote` + Jupiter `/quote` |
| `bridge.ts` | LI.FI `/quote` + `/status` |
| `explorer.ts` | Etherscan + Solscan API |
| `relay.ts` | Backend relayer client (raw + meta-tx) |
| `notifications.ts` | Browser Notification API (tx status, price alerts) |

## Env Variables

### Root `.env` (frontend)

| Variable | Cara Dapat | Contoh |
|----------|-----------|--------|
| `VITE_WALLETCONNECT_PROJECT_ID` | Daftar di https://cloud.reown.com (free) | `abc123...` |
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

### Cara Export Private Key dari MetaMask

1. Buka MetaMask → klik ⋮ (pojok kanan atas) → **Account details**
2. Klik **Export Private Key**
3. Masukkan password MetaMask
4. Copy private key (mulai dengan `0x` + 64 karakter hex)
5. Paste ke file `.env` yang sesuai

**Catatan**: Private key yang sama bisa dipake buat deployer & relayer. Pastikan wallet punya testnet ETH (Sepolia / Base Sepolia) dari faucet gratis.

### Status Saat Ini

Semua env variable sudah ✅ terisi.

## Status

✅ **Fase 0-3 selesai.** Semua halaman real data, wallet connection multi-chain, backend relayer + queue worker + gas pool monitoring.
✅ **Fase 4.2 selesai.** Address Book — type, Zustand store, modal component, integrated di TransferPage (recipient field) & SettingsPage (manage).
✅ **Fase 4.3 selesai.** Push Notifications — service wrapper (Browser Notification API), tx status alert di useTransfer, price alert system (store + check di useBalances + UI di SettingsPage).
✅ **Fase 4.4 selesai (partial).** Gas Sponsorship Contract (EIP-712) — `contracts/NodiusRelay.sol` deployed to Sepolia & Base Sepolia. Backend endpoints work. Frontend signTypedData flow reaching MetaMask but signature recovers to WRONG address.

## Gas-Free Flow Debug (Fase 4.4)

### Fixed Bugs
1. **`signTypedData` hang/no popup** — was using wagmi `useSignTypedData`/`walletClient.signTypedData`; fixed by using `window.ethereum.request({ method: 'eth_signTypedData_v4' })` directly.
2. **`relayer.ts` missing testnet RPCs** — `CHAIN_RPCS` only had mainnet (1, 137, 42161, 8453). Added Sepolia (11155111) and Base Sepolia (84532).
3. **`getNonce` used wrong source** — was calling `eth_getTransactionCount` (EOA tx nonce) instead of relay contract's `nonces()` mapping. Fixed: `relayContract.ts` now has `getContractNonce()` reading from `NodiusRelay.nonces(wallet)`.
4. **Address format** — Added `getAddress()` for EIP-55 checksum + trim to prevent space/checksum errors.

### Current Bug
- ✅ `signTypedData` produces a signature (MetaMask shows popup, user approves)
- ❌ `ecrecover` recovers to `0x1fc37c84720d5114eaf0d8c5134d3b1607527fd4` instead of user's wallet `0x0Af2D49aA88269Fc584980801c914d61C257bf6a`
- ❌ Contract call reverts ("Execution reverted for an unknown reason")
- The signature IS valid (65 bytes, v=28) but signed by wrong account
- Possible causes:
  1. MetaMask account mismatch — user's MetaMask might have multiple accounts and the first one is used for signing
  2. Typed data DOMAIN/MESSAGE values differ between what's signed and what's computed by backend
  3. `window.ethereum.request` uses the first MetaMask account, not the one `useAccount()` returns

### Next Steps for Debugging
1. Check if user has multiple MetaMask accounts (the Chrome extension shows the currently selected one)
2. Verify `evmAddress` from `useAccount()` matches the MetaMask selected account
3. Try: compare `evmAddress` with `await window.ethereum.request({ method: 'eth_requestAccounts' })` to see if they differ
4. If they differ, log a warning or use the ethers provider request result as the canonical account
5. Consider alternative: instead of `window.ethereum.request`, use `viem`'s `signTypedData` imported directly and create provider via `window.ethereum`

### Contract State (on Sepolia)
- `NodiusRelay` at `0x67f36e0c0bac9c2c92f81e94ec2cd1af07e06ae8`
- Owner/Relayer: `0x0Af2D49aA88269Fc584980801c914d61C257bf6a`
- nonces[user] = 0 (no successful relay yet)
- DOMAIN_SEPARATOR matches between contract and frontend computation
- Type hash matches

## TODO
- [ ] **Debug signature mismatch** — `ecrecover` returns `0x1fc37c...` instead of wallet `0x0Af2D49a...`. Steps:
  - Check `evmAddress` vs `window.ethereum.request({method:'eth_requestAccounts'})`[0] — log both
  - If mismatch, use provider request result as canonical account
  - Alternative: use `viem`'s `createWalletClient` + `signTypedData` via `window.ethereum` transport
  - Alternative: use ethers `BrowserProvider` + `getSigner().signTypedData()`
- [ ] **Check if user has multiple MetaMask accounts** — verify the currently selected one

## Tech Stack

| Layer | Choice | Version |
|-------|--------|---------|
| EVM wallet | wagmi + viem | 3.6 / 2.52 |
| Solana wallet | @solana/wallet-adapter-react | 0.15 |
| TON wallet | @tonconnect/ui-react | latest |
| State management | Zustand | 5.x |
| Backend | Hono (TypeScript) | 4.x |
| DB (MVP) | SQLite via @libsql/client + Drizzle ORM | 0.30 |
| DEX API | 0x (EVM), Jupiter (Solana) | REST |
| Bridge API | LI.FI | REST |
| Price API | CoinGecko | Free tier |

## Fase 4 (next)

Belum didefinisikan. Opsi:
1. **Telegram Mini App** — deploy sebagai Mini App, connect via WalletConnect/TON Connect
2. **Address Book** — ✅ done
3. **Push Notifications** — ✅ done
4. **Gas Sponsorship Contract** — ✅ done

## Relevant Files

- `contracts/contracts/NodiusRelay.sol`: EIP-712 relay contract (execute, nonce, deadline).
- `contracts/scripts/deploy.ts`: Hardhat deploy script (sepolia/base-sepolia).
- `backend/src/relayContract.ts`: Viem wallet client, contract ABI, `executeRelayTx`.
- `backend/src/relayer.ts`: `submitMetaTx` — meta-tx orchestration with retry.
- `backend/src/index.ts`: Endpoints `/relay/meta-submit`, `/relay/info/:chainId`.
- `backend/src/db/schema.ts`: relay_queue extended with relay_type, target, value, calldata, signature, deadline.
- `backend/src/db/index.ts`: Auto-creates tables with new columns on init.
- `src/config/wagmi.ts`: Chains include sepolia + baseSepolia now.
- `src/services/relay.ts`: `submitMetaTx`, `getRelayInfo`, EIP-712 domain & types exports.
- `src/hooks/useTransfer.ts`: Meta-tx flow — `window.ethereum.request({method:'eth_signTypedData_v4'})` + `submitMetaTx` when gas-free ON.

## Notable

- No CI, no test suite, no codegen.
- `tsc -b` (project references) used for type-checking.
- React 19 + TypeScript 6 — verified library compatibility.
- Three Solana adapter dependencies cause long `npm install` times.
- Build warnings (`INVALID_ANNOTATION`, chunk size) are from third-party packages — safe to ignore.
