import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronDown, ArrowDownUp, Info, Clock, ChevronRight, Globe, Loader2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSendTransaction } from '@privy-io/react-auth'
import { useWalletConnection } from '../hooks/useWalletConnection'
import { getBridgeQuote, getBridgeStatus, type BridgeQuote } from '../services/bridge'
import BottomNavigation from '../components/BottomNavigation'

interface ChainOption {
  id: string
  name: string
  icon: string
  chainId: number
}

const chains: ChainOption[] = [
  { id: '1', name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', chainId: 1 },
  { id: '137', name: 'Polygon', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg', chainId: 137 },
  { id: '42161', name: 'Arbitrum', icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg', chainId: 42161 },
  { id: '8453', name: 'Base', icon: 'https://cryptologos.cc/logos/base-base-logo.svg', chainId: 8453 },
]

const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

function ChainModal({ open, chains, selected, onSelect, onClose }: {
  open: boolean
  chains: ChainOption[]
  selected: ChainOption | null
  onSelect: (c: ChainOption) => void
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
                <p className="text-[11px] text-zinc-500 font-mono">Chain ID: {c.chainId}</p>
              </div>
              {selected?.id === c.id && (
                <div className="ml-auto w-5 h-5 rounded-full bg-neon flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-black" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BridgePage() {
  const navigate = useNavigate()
  const { evm } = useWalletConnection()
  const { sendTransaction } = useSendTransaction()

  const [fromChain, setFromChain] = useState<ChainOption>(chains[0])
  const [toChain, setToChain] = useState<ChainOption>(chains[1])
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<BridgeQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState('')
  const [showFromModal, setShowFromModal] = useState(false)
  const [showToModal, setShowToModal] = useState(false)

  const fromAddress = evm.address || ''

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0 || !fromAddress) {
      setQuote(null)
      return
    }

    const debounce = setTimeout(async () => {
      setLoading(true)
      setError('')
      const result = await getBridgeQuote(
        fromChain.id,
        toChain.id,
        NATIVE_TOKEN,
        NATIVE_TOKEN,
        (parseFloat(amount) * 1e18).toString(),
        fromAddress
      )
      setQuote(result)
      if (!result) setError('Could not fetch quote. Try a different route.')
      setLoading(false)
    }, 500)

    return () => clearTimeout(debounce)
  }, [amount, fromChain.id, toChain.id, fromAddress])

  const handleFlip = () => {
    const temp = fromChain
    setFromChain(toChain)
    setToChain(temp)
  }

  const handleReview = async () => {
    if (!quote?.transactionRequest || !evm.address) return
    setSending(true)
    try {
      const { hash } = await sendTransaction({
        to: quote.transactionRequest.to as `0x${string}`,
        data: quote.transactionRequest.data as `0x${string}`,
        value: BigInt(quote.transactionRequest.value || '0'),
        chainId: quote.transactionRequest.chainId,
      })
      const bridge = (quote as any).tool || (quote as any).includedSteps?.[0]?.tool || 'lifi'
      const status = await getBridgeStatus(bridge, hash)
      setBridgeStatus(status || 'submitted')
      navigate('/history')
    } catch {
      setError('Transaction rejected or failed')
    } finally {
      setSending(false)
    }
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
        <div className="mt-2 bg-surface border border-surfaceLight rounded-[28px] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs text-zinc-400 font-medium">From</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowFromModal(true)}
              className="flex items-center gap-2.5 bg-surfaceLight rounded-full px-3 py-1.5 border border-white/5"
            >
              <img src={fromChain.icon} alt={fromChain.name} className="w-5 h-5 rounded-full" />
              <span className="text-sm font-bold">{fromChain.name}</span>
              <ChevronDown size={14} className="text-zinc-400" />
            </button>
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent border-none outline-none font-mono text-[28px] font-bold text-white w-[120px] text-right placeholder-zinc-800 tracking-tight"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-surfaceLight/50 rounded-full px-2.5 py-1 border border-white/5 w-fit">
            <img src={fromChain.icon} alt="Native" className="w-4 h-4" />
            <span className="text-xs font-semibold">Native</span>
          </div>
        </div>

        <div className="flex justify-center -my-4 relative z-10">
          <button
            onClick={handleFlip}
            className="w-11 h-11 bg-surface border-[4px] border-[#161616] rounded-full flex items-center justify-center text-zinc-300 hover:text-neon hover:scale-105 hover:rotate-180 transition-all duration-300 shadow-lg group"
          >
            <ArrowDownUp size={18} className="group-hover:drop-shadow-[0_0_8px_#CCFF00]" />
          </button>
        </div>

        <div className="bg-surface border border-surfaceLight rounded-[28px] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs text-zinc-400 font-medium">To</span>
            <span className="text-[11px] text-zinc-500 font-mono">Est. receive</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowToModal(true)}
              className="flex items-center gap-2.5 bg-surfaceLight rounded-full px-3 py-1.5 border border-white/5"
            >
              <img src={toChain.icon} alt={toChain.name} className="w-5 h-5 rounded-full" />
              <span className="text-sm font-bold">{toChain.name}</span>
              <ChevronDown size={14} className="text-zinc-400" />
            </button>
            <span className="font-mono text-[28px] font-bold text-white">
              {loading ? <Loader2 size={24} className="animate-spin text-zinc-500" /> : quote ? (Number(quote.estimatedToAmount) / 1e18).toFixed(4) : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-surfaceLight/50 rounded-full px-2.5 py-1 border border-white/5 w-fit">
            <img src={toChain.icon} alt="Native" className="w-4 h-4" />
            <span className="text-xs font-semibold">Native</span>
          </div>
        </div>

        <div className="mt-6 bg-surface/60 border border-surfaceLight rounded-[20px] p-4 mb-6">
          <div className="flex justify-between items-center mb-3.5 text-[13px]">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              Bridge Fee <Info size={14} className="text-zinc-500" />
            </span>
            <span className="font-mono font-medium text-zinc-200">
              {quote?.estimate?.gasCosts?.[0] ? `~$${Number(quote.estimate.gasCosts[0].amountUsd).toFixed(2)}` : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3.5 text-[13px]">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              Estimated Time <Clock size={14} className="text-zinc-500" />
            </span>
            <span className="text-zinc-200 font-medium">
              {quote?.estimate?.executionDuration ? `~${Math.round(Number(quote.estimate.executionDuration) / 60)} min` : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              Route <Globe size={14} className="text-zinc-500" />
            </span>
            <button className="font-medium text-zinc-200 flex items-center gap-1 hover:text-white transition-colors">
              {fromChain.name} → {toChain.name}
              <ChevronRight size={14} className="text-zinc-500" />
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}
        {bridgeStatus && <p className="text-neon text-xs text-center mb-3">Bridge status: {bridgeStatus}</p>}

        <button
          onClick={handleReview}
          disabled={!quote || sending || !evm.address}
          className="w-full bg-neon text-black font-extrabold text-[15px] py-4 rounded-[20px] shadow-[0_0_24px_rgba(204,255,0,0.25)] hover:shadow-[0_0_32px_rgba(204,255,0,0.4)] hover:bg-[#D4FF33] transition-all flex items-center justify-center gap-2 tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <><Loader2 size={18} className="animate-spin" /> Sending...</>
          ) : !evm.address ? (
            'Connect EVM Wallet'
          ) : quote ? (
            'Review Bridge'
          ) : amount ? (
            'Fetching Quote...'
          ) : (
            'Enter Amount'
          )}
        </button>
      </main>
      <BottomNavigation />

      <ChainModal open={showFromModal} chains={chains} selected={fromChain} onSelect={setFromChain} onClose={() => setShowFromModal(false)} />
      <ChainModal open={showToModal} chains={chains} selected={toChain} onSelect={setToChain} onClose={() => setShowToModal(false)} />
    </div>
  )
}
