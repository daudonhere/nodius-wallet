import { useState } from 'react'
import { useAccount, useSendTransaction } from 'wagmi'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react'
import { Connection, Transaction as SolanaTx } from '@solana/web3.js'
import { transferSolana, transferTON } from '../services/transfer'
import { submitRelayTx, submitMetaTx, getNonce, getRelayInfo } from '../services/relay'
import { getAddress } from 'viem'
import { notifyTxSent } from '../services/notifications'
import { useSettingsStore } from '../stores/settingsStore'

type TransferState = 'idle' | 'signing' | 'broadcasting' | 'success' | 'error'

export function useTransfer() {
  const [state, setState] = useState<TransferState>('idle')
  const [txHash, setTxHash] = useState<string>('')
  const [error, setError] = useState<string>('')
  const gasFeeRouting = useSettingsStore((s) => s.gasFeeRouting)

  const { address: evmAddress, chainId } = useAccount()
  const { sendTransactionAsync } = useSendTransaction()
  const solanaWallet = useSolanaWallet()
  const tonAddress = useTonAddress()
  const [tonUI] = useTonConnectUI()

  const sendEVM = async (to: string, amount: string) => {
    if (!evmAddress || !sendTransactionAsync) {
      setState('error'); setError('EVM wallet not connected'); return
    }

    try {
      setState('signing')

      if (gasFeeRouting && chainId) {
        const target = getAddress(to.trim())
        const value = BigInt(Math.floor(parseFloat(amount) * 1e18))

        const [nonceData, relayInfo] = await Promise.all([
          getNonce(evmAddress, chainId),
          getRelayInfo(chainId),
        ])
        const nonce = nonceData?.nonce ?? 0
        const contractAddress = relayInfo?.contractAddress
        if (!contractAddress) { setState('error'); setError('Relay contract not available on this chain'); return }
        const deadline = Math.floor(Date.now() / 1000) + 3600

        const provider = window.ethereum
        if (!provider) { setState('error'); setError('MetaMask not detected'); return }

        const signature = await provider.request({
          method: 'eth_signTypedData_v4',
          params: [evmAddress, {
            domain: {
              name: 'NodiusRelay',
              version: '1',
              chainId,
              verifyingContract: contractAddress,
            },
            types: {
              EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
              ],
              Execute: [
                { name: 'target', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'data', type: 'bytes' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
              ],
            },
            primaryType: 'Execute',
            message: {
              target,
              value: '0x' + value.toString(16),
              data: '0x',
              nonce: '0x' + BigInt(nonce).toString(16),
              deadline: '0x' + BigInt(deadline).toString(16),
            },
          }],
        })

        setState('broadcasting')
        const result = await submitMetaTx({
          walletId: evmAddress,
          source: 'evm',
          chainId,
          target,
          value: value.toString(),
          data: '0x',
          nonce,
          deadline,
          signature,
        })
        if (result.txHash) {
          setTxHash(result.txHash)
          setState('success')
          if (useSettingsStore.getState().pushNotifications) notifyTxSent(result.txHash, 'EVM')
        } else {
          setState('error'); setError('Relay did not return tx hash')
        }
      } else {
        setState('broadcasting')
        const hash = await sendTransactionAsync({
          to: getAddress(to.trim()),
          value: BigInt(Math.floor(parseFloat(amount) * 1e18)),
        })
        setTxHash(hash)
        setState('success')
        if (useSettingsStore.getState().pushNotifications) notifyTxSent(hash, 'EVM')
      }
    } catch (e: any) {
      const msg = e?.message || e?.toString() || 'Unknown error'
      console.error('[useTransfer] EVM error:', msg)
      setState('error')
      setError(msg)
    }
  }

  const sendSolana = async (to: string, amount: string) => {
    if (!solanaWallet.publicKey || !solanaWallet.signTransaction) throw new Error('Solana wallet not connected')
    setState('signing')

    const conn = new Connection(import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com')

    if (gasFeeRouting) {
      const lamports = Math.floor(parseFloat(amount) * 1e9)
      const { SystemProgram } = await import('@solana/web3.js')
      const ix = SystemProgram.transfer({
        fromPubkey: solanaWallet.publicKey,
        toPubkey: to as any,
        lamports,
      })
      const blockhash = await conn.getLatestBlockhash()
      const tx = new SolanaTx({
        feePayer: solanaWallet.publicKey,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      }).add(ix)
      const signed = await solanaWallet.signTransaction(tx)
      const serialized = Array.from(signed.serialize()).map(b => b.toString(16).padStart(2, '0')).join('')
      setState('broadcasting')
      const result = await submitRelayTx({
        walletId: solanaWallet.publicKey.toBase58(),
        source: 'solana',
        chainId: 900,
        signedTx: serialized,
      })
      if (result.txHash) {
        setTxHash(result.txHash)
        setState('success')
      } else {
        throw new Error('Relay did not return tx hash')
      }
    } else {
      const hash = await transferSolana(
        solanaWallet.publicKey, to as any, amount, conn, solanaWallet.signTransaction
      )
      setTxHash(hash)
      setState('success')
      if (useSettingsStore.getState().pushNotifications) notifyTxSent(hash, 'Solana')
    }
  }

  const sendTON = async (to: string, amount: string) => {
    if (!tonAddress) throw new Error('TON wallet not connected')
    setState('signing')
    const hash = await transferTON(amount, to, (tx) => tonUI.sendTransaction(tx))
    setTxHash(hash)
    setState('success')
    if (useSettingsStore.getState().pushNotifications) notifyTxSent(hash, 'TON')
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
