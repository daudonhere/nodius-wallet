import { useState } from 'react'
import { useSendTransaction, useSignTypedData } from '@privy-io/react-auth'
import { useSignAndSendTransaction } from '@privy-io/react-auth/solana'
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react'
import { Connection, Transaction as SolanaTx, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { transferTON } from '../services/transfer'
import { submitRelayTx, submitMetaTx, getNonce, getRelayInfo } from '../services/relay'
import { getAddress } from 'viem'
import { notifyTxSent } from '../services/notifications'
import { useSettingsStore } from '../stores/settingsStore'
import { useWalletConnection } from './useWalletConnection'

type TransferState = 'idle' | 'signing' | 'broadcasting' | 'success' | 'error'

export function useTransfer() {
  const [state, setState] = useState<TransferState>('idle')
  const [txHash, setTxHash] = useState<string>('')
  const [error, setError] = useState<string>('')
  const gasFeeRouting = useSettingsStore((s) => s.gasFeeRouting)

  const { evm, solana } = useWalletConnection()
  const { sendTransaction: privySendTx } = useSendTransaction()
  const { signTypedData } = useSignTypedData()
  const { signAndSendTransaction: solanaSignAndSend } = useSignAndSendTransaction()
  const tonAddress = useTonAddress()
  const [tonUI] = useTonConnectUI()

  const sendEVM = async (to: string, amount: string) => {
    const evmAddress = evm.address
    const chainId = evm.chainId
    if (!evmAddress || !chainId) {
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

        const { signature } = await signTypedData({
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
            value: `0x${value.toString(16)}`,
            data: '0x',
            nonce: `0x${BigInt(nonce).toString(16)}`,
            deadline: `0x${BigInt(deadline).toString(16)}`,
          },
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
        const { hash } = await privySendTx({
          to: getAddress(to.trim()),
          value: BigInt(Math.floor(parseFloat(amount) * 1e18)),
          chainId,
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
    const solAddress = solana.address
    if (!solAddress || !solana.wallet) {
      setState('error'); setError('Solana wallet not connected'); return
    }

    try {
      setState('signing')
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL)
      const conn = new Connection(import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com')

      if (gasFeeRouting) {
        const ix = SystemProgram.transfer({
          fromPubkey: new PublicKey(solAddress),
          toPubkey: new PublicKey(to),
          lamports,
        })
        const blockhash = await conn.getLatestBlockhash()
        const tx = new SolanaTx({
          feePayer: new PublicKey(solAddress),
          blockhash: blockhash.blockhash,
          lastValidBlockHeight: blockhash.lastValidBlockHeight,
        }).add(ix)
        const signed = await solana.wallet.signTransaction({ transaction: tx.serialize() })
        const serialized = Array.from(signed.signedTransaction).map((b) => b.toString(16).padStart(2, '0')).join('')
        setState('broadcasting')
        const result = await submitRelayTx({
          walletId: solAddress,
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
        const ix = SystemProgram.transfer({
          fromPubkey: new PublicKey(solAddress),
          toPubkey: new PublicKey(to),
          lamports,
        })
        const blockhash = await conn.getLatestBlockhash()
        const tx = new SolanaTx({
          feePayer: new PublicKey(solAddress),
          blockhash: blockhash.blockhash,
          lastValidBlockHeight: blockhash.lastValidBlockHeight,
        }).add(ix)
        const { signature } = await solanaSignAndSend({
          transaction: tx.serialize(),
          wallet: solana.wallet,
          chain: 'solana:mainnet',
        })
        setTxHash(Buffer.from(signature).toString('hex'))
        setState('success')
        if (useSettingsStore.getState().pushNotifications) notifyTxSent(Buffer.from(signature).toString('hex'), 'Solana')
      }
    } catch (e: any) {
      const msg = e?.message || e?.toString() || 'Unknown error'
      console.error('[useTransfer] Solana error:', msg)
      setState('error')
      setError(msg)
    }
  }

  const sendTON = async (to: string, amount: string) => {
    if (!tonAddress) { setState('error'); setError('TON wallet not connected'); return }
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
    connected: !!(evm.address || solana.address || tonAddress),
  }
}
