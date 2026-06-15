import type { ReactNode } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'
import { tonConnectManifestUrl } from '../config/ton'
import { solanaEndpoint } from '../config/solana'

export default function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <TonConnectUIProvider manifestUrl={tonConnectManifestUrl}>
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID || ''}
        config={{
          appearance: { theme: 'dark' },
          embeddedWallets: {
            ethereum: { createOnLogin: 'all-users' },
            solana: { createOnLogin: 'all-users' },
          },
          solana: {
            rpcs: {
              'solana:mainnet': {
                rpc: createSolanaRpc(solanaEndpoint),
                rpcSubscriptions: createSolanaRpcSubscriptions(
                  solanaEndpoint.replace('https://', 'wss://')
                ),
              },
            },
          },
        }}
      >
        {children}
      </PrivyProvider>
    </TonConnectUIProvider>
  )
}
