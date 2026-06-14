import { useState } from 'react'
import { useAccount, useSendTransaction } from 'wagmi'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react'
import { Connection } from '@solana/web3.js'
import { transferSolana, transferTON } from '../services/transfer'

type TransferState = 'idle' | 'signing' | 'broadcasting' | 'success' | 'error'

export function useTransfer() {
  const [state, setState] = useState<TransferState>('idle')
  const [txHash, setTxHash] = useState<string>('')
  const [error, setError] = useState<string>('')

  const { address: evmAddress } = useAccount()
  const { sendTransactionAsync } = useSendTransaction()
  const solanaWallet = useSolanaWallet()
  const tonAddress = useTonAddress()
  const [tonUI] = useTonConnectUI()

  const sendEVM = async (to: string, amount: string) => {
    if (!evmAddress || !sendTransactionAsync) throw new Error('EVM wallet not connected')
    setState('signing')
    setState('broadcasting')
    const hash = await sendTransactionAsync({
      to: to as `0x${string}`,
      value: BigExp(amount, 18),
    })
    setTxHash(hash)
    setState('success')
  }

  const sendSolana = async (to: string, amount: string) => {
    if (!solanaWallet.publicKey || !solanaWallet.signTransaction) throw new Error('Solana wallet not connected')
    setState('signing')
    const conn = new Connection(import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com')
    const hash = await transferSolana(solanaWallet.publicKey, to as any, amount, conn, solanaWallet.signTransaction)
    setTxHash(hash)
    setState('success')
  }

  const sendTON = async (to: string, amount: string) => {
    if (!tonAddress) throw new Error('TON wallet not connected')
    setState('signing')
    const hash = await transferTON(amount, to, (tx) => tonUI.sendTransaction(tx))
    setTxHash(hash)
    setState('success')
  }

  const reset = () => {
    setState('idle')
    setTxHash('')
    setError('')
  }

  return {
    state, txHash, error,
    sendEVM, sendSolana, sendTON, reset,
    connected: !!evmAddress || !!solanaWallet.publicKey || !!tonAddress,
  }
}

function BigExp(value: string, decimals: number): bigint {
  const [int, frac = ''] = value.split('.')
  const padded = frac.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(int + padded)
}
