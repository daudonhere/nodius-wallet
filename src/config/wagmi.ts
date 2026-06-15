import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, polygon, arbitrum, base, baseSepolia } from 'wagmi/chains'
import { walletConnect, injected, metaMask } from 'wagmi/connectors'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, polygon, arbitrum, base, baseSepolia],
  connectors: [
    metaMask(),
    walletConnect({ projectId }),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})
