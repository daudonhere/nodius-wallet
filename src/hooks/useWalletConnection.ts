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

  const getWalletClientType = (wallet: unknown) => typeof wallet === 'object' && wallet !== null && 'walletClientType' in wallet ? String(wallet.walletClientType) : ''
  const isPrivyWallet = (wallet: unknown) => getWalletClientType(wallet) === 'privy'

  const privyEvmWallet = evmWallets.find(isPrivyWallet)
  const externalEvmWallet = evmWallets.find((wallet) => !isPrivyWallet(wallet))
  const evmWallet = externalEvmWallet || privyEvmWallet
  const privySolanaWallet = solanaWallets.find(isPrivyWallet)
  const externalSolanaWallet = solanaWallets.find((wallet) => !isPrivyWallet(wallet))
  const solanaWallet = externalSolanaWallet || privySolanaWallet

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
    privy: {
      evmAddress: privyEvmWallet?.address,
      solanaAddress: privySolanaWallet?.address,
      primaryAddress: privyEvmWallet?.address || privySolanaWallet?.address,
      connected: !!privyEvmWallet || !!privySolanaWallet,
      evmWallet: privyEvmWallet,
      solanaWallet: privySolanaWallet,
    },
    evm: {
      address: evmWallet?.address,
      externalAddress: externalEvmWallet?.address,
      connected: !!evmWallet,
      externalConnected: !!externalEvmWallet,
      chainId: parseChainId(evmWallet?.chainId),
      wallet: evmWallet,
      externalWallet: externalEvmWallet,
      disconnect: logout,
    },
    solana: {
      address: solanaWallet?.address,
      externalAddress: externalSolanaWallet?.address,
      connected: !!solanaWallet,
      externalConnected: !!externalSolanaWallet,
      wallet: solanaWallet,
      externalWallet: externalSolanaWallet,
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
