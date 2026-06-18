import { useTonAddress, useTonConnectModal, useTonConnectUI } from '@tonconnect/ui-react'
import { usePrivy, useWallets as useEvmWallets } from '@privy-io/react-auth'
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana'

export function useWalletConnection() {
  const { ready, authenticated, user, login, logout, connectWallet } = usePrivy()
  const { wallets: evmWallets } = useEvmWallets()
  const { wallets: solanaWallets } = useSolanaWallets()
  const tonModal = useTonConnectModal()
  const [tonUI] = useTonConnectUI()
  const tonAddress = useTonAddress()

  const evmWallet = evmWallets[0]
  const solanaWallet = solanaWallets[0]

  const parseChainId = (caip2?: string): number | undefined => {
    if (!caip2) return undefined
    const parts = caip2.split(':')
    return parts[1] ? Number(parts[1]) : undefined
  }

  return {
    ready,
    authenticated,
    user,
    login,
    logout,
    connectWallet,
    evm: {
      address: evmWallet?.address,
      connected: !!evmWallet,
      chainId: parseChainId(evmWallet?.chainId),
      wallet: evmWallet,
      disconnect: logout,
    },
    solana: {
      address: solanaWallet?.address,
      connected: !!solanaWallet,
      wallet: solanaWallet,
      disconnect: logout,
      signAndSend: solanaWallet?.signAndSendTransaction.bind(solanaWallet),
    },
    ton: {
      address: tonAddress,
      connected: !!tonAddress,
      connect: () => tonModal.open(),
      disconnect: () => tonUI.disconnect(),
    },
  }
}
