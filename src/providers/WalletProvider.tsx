import type { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import { wagmiConfig } from '../config/wagmi'
import { solanaWallets, solanaEndpoint } from '../config/solana'
import { tonConnectManifestUrl } from '../config/ton'

const queryClient = new QueryClient()

export default function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <TonConnectUIProvider manifestUrl={tonConnectManifestUrl}>
      <ConnectionProvider endpoint={solanaEndpoint}>
        <SolanaWalletProvider wallets={solanaWallets} autoConnect>
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          </WagmiProvider>
        </SolanaWalletProvider>
      </ConnectionProvider>
    </TonConnectUIProvider>
  )
}
