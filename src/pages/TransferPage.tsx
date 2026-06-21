import { useEffect, useMemo, useState } from 'react'
import { VersionedTransaction } from '@solana/web3.js'
import { ArrowLeft, QrCode, BookUser, Zap, Loader2, CheckCircle2, ChevronDown, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTonAddress } from '@tonconnect/ui-react'
import { useSendTransaction, useSignTypedData } from '@privy-io/react-auth'
import { useSignTransaction } from '@privy-io/react-auth/solana'
import { useWalletConnection } from '../hooks/useWalletConnection'
import BottomNavigation from '../components/BottomNavigation'
import NeonButton from '../components/NeonButton'
import QuickAmount from '../components/QuickAmount'
import AddressBookModal from '../components/AddressBookModal'
import QrScannerModal from '../components/QrScannerModal'
import { useTransfer } from '../hooks/useTransfer'
import { useBalances } from '../hooks/useBalances'
import { useSettingsStore } from '../stores/settingsStore'
import { getBridgeQuote, getBridgeStatus, resolveDestToken, type BridgeQuote } from '../services/bridge'
import { DEBRIDGE_SOLANA_CHAIN_ID, DEBRIDGE_TON_CHAIN_ID, getDebridgeQuote as getDebridgeQuoteApi, getDebridgeTx, getDebridgeStatus, type DebridgeQuoteResult } from '../services/debridge'
import { submitRelayTx } from '../services/relay'
import { notifyTxConfirmed, notifyTxFailed } from '../services/notifications'

const CHAIN_ICONS: Record<string, string> = {
  Ethereum: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  Base: 'https://cryptologos.cc/logos/base-base-logo.svg',
  Polygon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
  Arbitrum: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
  Solana: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  TON: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg',
}

const TOKEN_ICONS: Record<string, string> = {
  ETH: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
  USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.svg',
  DAI: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg',
  WBTC: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.svg',
  SOL: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  TON: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg',
  JUP: 'https://cryptologos.cc/logos/jupiter-jup-logo.svg',
  BONK: 'https://cryptologos.cc/logos/bonk-bonk-logo.svg',
}

const POPULAR_CHAINS = ['Ethereum', 'Base', 'Polygon', 'Arbitrum', 'Solana', 'TON'] as const

const DEST_TOKENS: Record<string, { symbol: string; name: string }[]> = {
  Ethereum: [
    { symbol: 'ETH', name: 'Ether' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'DAI', name: 'Dai' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
  ],
  Base: [
    { symbol: 'ETH', name: 'Ether' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'DAI', name: 'Dai' },
  ],
  Polygon: [
    { symbol: 'POL', name: 'Polygon' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'DAI', name: 'Dai' },
  ],
  Arbitrum: [
    { symbol: 'ETH', name: 'Ether' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'DAI', name: 'Dai' },
  ],
  Solana: [
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'JUP', name: 'Jupiter' },
    { symbol: 'BONK', name: 'Bonk' },
  ],
  TON: [
    { symbol: 'TON', name: 'Toncoin' },
    { symbol: 'USDT', name: 'Tether' },
  ],
}

type ChainType = 'evm' | 'solana' | 'ton'

function getChainType(chain: string): ChainType {
  if (chain === 'Solana') return 'solana'
  if (chain === 'TON') return 'ton'
  return 'evm'
}

function chainNameToChainId(name: string): number {
  const map: Record<string, number> = {
    Ethereum: 1,
    Base: 8453,
    Polygon: 137,
    Arbitrum: 42161,
    Solana: DEBRIDGE_SOLANA_CHAIN_ID,
    TON: DEBRIDGE_TON_CHAIN_ID,
  }
  return map[name] || 0
}

function isEVMChainId(id: number): boolean {
  return id > 0 && id !== DEBRIDGE_SOLANA_CHAIN_ID
}

interface TransferToken {
  symbol: string
  name: string
  icon: string
  address: string
  balance: string
  chainName: string
  chainIcon: string
  decimals: number
}

