import { useWallet as useSolana } from '@solana/wallet-adapter-react'
import { useTonAddress, useTonConnectModal } from '@tonconnect/ui-react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useWalletStore } from '../stores/walletStore'

export function useWalletConnection() {
  const store = useWalletStore()

  const { address: evmAddress, isConnected: evmConnected, chainId } = useAccount()
  const { connect: evmConnect, connectors } = useConnect()
  const { disconnect: evmDisconnect } = useDisconnect()

  const { connected: solanaConnected, publicKey: solanaKey, disconnect: solanaDisconnect, select: solanaSelect, wallets: solanaWallets } = useSolana()
  const tonModal = useTonConnectModal()
  const tonAddress = useTonAddress()

  return {
    evm: { address: evmAddress, connected: evmConnected, chainId, connect: evmConnect, connectors, disconnect: evmDisconnect },
    solana: { connected: solanaConnected, publicKey: solanaKey, disconnect: solanaDisconnect, select: solanaSelect, wallets: solanaWallets },
    ton: { address: tonAddress, connected: !!tonAddress, connect: () => tonModal.open(), disconnect: () => tonModal.close() },
    store,
  }
}
