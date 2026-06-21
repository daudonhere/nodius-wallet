import { useEffect, useMemo, useState } from 'react'
import { VersionedTransaction } from '@solana/web3.js'
import { ArrowLeft, ChevronDown, ArrowDownUp, Loader2, X, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSendTransaction, useSignTypedData } from '@privy-io/react-auth'
import { useSignTransaction } from '@privy-io/react-auth/solana'
import { useTonAddress } from '@tonconnect/ui-react'
import { useWalletConnection } from '../hooks/useWalletConnection'
import { useBalances } from '../hooks/useBalances'
import { getBridgeQuote, getBridgeStatus, resolveDestToken, getTokenDestChains, getLifiChains, type BridgeQuote, type BridgeChain } from '../services/bridge'
import { submitRelayTx } from '../services/relay'
import { useSettingsStore } from '../stores/settingsStore'
import {
  DEBRIDGE_SOLANA_CHAIN_ID,
  DEBRIDGE_TON_CHAIN_ID,
  DEBRIDGE_CHAIN_META,
  getDebridgeQuote as getDebridgeQuoteApi,
  getDebridgeTx,
  getDebridgeDestChains,
  type DebridgeQuoteResult,
} from '../services/debridge'
import BottomNavigation from '../components/BottomNavigation'

const CHAIN_ICONS: Record<string, string> = {
  Solana: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  TON: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg',
}

interface BridgeToken {
  symbol: string
  name: string
  icon: string
  address: string
  balance: string
  chainName: string
  chainIcon: string
  decimals: number
  chainId: number
}

const EMPTY_TOKEN: BridgeToken = { symbol: '', name: '', icon: '', address: '', balance: '0', chainName: '', chainIcon: '', decimals: 18, chainId: 0 }