export default function TransferPage() {
  const navigate = useNavigate()
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [showAddressBook, setShowAddressBook] = useState(false)
  const [sourceTokenPickerOpen, setSourceTokenPickerOpen] = useState(false)
  const [closingTokenPicker, setClosingTokenPicker] = useState(false)
  const [destTokenPickerOpen, setDestTokenPickerOpen] = useState(false)
  const [chainPickerOpen, setChainPickerOpen] = useState(false)
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [bridgeQuote, setBridgeQuote] = useState<BridgeQuote | null>(null)
  const [debridgeQuote, setDebridgeQuote] = useState<DebridgeQuoteResult | null>(null)

  const { evm, solana } = useWalletConnection()
  const tonAddress = useTonAddress()
  const { tokens, prices, isLoadingAssets } = useBalances()
  const transfer = useTransfer()
  const { sendTransaction } = useSendTransaction()
  const { signTypedData } = useSignTypedData()
  const { signTransaction: solanaSign } = useSignTransaction()
  const gasFeeRouting = useSettingsStore((s) => s.gasFeeRouting)
  const setGasFeeRouting = useSettingsStore((s) => s.setGasFeeRouting)

  const [destNetwork, setDestNetwork] = useState<string>('Ethereum')
  const [destToken, setDestToken] = useState<{ symbol: string; name: string }>({ symbol: '', name: '' })

  const sourceTokens = useMemo<TransferToken[]>(() => tokens
    .filter((t) => t.chainName && t.address && t.decimals != null && Number(t.balance) > 0)
    .map((t) => ({
      symbol: t.symbol,
      name: t.symbol,
      icon: t.icon || CHAIN_ICONS[t.chainName || ''] || CHAIN_ICONS.Ethereum,
      address: t.address || '',
      balance: t.balance,
      chainName: t.chainName || 'Ethereum',
      chainIcon: CHAIN_ICONS[t.chainName || 'Ethereum'] || CHAIN_ICONS.Ethereum,
      decimals: t.decimals || 18,
    })), [tokens])

  const [selectedSourceToken, setSelectedSourceToken] = useState<TransferToken | null>(null)

  useEffect(() => {
    if (sourceTokens.length > 0 && (!selectedSourceToken || !sourceTokens.find((t) => t.address === selectedSourceToken.address && t.chainName === selectedSourceToken.chainName))) {
      setSelectedSourceToken(sourceTokens[0])
    }
  }, [sourceTokens, selectedSourceToken])

  useEffect(() => {
    const tokens = DEST_TOKENS[destNetwork]
    if (tokens && tokens.length > 0 && !tokens.find((t) => t.symbol === destToken.symbol)) {
      setDestToken(tokens[0])
    }
  }, [destNetwork, destToken.symbol])

  const currentSourceToken = selectedSourceToken || (sourceTokens.length > 0 ? sourceTokens[0] : {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: CHAIN_ICONS.Ethereum,
    address: '',
    balance: '0',
    chainName: 'Ethereum',
    chainIcon: CHAIN_ICONS.Ethereum,
    decimals: 18,
  })

  const sourceChainType = getChainType(currentSourceToken.chainName)
  const isConnected = sourceChainType === 'evm' ? evm.connected
    : sourceChainType === 'solana' ? solana.connected
    : !!tonAddress

  const fromPrice = prices[currentSourceToken.symbol]?.price ?? 0
  const fromUsd = amount && fromPrice ? `$${(Number(amount) * fromPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
  const amountExceedsBalance = Number(amount || '0') > Number(currentSourceToken.balance || '0')
  const isInitialLoading = isLoadingAssets

  const isCrossTransfer = currentSourceToken.chainName !== destNetwork || destToken.symbol !== currentSourceToken.symbol
  const gasFreeAvailable = gasFeeRouting && sourceChainType === 'evm'
  const quoteDisplay = bridgeQuote || debridgeQuote

  const fetchQuote = async () => {
    if (!address || !amount || !currentSourceToken.address || !destToken.symbol) return
    setLoadingQuote(true)
    try {
      const fCid = chainNameToChainId(currentSourceToken.chainName)
      const tCid = chainNameToChainId(destNetwork)
      const amt = (Number(amount) * 10 ** currentSourceToken.decimals).toFixed(0)

      if (isEVMChainId(fCid) && isEVMChainId(tCid)) {
        const destAddr = await resolveDestToken(destToken.symbol, currentSourceToken.address, tCid)
        if (destAddr) {
          const q = await getBridgeQuote(fCid, tCid, currentSourceToken.address, destAddr.address, amt, evm.address || '', address)
          if (q) { setBridgeQuote(q); setDebridgeQuote(null); setLoadingQuote(false); return }
        }
      }
      if (isEVMChainId(fCid) && !isEVMChainId(tCid)) {
        const dq = await getDebridgeQuoteApi(fCid, tCid, currentSourceToken.address, tCid, amt, currentSourceToken.decimals, currentSourceToken.symbol)
        if (dq) { setDebridgeQuote(dq); setBridgeQuote(null); setLoadingQuote(false); return }
      }
      if (fCid === DEBRIDGE_SOLANA_CHAIN_ID && isEVMChainId(tCid)) {
        const dq = await getDebridgeQuoteApi(fCid, tCid, currentSourceToken.address, tCid, amt, currentSourceToken.decimals, currentSourceToken.symbol)
        if (dq) { setDebridgeQuote(dq); setBridgeQuote(null); setLoadingQuote(false); return }
      }
      if (fCid === DEBRIDGE_TON_CHAIN_ID && isEVMChainId(tCid)) {
        const dq = await getDebridgeQuoteApi(fCid, tCid, currentSourceToken.address, tCid, amt, currentSourceToken.decimals, currentSourceToken.symbol)
        if (dq) { setDebridgeQuote(dq); setBridgeQuote(null); setLoadingQuote(false); return }
      }
      setBridgeQuote(null)
      setDebridgeQuote(null)
    } catch {
      setBridgeQuote(null)
      setDebridgeQuote(null)
    }
    setLoadingQuote(false)
  }

  const handleTransfer = async () => {
    if (!address || !amount || !currentSourceToken.address) return

    const fCid = chainNameToChainId(currentSourceToken.chainName)
    const tCid = chainNameToChainId(destNetwork)
    const isCross = isCrossTransfer

    if (!isCross) {
      try {
        if (sourceChainType === 'evm') await transfer.sendEVM(address, amount)
        else if (sourceChainType === 'solana') await transfer.sendSolana(address, amount)
        else await transfer.sendTON(address, amount)
      } catch {}
      return
    }

    if (!bridgeQuote && !debridgeQuote) { fetchQuote(); return }

    setLoadingQuote(true)
    try {
      const amt = (Number(amount) * 10 ** currentSourceToken.decimals).toFixed(0)

      if (debridgeQuote) {
        if (fCid === DEBRIDGE_SOLANA_CHAIN_ID) {
          if (!solana.address || !solana.wallet) { setLoadingQuote(false); return }
          const txRes = await getDebridgeTx(debridgeQuote, fCid, tCid, currentSourceToken.address, tCid, amt, currentSourceToken.decimals, currentSourceToken.symbol, solana.address, address)
          if (!txRes?.solanaTxBase64) { setLoadingQuote(false); return }
          const txBytes = Uint8Array.from(atob(txRes.solanaTxBase64), (c) => c.charCodeAt(0))
          const transaction = VersionedTransaction.deserialize(txBytes)
          const signedResult: any = await solanaSign({ transaction: transaction.serialize(), wallet: solana.wallet as any, chain: 'solana:mainnet' })
          const signedBytes: Uint8Array = signedResult.signedTransaction ?? signedResult.transaction ?? signedResult
          const serialized = Buffer.from(signedBytes).toString('hex')
          await submitRelayTx({ walletId: solana.address, source: 'solana', chainId: 900, signedTx: serialized })
          if (useSettingsStore.getState().pushNotifications && txRes.orderId) {
            setPendingCrossInfo({ orderId: txRes.orderId, type: 'debridge' })
          }
          transfer.reset()
          setLoadingQuote(false); setBridgeQuote(null); setDebridgeQuote(null)
          return
        }
        if (fCid === DEBRIDGE_TON_CHAIN_ID) {
          transfer.reset()
          setLoadingQuote(false); setBridgeQuote(null); setDebridgeQuote(null)
          return
        }
        if (!evm.address) { setLoadingQuote(false); return }
        const txRes = await getDebridgeTx(debridgeQuote, fCid, tCid, currentSourceToken.address, tCid, amt, currentSourceToken.decimals, currentSourceToken.symbol, evm.address, address)
        if (!txRes?.evmTx) { setLoadingQuote(false); return }
        if (gasFreeAvailable && evm.chainId) {
          const { signature } = await signTypedData({
            domain: { name: 'NodiusRelay', version: '1', chainId: evm.chainId, verifyingContract: txRes.evmTx.to as `0x${string}` },
            types: {
              EIP712Domain: [{ name: 'name', type: 'string' }, { name: 'version', type: 'string' }, { name: 'chainId', type: 'uint256' }, { name: 'verifyingContract', type: 'address' }],
              Execute: [{ name: 'target', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }],
            },
            primaryType: 'Execute',
            message: {
              target: txRes.evmTx.to as `0x${string}`,
              value: `0x${BigInt(txRes.evmTx.value || '0').toString(16)}`,
              data: txRes.evmTx.data as `0x${string}`,
              nonce: '0x0',
              deadline: `0x${BigInt(Math.floor(Date.now() / 1000) + 3600).toString(16)}`,
            },
          })
          await submitRelayTx({ walletId: evm.address, source: 'evm', chainId: evm.chainId, signedTx: signature })
        } else {
          await sendTransaction({ to: txRes.evmTx.to as `0x${string}`, data: txRes.evmTx.data as `0x${string}`, value: BigInt(txRes.evmTx.value || '0') })
        }
        if (useSettingsStore.getState().pushNotifications && txRes.orderId) {
          setPendingCrossInfo({ orderId: txRes.orderId, type: 'debridge' })
        }
        transfer.reset()
        setLoadingQuote(false); setBridgeQuote(null); setDebridgeQuote(null)
        return
      }

      if (bridgeQuote?.transactionRequest) {
        if (!evm.address || !evm.chainId) return
        let lifiTxHash = ''
        if (gasFreeAvailable) {
          const { signature } = await signTypedData({
            domain: { name: 'NodiusRelay', version: '1', chainId: evm.chainId, verifyingContract: bridgeQuote.transactionRequest.to as `0x${string}` },
            types: {
              EIP712Domain: [{ name: 'name', type: 'string' }, { name: 'version', type: 'string' }, { name: 'chainId', type: 'uint256' }, { name: 'verifyingContract', type: 'address' }],
              Execute: [{ name: 'target', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }],
            },
            primaryType: 'Execute',
            message: {
              target: bridgeQuote.transactionRequest.to as `0x${string}`,
              value: `0x${BigInt(bridgeQuote.transactionRequest.value || '0').toString(16)}`,
              data: bridgeQuote.transactionRequest.data as `0x${string}`,
              nonce: '0x0',
              deadline: `0x${BigInt(Math.floor(Date.now() / 1000) + 3600).toString(16)}`,
            },
          })
          const result = await submitRelayTx({ walletId: evm.address, source: 'evm', chainId: evm.chainId, signedTx: signature })
          lifiTxHash = result.txHash || ''
        } else {
          const { hash } = await sendTransaction({ to: bridgeQuote.transactionRequest.to as `0x${string}`, data: bridgeQuote.transactionRequest.data as `0x${string}`, value: BigInt(bridgeQuote.transactionRequest.value || '0'), chainId: bridgeQuote.transactionRequest.chainId })
          lifiTxHash = hash
        }
        if (lifiTxHash && useSettingsStore.getState().pushNotifications) {
          setPendingCrossInfo({ txHash: lifiTxHash, tool: bridgeQuote.tool || 'lifi', type: 'lifi' })
        }
        transfer.reset()
        setLoadingQuote(false); setBridgeQuote(null); setDebridgeQuote(null)
      }
    } catch (e: any) {
      throw e
    }
    setLoadingQuote(false)
  }

  useEffect(() => {
    if (isCrossTransfer && address && amount && currentSourceToken.address && destToken.symbol && !loadingQuote && !quoteDisplay) {
      const timer = setTimeout(() => fetchQuote(), 500)
      return () => clearTimeout(timer)
    }
  }, [isCrossTransfer, address, amount, currentSourceToken.address, currentSourceToken.symbol, currentSourceToken.chainName, destToken.symbol, destNetwork])

  const [pendingCrossInfo, setPendingCrossInfo] = useState<{
    txHash?: string; orderId?: string; tool?: string; type: 'lifi' | 'debridge'
  } | null>(null)

  useEffect(() => {
    if (!pendingCrossInfo) return
    const poll = async () => {
      try {
        let resolved = false
        if (pendingCrossInfo.type === 'lifi' && pendingCrossInfo.txHash && pendingCrossInfo.tool) {
          const status = await getBridgeStatus(pendingCrossInfo.tool, pendingCrossInfo.txHash)
          if (status === 'DONE' || status === 'completed') {
            notifyTxConfirmed(pendingCrossInfo.txHash, 'LI.FI')
            resolved = true
          } else if (status === 'FAILED' || status?.toLowerCase().includes('fail')) {
            notifyTxFailed(pendingCrossInfo.txHash, 'LI.FI')
            resolved = true
          }
        }
        if (pendingCrossInfo.type === 'debridge' && pendingCrossInfo.orderId) {
          const status = await getDebridgeStatus(pendingCrossInfo.orderId)
          if (status && (status.includes('Fulfilled') || status.includes('Sent') || status === 'completed')) {
            notifyTxConfirmed(pendingCrossInfo.orderId, 'deBridge')
            resolved = true
          } else if (status && (status.includes('Failed') || status.includes('Cancelled'))) {
            notifyTxFailed(pendingCrossInfo.orderId, 'deBridge')
            resolved = true
          }
        }
        if (resolved) setPendingCrossInfo(null)
      } catch {}
    }
    const id = setInterval(poll, 15000)
    poll()
    return () => clearInterval(id)
  }, [pendingCrossInfo])

  const handleQrScan = (scanned: string) => {
    if (scanned?.trim()) setAddress(scanned.trim())
    setShowQrScanner(false)
  }

  const handleAmountChange = (value: string) => {
    if (!/^\d*\.?\d*$/.test(value)) return
    setAmount(value)
  }

  const closeSourceTokenPicker = () => {
    setClosingTokenPicker(true)
    window.setTimeout(() => {
      setSourceTokenPickerOpen(false)
      setClosingTokenPicker(false)
    }, 180)
  }

  const closeDestTokenPicker = () => {
    setClosingTokenPicker(true)
    window.setTimeout(() => {
      setDestTokenPickerOpen(false)
      setClosingTokenPicker(false)
    }, 180)
  }

  const SkeletonBlock = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded-full bg-surfaceLight/70 ${className}`} />
  )

  return (
    <div className="w-full h-screen flex flex-col bg-darkbg text-white font-sans overflow-hidden relative selection:bg-neon selection:text-black">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-neon/5 rounded-full blur-[100px] pointer-events-none" />

      <header className="shrink-0 pt-14 px-5 pb-6 flex justify-between items-center z-20 bg-darkbg/85 backdrop-blur-[12px] border-b border-white/5" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold tracking-wide">Transfer</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 z-10 px-5">
        {transfer.state === 'success' ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-neon/10 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-neon" />
            </div>
            <h2 className="text-xl font-bold">Transfer Sent</h2>
            <p className="text-zinc-400 text-sm font-mono break-all text-center max-w-xs">{transfer.txHash}</p>
            <NeonButton onClick={() => { transfer.reset(); navigate(-1) }}>Done</NeonButton>
          </div>
        ) : isInitialLoading ? (
          <div className="flex flex-col gap-5 mt-2">
            <div className="bg-surface border border-surfaceLight rounded-[20px] p-4">
              <SkeletonBlock className="w-24 h-4 rounded-md mb-3" />
              <SkeletonBlock className="w-full h-11 rounded-xl" />
            </div>
            <div className="bg-surface border border-surfaceLight rounded-[28px] p-2 shadow-lg">
              <div className="bg-[#0a0a0a] rounded-[24px] p-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <SkeletonBlock className="w-14 h-4 rounded-md" />
                  <SkeletonBlock className="w-20 h-4 rounded-md" />
                </div>
                <div className="flex justify-between items-center">
                  <SkeletonBlock className="w-28 h-9 rounded-xl" />
                  <SkeletonBlock className="w-24 h-11 rounded-full" />
                </div>
                <div className="mt-2"><SkeletonBlock className="w-20 h-4 rounded-md" /></div>
              </div>
            </div>
            <div className="bg-surface/60 border border-surfaceLight rounded-[20px] p-4">
              <div className="flex justify-between items-center mb-3"><SkeletonBlock className="w-16 h-4 rounded-md" /><SkeletonBlock className="w-32 h-4 rounded-md" /></div>
              <div className="flex justify-between items-center mb-3"><SkeletonBlock className="w-16 h-4 rounded-md" /><SkeletonBlock className="w-20 h-4 rounded-md" /></div>
              <div className="flex justify-between items-center"><SkeletonBlock className="w-12 h-4 rounded-md" /><SkeletonBlock className="w-10 h-4 rounded-md" /></div>
            </div>
            <SkeletonBlock className="w-full h-12 rounded-xl" />
          </div>
        ) : (
          <>

            <div className="bg-surface border border-surfaceLight rounded-[28px] p-2 shadow-lg mb-4">
              <div className="bg-[#0a0a0a] rounded-[24px] p-5 pb-6">
                <div className="flex justify-between items-center mb-4 text-sm">
                  <span className="text-zinc-400 font-medium">You send</span>
                  <span className="text-zinc-500 font-mono">Bal: {Number(currentSourceToken.balance).toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="bg-transparent border-none outline-none font-mono text-[26px] font-bold text-white w-[55%] placeholder-zinc-800 tracking-tight"
                  />
                  <button onClick={() => setSourceTokenPickerOpen(true)} className="flex items-center gap-2 bg-surfaceLight hover:bg-surfaceLight/80 transition-colors py-2.5 px-3.5 rounded-full border border-white/5 shadow-sm">
                    <div className="relative">
                      <img src={currentSourceToken.icon} alt={currentSourceToken.symbol} className="w-[22px] h-[22px] rounded-full" />
                      <img src={currentSourceToken.chainIcon} alt={currentSourceToken.chainName} className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-surfaceLight bg-darkbg" />
                    </div>
                    <span className="font-bold text-[15px]">{currentSourceToken.symbol}</span>
                    <ChevronDown size={14} className="text-zinc-400 ml-0.5" />
                  </button>
                </div>
                <div className="mt-1 text-zinc-500 text-[13px] font-mono">{fromUsd || '—'}</div>
                <div className="mt-3">
                  <QuickAmount onSelect={(pct) => {
                    const bal = currentSourceToken.balance
                    if (bal && bal !== '—') {
                      const num = parseFloat(bal) * (pct === 'Max' ? 1 : parseInt(pct) / 100)
                      setAmount(num.toFixed(6))
                    }
                  }} />
                </div>
              </div>
            </div>

            <div className="bg-surface border border-surfaceLight rounded-[28px] p-2 shadow-lg mb-4">
              <div className="bg-[#0a0a0a] rounded-[24px] p-5">
                <div className="flex justify-between items-center mb-4 text-sm">
                  <span className="text-zinc-400 font-medium">To</span>
                </div>
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Enter wallet address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-surface border border-surfaceLight rounded-[20px] py-4 px-4 pr-24 text-sm font-mono text-white placeholder-zinc-600 outline-none focus:border-neon/50 transition-colors"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5">
                    <button onClick={() => setShowQrScanner(true)} className="w-9 h-9 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400 hover:text-neon hover:border-neon/30 transition-all border border-transparent">
                      <QrCode size={16} />
                    </button>
                    <button
                      onClick={() => setShowAddressBook(true)}
                      className="w-9 h-9 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400 hover:text-neon hover:border-neon/30 transition-all border border-transparent"
                    >
                      <BookUser size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-400 font-medium">Network</span>
                  <button
                    onClick={() => setChainPickerOpen(true)}
                    className="flex items-center gap-2 bg-surfaceLight hover:bg-surfaceLight/80 transition-colors py-2 px-3.5 rounded-full border border-white/5 shadow-sm"
                  >
                    <img src={CHAIN_ICONS[destNetwork]} alt={destNetwork} className="w-4 h-4 rounded-full" />
                    <span className="text-xs font-bold">{destNetwork}</span>
                    <ChevronDown size={12} className="text-zinc-400" />
                  </button>
                </div>
                {destToken.symbol && (
                  <div className="flex items-center justify-between pt-2.5 border-t border-surfaceLight/40">
                    <span className="text-xs text-zinc-400 font-medium">Token</span>
                    <button
                      onClick={() => setDestTokenPickerOpen(true)}
                      className="flex items-center gap-2 bg-surface hover:bg-surfaceLight/80 transition-colors py-2 px-3 rounded-full border border-white/5"
                    >
                      <img src={TOKEN_ICONS[destToken.symbol] || CHAIN_ICONS[destNetwork]} alt={destToken.symbol} className="w-4 h-4 rounded-full" />
                      <span className="text-xs font-bold">{destToken.symbol}</span>
                      <ChevronDown size={12} className="text-zinc-400" />
                    </button>
                  </div>
                )}
                {address && destToken.symbol && (
                  <p className="text-[11px] text-zinc-500 mt-3 text-center italic">
                    Send {destToken.symbol} on {destNetwork}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-surface/60 border border-surfaceLight rounded-[20px] p-4 mb-6">
              <div className="flex justify-between items-center mb-3.5 text-[13px]">
                <span className="text-zinc-400 font-medium">Exchange Rate</span>
                <span className="font-mono font-medium text-zinc-200">{fromUsd || '—'}</span>
              </div>
              <div className="flex justify-between items-center mb-3.5 text-[13px]">
                <span className="text-zinc-400 font-medium">Network Fee</span>
                <div className="flex items-center gap-2">
                  {gasFeeRouting ? (
                    <>
                      <span className="line-through text-zinc-600 font-mono">—</span>
                      <div className="flex items-center gap-1 bg-neon/10 px-2 py-0.5 rounded-md">
                        <Zap size={12} className="text-neon" />
                        <span className="text-neon font-bold text-[11px] uppercase tracking-wide">Free</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-zinc-400 font-mono">Dynamic</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center mb-3.5 text-[13px]">
                <span className="text-zinc-400 font-medium">Aggregator</span>
                <div className="flex items-center gap-1.5">
                  {(['0x', 'LI.FI'] as const).map((item) => (
                    <button key={item} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-surfaceLight text-zinc-400 border border-white/5">
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-zinc-400 font-medium">Route</span>
                <span className="font-medium text-zinc-200 text-xs">{gasFeeRouting ? 'Gas-Free Relay' : 'Direct Transfer'}</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-surfaceLight/50">
                <div className="flex items-center gap-2">
                  <Zap size={13} className={gasFeeRouting ? 'text-neon' : 'text-zinc-500'} />
                  <span className="text-xs font-medium text-zinc-400">0 Gas Fee</span>
                </div>
                <button
                  onClick={() => setGasFeeRouting(!gasFeeRouting)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${gasFeeRouting ? 'bg-neon' : 'bg-zinc-600'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${gasFeeRouting ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {(amountExceedsBalance || (transfer.state === 'error' && transfer.error)) && (
                <div className="mt-3 pt-3 border-t border-surfaceLight/50">
                  <p className="text-xs text-zinc-500 text-center">
                    {amountExceedsBalance
                      ? `Insufficient ${currentSourceToken.symbol} balance`
                      : transfer.error}
                  </p>
                </div>
              )}
            </div>

            {!isConnected && (
              <p className="text-center text-zinc-500 text-sm mb-3">Connect a {currentSourceToken.chainName} wallet to send</p>
            )}

            <NeonButton
              onClick={handleTransfer}
              disabled={!isConnected || !address || !amount || amountExceedsBalance || transfer.state === 'signing' || transfer.state === 'broadcasting' || loadingQuote}
            >
              {loadingQuote ? (
                <><Loader2 size={18} className="animate-spin" /> Getting Quote...</>
              ) : transfer.state === 'signing' || transfer.state === 'broadcasting' ? (
                <><Loader2 size={18} className="animate-spin" /> Sending...</>
              ) : isCrossTransfer && !quoteDisplay ? (
                'Get Quote'
              ) : isCrossTransfer && quoteDisplay ? (
                'Execute Transfer'
              ) : (
                'Review Transfer'
              )}
            </NeonButton>
          </>
        )}
      </main>
      <BottomNavigation />

      {sourceTokenPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={closeSourceTokenPicker}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className={`${closingTokenPicker ? 'swap-token-drawer-out' : 'swap-token-drawer'} relative w-full max-w-md max-h-[75vh] bg-surface border border-surfaceLight rounded-t-[28px] p-5 pb-6 flex flex-col`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold">Select Token</h3>
              <button onClick={closeSourceTokenPicker} className="w-8 h-8 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-2 pr-1">
              {sourceTokens.length === 0 && (
                <div className="p-6 text-center text-sm text-zinc-500">No tokens with balance</div>
              )}
              {sourceTokens.map((token: TransferToken) => (
                <button
                  key={`${token.address}-${token.chainName}`}
                  onClick={() => {
                    setSelectedSourceToken(token)
                    setAmount('')
                    closeSourceTokenPicker()
                  }}
                  className={`flex items-center gap-3.5 p-3.5 rounded-[16px] transition-colors hover:bg-surfaceLight/50 ${
                    token.address === currentSourceToken.address && token.chainName === currentSourceToken.chainName ? 'bg-surfaceLight border border-white/5' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <img src={token.icon} alt={token.symbol} className="w-9 h-9 rounded-full" />
                    <img src={token.chainIcon} alt={token.chainName} className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface bg-darkbg" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">{token.symbol}</p>
                    <p className="text-[11px] text-zinc-500">{token.chainName}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-mono">{Number(token.balance).toFixed(4)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {destTokenPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={closeDestTokenPicker}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className={`${closingTokenPicker ? 'swap-token-drawer-out' : 'swap-token-drawer'} relative w-full max-w-md max-h-[75vh] bg-surface border border-surfaceLight rounded-t-[28px] p-5 pb-6 flex flex-col`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold">Receive token on {destNetwork}</h3>
              <button onClick={closeDestTokenPicker} className="w-8 h-8 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-2 pr-1">
              {(DEST_TOKENS[destNetwork] || []).map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => {
                    setDestToken(token)
                    closeDestTokenPicker()
                  }}
                  className={`flex items-center gap-3.5 p-3.5 rounded-[16px] transition-colors hover:bg-surfaceLight/50 ${
                    token.symbol === destToken.symbol ? 'bg-surfaceLight border border-white/5' : ''
                  }`}
                >
                  <img src={TOKEN_ICONS[token.symbol] || CHAIN_ICONS[destNetwork]} alt={token.symbol} className="w-9 h-9 rounded-full" />
                  <div className="text-left">
                    <p className="text-sm font-bold">{token.symbol}</p>
                    <p className="text-[11px] text-zinc-500">{token.name}</p>
                  </div>
                  {token.symbol === destToken.symbol && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-neon flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-black" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {chainPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setChainPickerOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-surface border border-surfaceLight rounded-t-[28px] p-5 pb-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold">Select Network</h3>
              <button onClick={() => setChainPickerOpen(false)} className="w-8 h-8 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {POPULAR_CHAINS.map((chain) => (
                <button
                  key={chain}
                  onClick={() => {
                    setDestNetwork(chain)
                    setChainPickerOpen(false)
                  }}
                  className={`flex items-center gap-3.5 p-3.5 rounded-[16px] transition-colors ${
                    destNetwork === chain ? 'bg-surfaceLight border border-white/5' : 'hover:bg-surfaceLight/50'
                  }`}
                >
                  <img src={CHAIN_ICONS[chain]} alt={chain} className="w-9 h-9 rounded-full" />
                  <div className="text-left">
                    <p className="text-sm font-bold">{chain}</p>
                    <p className="text-[11px] text-zinc-500">{getChainType(chain) === 'evm' ? 'EVM' : chain}</p>
                  </div>
                  {destNetwork === chain && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-neon flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-black" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showQrScanner && (
        <QrScannerModal
          onScan={(scanned) => handleQrScan(scanned)}
          onClose={() => setShowQrScanner(false)}
        />
      )}

      {showAddressBook && (
        <AddressBookModal
          onSelect={(addr, chain) => {
            setAddress(addr)
            setDestNetwork(chain === 'evm' ? 'Ethereum' : chain === 'solana' ? 'Solana' : 'TON')
          }}
          onClose={() => setShowAddressBook(false)}
        />
      )}
    </div>
  )
}
