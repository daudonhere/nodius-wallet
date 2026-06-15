import { useState } from 'react'
import { ArrowLeft, SlidersHorizontal, ChevronDown, ArrowDownUp, Info, Zap, ChevronRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSendTransaction, useSignTypedData } from '@privy-io/react-auth'
import { useWalletConnection } from '../hooks/useWalletConnection'
import BottomNavigation from '../components/BottomNavigation'
import NeonButton from '../components/NeonButton'
import { getZeroXQuote } from '../services/swap'
import { submitRelayTx } from '../services/relay'
import { useBalances } from '../hooks/useBalances'
import { useSettingsStore } from '../stores/settingsStore'
import type { SwapQuote } from '../services/swap'

const TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
  { symbol: 'USDC', name: 'USD Coin', icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { symbol: 'DAI', name: 'Dai', icon: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.svg', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
  { symbol: 'WETH', name: 'Wrapped Ether', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
]

const formatUsd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function SwapPage() {
  const navigate = useNavigate()
  const { evm } = useWalletConnection()
  const { sendTransaction } = useSendTransaction()
  const { signTypedData } = useSignTypedData()
  const { prices } = useBalances()
  const gasFeeRouting = useSettingsStore((s) => s.gasFeeRouting)

  const [fromToken, setFromToken] = useState(TOKENS[0])
  const [toToken, setToToken] = useState(TOKENS[1])
  const [fromAmount, setFromAmount] = useState('1.0')
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [sending, setSending] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')

  const fromPrice = prices[fromToken.symbol]?.price ?? 0
  const toPrice = prices[toToken.symbol]?.price ?? 0
  const fromUsd = formatUsd(Number(fromAmount) * fromPrice)
  const toAmount = fromPrice && toPrice ? (Number(fromAmount) * fromPrice / toPrice).toFixed(6) : '0'
  const toUsd = '~' + formatUsd(Number(toAmount) * toPrice)

  const handleFlip = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
  }

  const fetchQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) === 0) return
    setLoadingQuote(true)
    setError('')
    const q = await getZeroXQuote(fromToken.address, toToken.address, BigInt(Math.floor(parseFloat(fromAmount) * 1e18)).toString())
    setQuote(q)
    if (!q) setError('Could not fetch quote')
    setLoadingQuote(false)
  }

  const handleSwap = async () => {
    if (!evm.address || !quote?.tx) return
    setSending(true)
    setError('')

    try {
      if (gasFeeRouting && evm.chainId) {
        const { signature } = await signTypedData({
          domain: {
            name: 'NodiusRelay',
            version: '1',
            chainId: evm.chainId,
            verifyingContract: quote.tx.to as `0x${string}`,
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
            target: quote.tx.to as `0x${string}`,
            value: `0x${BigInt(quote.tx.value || '0').toString(16)}`,
            data: quote.tx.data as `0x${string}`,
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
          to: quote.tx.to as `0x${string}`,
          data: quote.tx.data as `0x${string}`,
          value: BigInt(quote.tx.value || '0'),
        })
        setTxHash(hash)
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
        <h2 className="text-xl font-bold">Swap Submitted</h2>
        <p className="text-zinc-400 text-sm font-mono break-all text-center max-w-xs">{txHash}</p>
        <NeonButton onClick={() => navigate(-1)}>Done</NeonButton>
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
        <h1 className="text-base font-bold tracking-wide">Swap</h1>
        <button className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white transition-colors relative">
          <SlidersHorizontal size={18} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 z-10 px-5">
        <div className="mt-2 bg-surface border border-surfaceLight rounded-[28px] p-2 shadow-lg">
          <div className="bg-[#0a0a0a] rounded-[24px] p-5 pb-6 border border-transparent focus-within:border-neon/30 transition-colors group">
            <div className="flex justify-between items-center mb-4 text-sm">
              <span className="text-zinc-400 font-medium">You pay</span>
              <span className="text-zinc-500 font-mono">Bal: —</span>
            </div>
            <div className="flex justify-between items-center">
              <input
                type="number"
                placeholder="0"
                value={fromAmount}
                onChange={(e) => { setFromAmount(e.target.value); setQuote(null) }}
                className="bg-transparent border-none outline-none font-mono text-[40px] font-bold text-white w-[55%] placeholder-zinc-800 tracking-tight"
              />
              <button className="flex items-center gap-2 bg-surfaceLight hover:bg-surfaceLight/80 transition-colors py-2.5 px-3.5 rounded-full border border-white/5 shadow-sm">
                <img src={fromToken.icon} alt={fromToken.symbol} className="w-[22px] h-[22px]" />
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
              <span className="text-zinc-400 font-medium">You receive</span>
              <span className="text-zinc-500 font-mono">Bal: —</span>
            </div>
            <div className="flex justify-between items-center">
              <input type="number" placeholder="0" value={toAmount} readOnly className="bg-transparent border-none outline-none font-mono text-[40px] font-bold text-white w-[55%] placeholder-zinc-800 tracking-tight" />
              <button className="flex items-center gap-2 bg-[#2775CA]/10 hover:bg-[#2775CA]/20 transition-colors py-2.5 px-3.5 rounded-full border border-[#2775CA]/20 shadow-sm">
                <img src={toToken.icon} alt={toToken.symbol} className="w-[22px] h-[22px]" />
                <span className="font-bold text-[15px]">{toToken.symbol}</span>
                <ChevronDown size={14} className="text-zinc-400 ml-0.5" />
              </button>
            </div>
            <div className="mt-1 text-zinc-500 text-[13px] font-mono">{toUsd}</div>
          </div>
        </div>

        <div className="mt-6 mb-5 px-1">
          <div className="flex justify-between items-center mb-3 text-[13px]">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">Slippage Tolerance <Info size={14} className="text-zinc-500" /></span>
            <span className="text-white font-bold">0.5%</span>
          </div>
          <div className="flex gap-2.5">
            {['Auto', '0.1%', '0.5%', '1.0%'].map((val) => (
              <button key={val} className={`flex-1 border font-semibold py-2.5 rounded-[14px] text-sm transition-colors ${val === '0.5%' ? 'bg-neon/10 border-neon/30 text-neon font-bold shadow-[0_0_12px_rgba(204,255,0,0.15)]' : 'bg-surface border-surfaceLight text-zinc-400 hover:text-white hover:bg-surfaceLight'}`}>
                {val}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface/60 border border-surfaceLight rounded-[20px] p-4 mb-6">
          <div className="flex justify-between items-center mb-3.5 text-[13px]">
            <span className="text-zinc-400 font-medium">Exchange Rate</span>
            <span className="font-mono font-medium text-zinc-200">1 {fromToken.symbol} = {formatUsd(fromPrice)}</span>
          </div>
          <div className="flex justify-between items-center mb-3.5 text-[13px]">
            <span className="text-zinc-400 font-medium">Network Fee</span>
            <div className="flex items-center gap-2">
              {gasFeeRouting ? (
                <>
                  <span className="line-through text-zinc-600 font-mono">$5.40</span>
                  <div className="flex items-center gap-1 bg-neon/10 px-2 py-0.5 rounded-md">
                    <Zap size={12} className="text-neon" />
                    <span className="text-neon font-bold text-[11px] uppercase tracking-wide">Free</span>
                  </div>
                </>
              ) : (
                <span className="font-mono text-zinc-200">$5.40</span>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-zinc-400 font-medium">Route</span>
            <button className="font-medium text-zinc-200 flex items-center gap-1 hover:text-white transition-colors">
              Best Price Aggregator
              <ChevronRight size={14} className="text-zinc-500" />
            </button>
          </div>
        </div>

        {quote && (
          <div className="bg-surface/30 border border-neon/20 rounded-[20px] p-3 mb-4">
            <p className="text-xs text-zinc-400">Quote: {quote.price} | Est. gas: {quote.estimatedGas}</p>
          </div>
        )}

        {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}

        <NeonButton onClick={quote ? handleSwap : fetchQuote} disabled={!evm.address || sending || loadingQuote}>
          {loadingQuote ? <><Loader2 size={18} className="animate-spin" /> Getting Quote...</>
            : sending ? <><Loader2 size={18} className="animate-spin" /> Swapping...</>
            : quote ? 'Execute Swap'
            : 'Get Quote'}
        </NeonButton>
      </main>
      <BottomNavigation />
    </div>
  )
}
