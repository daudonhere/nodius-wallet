import { useState } from 'react'
import { ArrowLeft, SlidersHorizontal, ChevronDown, ArrowDownUp, Info, Zap, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BottomNavigation from '../components/BottomNavigation'

interface TokenInfo {
  symbol: string
  name: string
  icon: string
  balance: string
  usdPrice: number
}

const tokens: Record<string, TokenInfo> = {
  ETH: { symbol: 'ETH', name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', balance: '1.54', usdPrice: 3450.20 },
  USDC: { symbol: 'USDC', name: 'USD Coin', icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg', balance: '0.00', usdPrice: 1.00 },
}

const formatUsd = (amount: number) => {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function SwapPage() {
  const navigate = useNavigate()
  const [fromToken, setFromToken] = useState<TokenInfo>(tokens.ETH)
  const [toToken, setToToken] = useState<TokenInfo>(tokens.USDC)
  const [fromAmount, setFromAmount] = useState('1.0')

  const fromUsd = formatUsd(Number(fromAmount) * fromToken.usdPrice)
  const toAmount = (Number(fromAmount) * fromToken.usdPrice / toToken.usdPrice).toFixed(2)
  const toUsd = '~' + formatUsd(Number(toAmount) * toToken.usdPrice)

  const handleFlip = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
  }

  return (
    <div className="w-full h-screen flex flex-col bg-darkbg text-white font-sans overflow-hidden relative selection:bg-neon selection:text-black">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-neon/5 rounded-full blur-[100px] pointer-events-none" />

      <header className="shrink-0 pt-14 px-5 pb-4 flex justify-between items-center z-20 bg-darkbg/85 backdrop-blur-[12px]" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
        >
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
              <div className="flex items-center gap-1">
                <span className="text-zinc-500 font-mono">Bal: {fromToken.balance} {fromToken.symbol}</span>
                <button className="text-neon text-[11px] font-bold hover:text-white ml-1 uppercase tracking-wide bg-neon/10 px-2 py-0.5 rounded-md">Max</button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <input
                type="number"
                placeholder="0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
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
            <button
              onClick={handleFlip}
              className="w-11 h-11 bg-surface border-[4px] border-[#161616] rounded-full flex items-center justify-center text-zinc-300 hover:text-neon hover:scale-105 hover:rotate-180 transition-all duration-300 shadow-lg group"
            >
              <ArrowDownUp size={18} className="group-hover:drop-shadow-[0_0_8px_#CCFF00]" />
            </button>
          </div>

          <div className="bg-[#0a0a0a] rounded-[24px] p-5 pb-6 border border-transparent focus-within:border-neon/30 transition-colors">
            <div className="flex justify-between items-center mb-4 text-sm">
              <span className="text-zinc-400 font-medium">You receive</span>
              <span className="text-zinc-500 font-mono">Bal: {toToken.balance} {toToken.symbol}</span>
            </div>
            <div className="flex justify-between items-center">
              <input
                type="number"
                placeholder="0"
                value={toAmount}
                readOnly
                className="bg-transparent border-none outline-none font-mono text-[40px] font-bold text-white w-[55%] placeholder-zinc-800 tracking-tight"
              />
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
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              Slippage Tolerance
              <Info size={14} className="text-zinc-500" />
            </span>
            <span className="text-white font-bold">0.5%</span>
          </div>
          <div className="flex gap-2.5">
            {['Auto', '0.1%', '0.5%', '1.0%'].map((val) => (
              <button
                key={val}
                className={`flex-1 border font-semibold py-2.5 rounded-[14px] text-sm transition-colors ${
                  val === '0.5%'
                    ? 'bg-neon/10 border-neon/30 text-neon font-bold shadow-[0_0_12px_rgba(204,255,0,0.15)]'
                    : 'bg-surface border-surfaceLight text-zinc-400 hover:text-white hover:bg-surfaceLight'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface/60 border border-surfaceLight rounded-[20px] p-4 mb-6">
          <div className="flex justify-between items-center mb-3.5 text-[13px]">
            <span className="text-zinc-400 font-medium">Exchange Rate</span>
            <span className="font-mono font-medium text-zinc-200">1 {fromToken.symbol} = {formatUsd(fromToken.usdPrice)}</span>
          </div>
          <div className="flex justify-between items-center mb-3.5 text-[13px]">
            <span className="text-zinc-400 font-medium">Network Fee</span>
            <div className="flex items-center gap-2">
              <span className="line-through text-zinc-600 font-mono">$5.40</span>
              <div className="flex items-center gap-1 bg-neon/10 px-2 py-0.5 rounded-md">
                <Zap size={12} className="text-neon" />
                <span className="text-neon font-bold text-[11px] uppercase tracking-wide">Free</span>
              </div>
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

        <button className="w-full bg-neon text-black font-extrabold text-[15px] py-4 rounded-[20px] shadow-[0_0_24px_rgba(204,255,0,0.25)] hover:shadow-[0_0_32px_rgba(204,255,0,0.4)] hover:bg-[#D4FF33] transition-all flex items-center justify-center gap-2 tracking-wide">
          Review Swap
        </button>
      </main>
      <BottomNavigation />
    </div>
  )
}