const formatUsd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function ChainPickerModal({ open, chains, selected, onSelect, onClose }: {
  open: boolean
  chains: BridgeChain[]
  selected: BridgeChain | null
  onSelect: (c: BridgeChain) => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-surface border border-surfaceLight rounded-t-[28px] p-5 pb-10 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-bold">Select Chain</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400">
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {chains.map((c) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); onClose() }}
              className={`flex items-center gap-3.5 p-3.5 rounded-[16px] transition-colors ${
                selected?.id === c.id ? 'bg-surfaceLight border border-white/5' : 'hover:bg-surfaceLight/50'
              }`}
            >
              <img src={c.icon} alt={c.name} className="w-9 h-9 rounded-full" />
              <div className="text-left">
                <p className="text-sm font-bold">{c.name}</p>
              </div>
              {selected?.id === c.id && (
                <div className="ml-auto w-5 h-5 rounded-full bg-neon flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-black" />
                </div>
              )}
            </button>
          ))}
          {chains.length === 0 && (
            <p className="text-center text-sm text-zinc-500 py-4">No chains available for this token</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BridgePage() {
  const navigate = useNavigate()
  const { evm, solana } = useWalletConnection()
  const { sendTransaction } = useSendTransaction()
  const { signTypedData } = useSignTypedData()
  const { signTransaction: solanaSign } = useSignTransaction()
  const tonAddress = useTonAddress()
  const { tokens, prices, isLoadingAssets } = useBalances()
  const gasFeeRouting = useSettingsStore((s) => s.gasFeeRouting)

  const [fromToken, setFromToken] = useState<BridgeToken>(EMPTY_TOKEN)
  const [destChain, setDestChain] = useState<BridgeChain | null>(null)
  const [destChains, setDestChains] = useState<BridgeChain[]>([])
  const [loadingDestChains, setLoadingDestChains] = useState(false)
  const [allChains, setAllChains] = useState<BridgeChain[]>([])
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<BridgeQuote | null>(null)
  const [debridgeQuoteData, setDebridgeQuoteData] = useState<DebridgeQuoteResult | null>(null)
  const [bridgeType, setBridgeType] = useState<'lifi' | 'debridge'>('lifi')
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [sending, setSending] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false)
  const [closingTokenPicker, setClosingTokenPicker] = useState(false)
  const [chainPickerOpen, setChainPickerOpen] = useState(false)
  const [slippage, setSlippage] = useState('Auto')
  const [aggregator, setAggregator] = useState<'0x' | 'LI.FI'>('LI.FI')
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    getLifiChains().then((chains) => {
      setAllChains(chains)
      setInitialLoading(false)
    })
  }, [])

  const chainIconMap = useMemo(() => {
    const map: Record<string, string> = { ...CHAIN_ICONS }
    for (const c of allChains) {
      map[c.name] = c.icon
      map[String(c.id)] = c.icon
    }
    return map
  }, [allChains])

  const debridgeChains = useMemo<BridgeChain[]>(() => {
    return Object.entries(DEBRIDGE_CHAIN_META).map(([id, meta]) => ({
      id: Number(id),
      name: meta.name,
      icon: meta.icon,
      nativeToken: meta.nativeToken,
    }))
  }, [])

  function chainNameToChainId(name: string): number {
    if (name === 'Solana') return DEBRIDGE_SOLANA_CHAIN_ID
    if (name === 'TON') return DEBRIDGE_TON_CHAIN_ID
    const found = allChains.find((c) => c.name === name)
    return found?.id || 0
  }

  const sourceTokenOptions = useMemo<BridgeToken[]>(() => tokens
    .filter((t) => t.chainName && t.address && t.decimals != null && Number(t.balance) > 0 && prices[t.symbol]?.price != null)
    .map((t) => {
      const icon = t.icon || chainIconMap[t.chainName || ''] || ''
      const chainIcon = chainIconMap[t.chainName || ''] || ''
      const chain = allChains.find((c) => c.name === t.chainName || String(c.id) === t.chainName)
      return {
        symbol: t.symbol,
        name: t.symbol,
        icon,
        address: t.address || '',
        balance: t.balance,
        chainName: t.chainName || '',
        chainIcon,
        decimals: t.decimals || 18,
        chainId: chain?.id || chainNameToChainId(t.chainName || ''),
      }
    }), [prices, tokens, chainIconMap, allChains])

  useEffect(() => {
    if (sourceTokenOptions.length > 0 && !sourceTokenOptions.find((t) => t.address === fromToken.address && t.chainName === fromToken.chainName)) {
      setFromToken(sourceTokenOptions[0])
    }
  }, [sourceTokenOptions, fromToken.address, fromToken.chainName])

  useEffect(() => {
    if (!fromToken.symbol || !fromToken.address) {
      setDestChains([])
      setDestChain(null)
      return
    }
    setLoadingDestChains(true)

    const fromCid = chainNameToChainId(fromToken.chainName)
    const isDebridge = fromCid === DEBRIDGE_SOLANA_CHAIN_ID || fromCid === DEBRIDGE_TON_CHAIN_ID

    if (isDebridge) {
      getDebridgeDestChains(fromCid, fromToken.chainName).then((chains) => {
        const mapped = chains.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          nativeToken: c.nativeToken,
        }))
        setDestChains(mapped)
        if (mapped.length > 0 && !mapped.find((c) => c.id === destChain?.id)) {
          setDestChain(mapped[0])
        }
        setLoadingDestChains(false)
      })
      return
    }

    getTokenDestChains(fromToken.symbol, fromToken.address, fromToken.chainId || null).then((lifiChains) => {
      const combined = [...lifiChains, ...debridgeChains]
      setDestChains(combined)
      if (combined.length > 0 && !combined.find((c) => c.id === destChain?.id)) {
        setDestChain(combined[0])
      }
      setLoadingDestChains(false)
    })
  }, [fromToken.symbol, fromToken.address, fromToken.chainName, fromToken.chainId, debridgeChains])

  const fromPrice = prices[fromToken.symbol]?.price ?? 0
  const fromUsd = formatUsd(Number(amount || '0') * fromPrice)
  const amountExceedsBalance = Number(amount || '0') > Number(fromToken.balance || '0')
  const isInitialDataLoading = isLoadingAssets || initialLoading
  const fCid = chainNameToChainId(fromToken.chainName)
  const isDebridgeSource = fCid === DEBRIDGE_SOLANA_CHAIN_ID || fCid === DEBRIDGE_TON_CHAIN_ID
  const isDestDebridge = destChain && (destChain.id === DEBRIDGE_SOLANA_CHAIN_ID || destChain.id === DEBRIDGE_TON_CHAIN_ID)
  const needsDebridge = isDebridgeSource || isDestDebridge
  const isEvmSource = fCid > 0 && !isDebridgeSource
  const gasFreeAvailable = gasFeeRouting && isEvmSource
  const hasSolanaWallet = !!solana.address
  const hasTonWallet = !!tonAddress
  const hasEvmWallet = !!evm.address

  const SkeletonBlock = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded-full bg-surfaceLight/70 ${className}`} />
  )

  const closeTokenPicker = () => {
    setClosingTokenPicker(true)
    window.setTimeout(() => {
      setTokenPickerOpen(false)
      setClosingTokenPicker(false)
    }, 180)
  }

  const handleAmountChange = (value: string) => {
    if (!/^\d*\.?\d*$/.test(value)) return
    setAmount(value)
    setQuote(null)
    setDebridgeQuoteData(null)
  }

  const handleFlip = () => {
    if (!destChain || !fromToken.chainId) return
    const tokenOnDest = sourceTokenOptions.find((t) => t.chainId === destChain.id && t.symbol === fromToken.symbol)
    if (!tokenOnDest) return

    const sourceChain = allChains.find((c) => c.id === fromToken.chainId)
    setFromToken(tokenOnDest)
    setDestChain(sourceChain || null)
    setAmount('')
    setQuote(null)
    setDebridgeQuoteData(null)
  }

  const fetchQuote = async () => {
    if (!fromToken.address || !destChain || !amount || parseFloat(amount) <= 0 || amountExceedsBalance) return
    setLoadingQuote(true)
    setError('')

    if (needsDebridge) {
      const fromAmt = (parseFloat(amount) * 10 ** fromToken.decimals).toFixed(0)
      const dq = await getDebridgeQuoteApi(
        fCid, destChain.id,
        fromToken.address, destChain.id,
        fromAmt, fromToken.decimals, fromToken.symbol,
      )
      if (dq) {
        setDebridgeQuoteData(dq)
        setQuote(null)
        setBridgeType('debridge')
      } else {
        setError(`No deBridge route for ${fromToken.symbol} from ${fromToken.chainName} to ${destChain.name}`)
      }
      setLoadingQuote(false)
      return
    }

    const fromChainIdEvm = fromToken.chainId
    if (!fromChainIdEvm) {
      setError('Source chain not supported for bridging')
      setLoadingQuote(false)
      return
    }

    const destToken = await resolveDestToken(fromToken.symbol, fromToken.address, destChain.id)
    if (!destToken) {
      setError(`${fromToken.symbol} not available on ${destChain.name}`)
      setLoadingQuote(false)
      return
    }

    const q = await getBridgeQuote(
      fromChainIdEvm, destChain.id,
      fromToken.address, destToken.address,
      (parseFloat(amount) * 10 ** fromToken.decimals).toFixed(0),
      evm.address || ''
    )
    setQuote(q)
    setDebridgeQuoteData(null)
    setBridgeType('lifi')
    if (!q) setError(`No bridge route for ${fromToken.symbol} from ${fromToken.chainName} to ${destChain.name}`)
    setLoadingQuote(false)
  }

  useEffect(() => {
    if (!fromToken.address || !destChain || !amount || parseFloat(amount) <= 0 || amountExceedsBalance) {
      setQuote(null)
      setDebridgeQuoteData(null)
      return
    }
    const timer = setTimeout(() => {
      fetchQuote()
    }, 600)
    return () => clearTimeout(timer)
  }, [amount, fromToken.address, fromToken.chainName, fromToken.chainId, destChain?.id])

  const displayQuote = quote || debridgeQuoteData

  const handleBridge = async () => {
    if (bridgeType === 'debridge' && debridgeQuoteData) {
      setSending(true)
      setError('')
      try {
        const fromAmt = (parseFloat(amount) * 10 ** fromToken.decimals).toFixed(0)

        if (isDebridgeSource && fromToken.chainName === 'Solana') {
          if (!solana.address || !solana.wallet) { setError('Solana wallet not connected'); setSending(false); return }

          const txResult = await getDebridgeTx(
            debridgeQuoteData, fCid, destChain!.id,
            fromToken.address, destChain!.id, fromAmt,
            fromToken.decimals, fromToken.symbol,
            solana.address, evm.address || solana.address,
          )
          if (!txResult?.solanaTxBase64) { setError('deBridge failed to build Solana tx'); setSending(false); return }

          const txBytes = Uint8Array.from(atob(txResult.solanaTxBase64), (c) => c.charCodeAt(0))
          const transaction = VersionedTransaction.deserialize(txBytes)
          const signedResult: any = await solanaSign({
            transaction: transaction.serialize(),
            wallet: solana.wallet as any,
            chain: 'solana:mainnet',
          })
          const signedBytes: Uint8Array = signedResult.signedTransaction ?? signedResult.transaction ?? signedResult
          const serialized = Buffer.from(signedBytes).toString('hex')
          const result = await submitRelayTx({
            walletId: solana.address,
            source: 'solana',
            chainId: 900,
            signedTx: serialized,
          })
          setTxHash(result.txHash || 'deBridge Solana order ' + txResult.orderId)
          setSending(false)
          return
        }

        if (isDebridgeSource && fromToken.chainName === 'TON') {
          setError('TON bridge via deBridge requires manual claim. Check order on deBridge DLN.')
          setSending(false)
          return
        }

        if (!evm.address) { setError('Connect EVM wallet'); setSending(false); return }

        const txResult = await getDebridgeTx(
          debridgeQuoteData, fCid, destChain!.id,
          fromToken.address, destChain!.id, fromAmt,
          fromToken.decimals, fromToken.symbol,
          evm.address, evm.address,
        )
        if (!txResult?.evmTx) { setError('deBridge failed to build EVM tx'); setSending(false); return }

        if (gasFreeAvailable && evm.chainId) {
          const { signature } = await signTypedData({
            domain: {
              name: 'NodiusRelay',
              version: '1',
              chainId: evm.chainId,
              verifyingContract: txResult.evmTx.to as `0x${string}`,
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
              target: txResult.evmTx.to as `0x${string}`,
              value: `0x${BigInt(txResult.evmTx.value || '0').toString(16)}`,
              data: txResult.evmTx.data as `0x${string}`,
              nonce: '0x0',
              deadline: `0x${BigInt(Math.floor(Date.now() / 1000) + 3600).toString(16)}`,
            },
          })
          const result = await submitRelayTx({
            walletId: evm.address,
            source: 'evm',
            chainId: evm.chainId,
            signedTx: signature,
          })
          setTxHash(result.txHash || 'deBridge order ' + txResult.orderId)
        } else {
          const { hash } = await sendTransaction({
            to: txResult.evmTx.to as `0x${string}`,
            data: txResult.evmTx.data as `0x${string}`,
            value: BigInt(txResult.evmTx.value || '0'),
          })
          setTxHash(hash)
        }
      } catch {
        setError('Transaction rejected or failed')
      }
      setSending(false)
      return
    }

    if (!quote?.transactionRequest || !evm.address) return
    setSending(true)
    setError('')
    try {
      if (gasFreeAvailable && evm.chainId) {
        const { signature } = await signTypedData({
          domain: {
            name: 'NodiusRelay',
            version: '1',
            chainId: evm.chainId,
            verifyingContract: quote.transactionRequest.to as `0x${string}`,
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
            target: quote.transactionRequest.to as `0x${string}`,
            value: `0x${BigInt(quote.transactionRequest.value || '0').toString(16)}`,
            data: quote.transactionRequest.data as `0x${string}`,
            nonce: '0x0',
            deadline: `0x${BigInt(Math.floor(Date.now() / 1000) + 3600).toString(16)}`,
          },
        })
        const result = await submitRelayTx({
          walletId: evm.address,
          source: 'evm',
          chainId: evm.chainId,
          signedTx: signature,
        })
        setTxHash(result.txHash || '')
      } else {
        const { hash } = await sendTransaction({
          to: quote.transactionRequest.to as `0x${string}`,
          data: quote.transactionRequest.data as `0x${string}`,
          value: BigInt(quote.transactionRequest.value || '0'),
          chainId: quote.transactionRequest.chainId,
        })
        const tool = quote.tool || 'lifi'
        const status = await getBridgeStatus(tool, hash)
        setTxHash(status || 'submitted')
      }
    } catch {
      setError('Transaction rejected or failed')
    }
    setSending(false)
  }

  if (txHash) {
    return (
      <div className="w-full h-screen flex flex-col bg-darkbg text-white font-sans items-center justify-center gap-4 p-5">
        <div className="w-16 h-16 rounded-full bg-neon/10 flex items-center justify-center">
          <Zap size={32} className="text-neon" />
        </div>
        <h2 className="text-xl font-bold">Bridge Submitted</h2>
        <p className="text-zinc-400 text-sm font-mono break-all text-center max-w-xs">{txHash}</p>
        <button onClick={() => navigate(-1)} className="bg-neon text-black font-extrabold text-[15px] py-4 px-8 rounded-[20px] shadow-[0_0_24px_rgba(204,255,0,0.25)] hover:shadow-[0_0_32px_rgba(204,255,0,0.4)] transition-all tracking-wide">Done</button>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex flex-col bg-darkbg text-white font-sans overflow-hidden relative selection:bg-neon selection:text-black">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-neon/5 rounded-full blur-[100px] pointer-events-none" />

      <header className="shrink-0 pt-14 px-5 pb-6 flex justify-between items-center z-20 bg-darkbg/85 backdrop-blur-[12px] border-b border-white/5" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold tracking-wide">Bridge</h1>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 z-10 px-5">
        {isInitialDataLoading ? (
          <div className="flex flex-col gap-5 mt-2">
            <div className="bg-surface border border-surfaceLight rounded-[28px] p-2 shadow-lg">
              <div className="bg-[#0a0a0a] rounded-[24px] p-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <SkeletonBlock className="w-14 h-4 rounded-md" />
                  <SkeletonBlock className="w-20 h-4 rounded-md" />
                </div>
                <div className="flex justify-between items-center">
                  <SkeletonBlock className="w-28 h-9 rounded-xl" />
                  <SkeletonBlock className="w-28 h-11 rounded-full" />
                </div>
                <div className="mt-2"><SkeletonBlock className="w-20 h-4 rounded-md" /></div>
              </div>
              <div className="flex justify-center -my-[16px] relative z-10">
                <div className="w-11 h-11 bg-surface border-[4px] border-[#161616] rounded-full flex items-center justify-center">
                  <SkeletonBlock className="w-5 h-5" />
                </div>
              </div>
              <div className="bg-[#0a0a0a] rounded-[24px] p-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <SkeletonBlock className="w-20 h-4 rounded-md" />
                </div>
                <div className="flex justify-between items-center">
                  <SkeletonBlock className="w-28 h-9 rounded-xl" />
                  <SkeletonBlock className="w-28 h-11 rounded-full" />
                </div>
                <div className="mt-2"><SkeletonBlock className="w-20 h-4 rounded-md" /></div>
              </div>
            </div>
            <div className="px-1 mt-5">
              <div className="flex justify-between items-center mb-3">
                <SkeletonBlock className="w-28 h-4 rounded-md" />
                <SkeletonBlock className="w-8 h-4 rounded-md" />
              </div>
              <div className="flex gap-2.5">
                {[0, 1, 2, 3].map((i) => (
                  <SkeletonBlock key={i} className="flex-1 h-10 rounded-[14px]" />
                ))}
              </div>
            </div>
            <div className="bg-surface/60 border border-surfaceLight rounded-[20px] p-4">
              <div className="flex justify-between items-center mb-3"><SkeletonBlock className="w-20 h-4 rounded-md" /><SkeletonBlock className="w-32 h-4 rounded-md" /></div>
              <div className="flex justify-between items-center mb-3"><SkeletonBlock className="w-16 h-4 rounded-md" /><SkeletonBlock className="w-20 h-4 rounded-md" /></div>
              <div className="flex justify-between items-center mb-3"><SkeletonBlock className="w-16 h-4 rounded-md" /><SkeletonBlock className="w-20 h-4 rounded-md" /></div>
              <div className="flex justify-between items-center"><SkeletonBlock className="w-12 h-4 rounded-md" /><SkeletonBlock className="w-28 h-4 rounded-md" /></div>
            </div>
            <SkeletonBlock className="w-full h-12 rounded-xl" />
          </div>
        ) : (
        <>
        <div className="mt-2 bg-surface border border-surfaceLight rounded-[28px] p-2 shadow-lg">
          <div className="bg-[#0a0a0a] rounded-[24px] p-5 pb-6 border border-transparent focus-within:border-neon/30 transition-colors group">
            <div className="flex justify-between items-center mb-4 text-sm">
              <span className="text-zinc-400 font-medium">From</span>
              <span className="text-zinc-500 font-mono">{Number(fromToken.balance).toFixed(4)}</span>
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
              <button onClick={() => setTokenPickerOpen(true)} className="flex items-center gap-2 bg-surfaceLight hover:bg-surfaceLight/80 transition-colors py-2.5 px-3.5 rounded-full border border-white/5 shadow-sm">
                <div className="relative">
                  <img src={fromToken.icon} alt={fromToken.symbol} className="w-[22px] h-[22px] rounded-full" />
                  <img src={fromToken.chainIcon} alt={fromToken.chainName} className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-surfaceLight bg-darkbg" />
                </div>
                <span className="font-bold text-[15px]">{fromToken.symbol}</span>
                <ChevronDown size={14} className="text-zinc-400 ml-0.5" />
              </button>
            </div>
            <div className="mt-1 text-zinc-500 text-[13px] font-mono">{fromUsd}</div>
          </div>

          <div className="flex justify-center -my-[16px] relative z-10">
            <button onClick={handleFlip} className="w-11 h-11 bg-surface border-[4px] border-[#161616] rounded-full flex items-center justify-center text-zinc-300 hover:text-neon hover:scale-105 hover:rotate-180 transition-all duration-300 shadow-lg group">
              <ArrowDownUp size={18} className="group-hover:drop-shadow-[0_0_8px_#CCFF00]" />
            </button>
          </div>

          <div className="bg-[#0a0a0a] rounded-[24px] p-5 pb-6 border border-transparent focus-within:border-neon/30 transition-colors">
            <div className="flex justify-between items-center mb-4 text-sm">
              <span className="text-zinc-400 font-medium">To</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-[26px] font-bold text-white">
                {loadingQuote ? <Loader2 size={24} className="animate-spin text-zinc-500" /> : displayQuote ? (Number(displayQuote.estimatedToAmount) / 10 ** displayQuote.toToken.decimals).toFixed(6) : '0'}
              </span>
              <button
                onClick={() => setChainPickerOpen(true)}
                disabled={destChains.length === 0}
                className="flex items-center gap-2 bg-surfaceLight hover:bg-surfaceLight/80 transition-colors py-2.5 px-3.5 rounded-full border border-white/5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <img src={destChain?.icon || chainIconMap.Ethereum || ''} alt={destChain?.name || 'Chain'} className="w-[22px] h-[22px] rounded-full" />
                <span className="font-bold text-[15px]">{destChain?.name || (loadingDestChains ? '...' : 'No Chain')}</span>
                <ChevronDown size={14} className="text-zinc-400 ml-0.5" />
              </button>
            </div>
            <div className="mt-1 text-zinc-500 text-[13px] font-mono">
              {displayQuote ? '~' + formatUsd((Number(displayQuote.estimatedToAmount) / 10 ** displayQuote.toToken.decimals) * (prices[fromToken.symbol]?.price || 0)) : ''}
            </div>
          </div>
        </div>

        {!fromToken.symbol && (
          <div className="mt-6 p-4 bg-surface/60 border border-surfaceLight rounded-[20px] text-center">
            <p className="text-sm text-zinc-400">No assets with balance available for bridging.</p>
          </div>
        )}

        {destChains.length === 0 && fromToken.symbol && !loadingDestChains && (
          <div className="mt-6 p-4 bg-surface/60 border border-surfaceLight rounded-[20px] text-center">
            <p className="text-sm text-zinc-400">{fromToken.symbol} cannot be bridged. No destination chain supports this token.</p>
          </div>
        )}

        {destChains.length > 0 && (
          <>
          <div className="mt-6 mb-5 px-1">
            <div className="flex justify-between items-center mb-3 text-[13px]">
              <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                Slippage Tolerance
                <span className="relative group flex items-center">
                  <span className="text-zinc-500 text-sm cursor-help">ⓘ</span>
                  <span className="pointer-events-none absolute left-1/2 bottom-6 z-20 w-56 -translate-x-1/2 rounded-xl border border-surfaceLight bg-surface px-3 py-2 text-[11px] leading-relaxed text-zinc-400 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    Maximum price movement allowed before swap fails.
                  </span>
                </span>
              </span>
              <span className="text-white font-bold">{slippage}</span>
            </div>
            <div className="flex gap-2.5">
              {['Auto', '0.1%', '0.5%', '1.0%'].map((val) => (
                <button key={val} onClick={() => setSlippage(val)} className={`flex-1 border font-semibold py-2.5 rounded-[14px] text-sm transition-colors ${val === slippage ? 'bg-neon/10 border-neon/30 text-neon font-bold shadow-[0_0_12px_rgba(204,255,0,0.15)]' : 'bg-surface border-surfaceLight text-zinc-400 hover:text-white hover:bg-surfaceLight'}`}>
                  {val}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-surface/60 border border-surfaceLight rounded-[20px] p-4 mb-6">
            <div className="flex justify-between items-center mb-3.5 text-[13px]">
              <span className="text-zinc-400 font-medium">Exchange Rate</span>
              {loadingQuote ? <SkeletonBlock className="w-32 h-4 rounded-md" /> : <span className="font-mono font-medium text-zinc-200">{displayQuote ? `1 ${fromToken.symbol} = ${(Number(displayQuote.estimatedToAmount) / Number(displayQuote.estimatedFromAmount || parseFloat(amount) * 10 ** fromToken.decimals)).toFixed(6)} ${displayQuote.toToken.symbol}` : formatUsd(fromPrice)}</span>}
            </div>
            <div className="flex justify-between items-center mb-3.5 text-[13px]">
              <span className="text-zinc-400 font-medium">Network Fee</span>
              <div className="flex items-center gap-2">
                {loadingQuote ? <SkeletonBlock className="w-20 h-4 rounded-md" /> : gasFreeAvailable ? (
                  <>
                    <span className="line-through text-zinc-600 font-mono">{displayQuote && 'feeUsd' in displayQuote ? `~$${Number((displayQuote as any).feeUsd || 0).toFixed(2)}` : displayQuote?.estimate?.gasCosts?.[0] ? `~$${Number(displayQuote.estimate.gasCosts[0].amountUsd).toFixed(2)}` : '—'}</span>
                    <div className="flex items-center gap-1 bg-neon/10 px-2 py-0.5 rounded-md">
                      <Zap size={12} className="text-neon" />
                      <span className="text-neon font-bold text-[11px] uppercase tracking-wide">Free</span>
                    </div>
                  </>
                ) : (
                  <span className="font-mono text-zinc-200">{displayQuote && 'feeUsd' in displayQuote ? `~$${Number((displayQuote as any).feeUsd || 0).toFixed(2)}` : displayQuote?.estimate?.gasCosts?.[0] ? `~$${Number(displayQuote.estimate.gasCosts[0].amountUsd).toFixed(2)}` : '—'}</span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-zinc-400 font-medium">Aggregator</span>
              <div className="flex items-center gap-1.5">
                {(!needsDebridge ? (['0x', 'LI.FI'] as const) : (['deBridge'] as const)).map((item) => (
                  <button key={item} onClick={() => { if (!needsDebridge) { setAggregator(item as '0x' | 'LI.FI'); setQuote(null) } }} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${(!needsDebridge && aggregator === item) || needsDebridge ? 'bg-neon/10 text-neon border border-neon/20' : 'bg-surfaceLight text-zinc-400 border border-white/5'}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center text-[13px] mt-3">
              <span className="text-zinc-400 font-medium">Route</span>
              {loadingQuote ? <SkeletonBlock className="w-28 h-4 rounded-md" /> : (
                <span className="font-medium text-zinc-200">{bridgeType === 'debridge' ? 'deBridge' : (quote?.tool || `${aggregator} Aggregator`)}</span>
              )}
            </div>
            {(error || amountExceedsBalance) && (
              <div className="mt-3 pt-3 border-t border-surfaceLight">
                <p className="text-xs text-zinc-500 text-center">
                  {amountExceedsBalance ? `Insufficient ${fromToken.symbol} balance` : error}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={displayQuote ? handleBridge : fetchQuote}
            disabled={sending || loadingQuote || amountExceedsBalance || !fromToken.address || !amount || parseFloat(amount) <= 0 || (isDebridgeSource && fromToken.chainName === 'Solana' && !hasSolanaWallet) || (isDebridgeSource && fromToken.chainName === 'TON' && !hasTonWallet) || (isEvmSource && !hasEvmWallet)}
            className="w-full bg-neon text-black font-extrabold text-[15px] py-4 rounded-[20px] shadow-[0_0_24px_rgba(204,255,0,0.25)] hover:shadow-[0_0_32px_rgba(204,255,0,0.4)] hover:bg-[#D4FF33] transition-all flex items-center justify-center gap-2 tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <><Loader2 size={18} className="animate-spin" /> Bridging...</>
            ) : loadingQuote ? (
              <><Loader2 size={18} className="animate-spin" /> Getting Quote...</>
            ) : displayQuote ? (
              'Execute Bridge'
            ) : amount ? (
              'Fetching Quote...'
            ) : (
              'Enter Amount'
            )}
          </button>
          </>
        )}
        </>
      )}
      </main>
      <BottomNavigation />

      {tokenPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={closeTokenPicker}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className={`${closingTokenPicker ? 'swap-token-drawer-out' : 'swap-token-drawer'} relative w-full max-w-md max-h-[75vh] bg-surface border border-surfaceLight rounded-t-[28px] p-5 pb-6 flex flex-col`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold">Select Token</h3>
              <button onClick={closeTokenPicker} className="w-8 h-8 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-2 pr-1">
              {sourceTokenOptions.length === 0 && (
                <div className="p-6 text-center text-sm text-zinc-500">No asset with balance</div>
              )}
              {sourceTokenOptions.map((token) => {
                const selected = token.address === fromToken.address && token.chainName === fromToken.chainName
                const usd = prices[token.symbol]?.price ? Number(token.balance) * prices[token.symbol].price : 0
                return (
                  <button
                    key={`${token.chainName}-${token.address}`}
                    onClick={() => {
                      setFromToken(token)
                      setQuote(null)
                      setDebridgeQuoteData(null)
                      setAmount('')
                      closeTokenPicker()
                    }}
                    className={`flex items-center gap-3.5 p-3.5 rounded-[16px] transition-colors ${selected ? 'bg-surfaceLight border border-white/5' : 'hover:bg-surfaceLight/50'}`}
                  >
                    <div className="relative shrink-0">
                      <img src={token.icon} alt={token.symbol} className="w-9 h-9 rounded-full" />
                      <img src={token.chainIcon} alt={token.chainName} className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface bg-darkbg" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-bold">{token.symbol}</p>
                      <p className="text-[11px] text-zinc-500">{token.chainName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{Number(token.balance).toFixed(4)}</p>
                      <p className="text-[11px] text-zinc-500">{usd > 0 ? formatUsd(usd) : ''}</p>
                    </div>
                    {selected && <div className="ml-2 w-2.5 h-2.5 rounded-full bg-neon shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <ChainPickerModal open={chainPickerOpen} chains={destChains} selected={destChain} onSelect={(c) => { setDestChain(c); setQuote(null); setDebridgeQuoteData(null) }} onClose={() => setChainPickerOpen(false)} />
    </div>
  )
}
