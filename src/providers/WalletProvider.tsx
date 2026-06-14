import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Adapter } from '@solana/wallet-adapter-base'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import { wagmiConfig } from '../config/wagmi'
import { solanaEndpoint } from '../config/solana'
import { tonConnectManifestUrl } from '../config/ton'

const queryClient = new QueryClient()

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [solanaWallets, setSolanaWallets] = useState<Adapter[]>([])

  useEffect(() => {
    (async () => {
      try {
        const { PhantomWalletAdapter, SolflareWalletAdapter } = await import('@solana/wallet-adapter-wallets')
        setSolanaWallets([new PhantomWalletAdapter(), new SolflareWalletAdapter()])
      } catch {
        console.warn('Solana wallet adapters failed to load — running without Solana wallets')
      }
    })()
  }, [])

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
