import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import type { Adapter } from '@solana/wallet-adapter-base'

export const solanaWallets: Adapter[] = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
]

export const solanaEndpoint = clusterApiUrl('mainnet-beta')
