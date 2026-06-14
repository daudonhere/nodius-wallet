import { useState } from 'react'
import { ArrowLeft, ChevronDown, ArrowDownUp, Info, Clock, ChevronRight, Globe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BottomNavigation from '../components/BottomNavigation'

interface ChainInfo {
  name: string
  icon: string
  symbol: string
}

const chains: ChainInfo[] = [
  { name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', symbol: 'ETH' },
  { name: 'Solana', icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg', symbol: 'SOL' },
  { name: 'Polygon', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg', symbol: 'MATIC' },
  { name: 'Arbitrum', icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg', symbol: 'ARB' },
]

const bridgeFee = { amount: '0.0005', usd: '$8.40' }
const estimatedTime = '~3 min'

export default function BridgePage() {
  const navigate = useNavigate()
  const [fromChain, setFromChain] = useState<ChainInfo>(chains[0])
  const [toChain, setToChain] = useState<ChainInfo>(chains[1])
  const [amount, setAmount] = useState('1.0')
  const token = 'ETH'

  const handleFlip = () => {
    const temp = fromChain
    setFromChain(toChain)
    setToChain(temp)
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
        <h1 className="text-base font-bold tracking-wide">Bridge</h1>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 z-10 px-5">
        <div className="mt-2 bg-surface border border-surfaceLight rounded-[28px] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs text-zinc-400 font-medium">From</span>
            <span className="text-[11px] text-zinc-500 font-mono">Bal: 1.54 {token}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 bg-surfaceLight rounded-full px-3 py-1.5 border border-white/5">
              <img src={fromChain.icon} alt={fromChain.name} className="w-5 h-5 rounded-full" />
              <span className="text-sm font-bold">{fromChain.name}</span>
              <ChevronDown size={14} className="text-zinc-400" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent border-none outline-none font-mono text-[28px] font-bold text-white w-[120px] text-right placeholder-zinc-800 tracking-tight"
              />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 bg-surfaceLight/50 rounded-full px-2.5 py-1 border border-white/5">
              <img src="https://cryptologos.cc/logos/ethereum-eth-logo.svg" alt={token} className="w-4 h-4" />
              <span className="text-xs font-semibold">{token}</span>
              <ChevronDown size={10} className="text-zinc-400" />
            </div>
            <span className="text-xs text-zinc-500 font-mono">$3,450.20</span>
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
            <div className="flex items-center gap-2.5 bg-surfaceLight rounded-full px-3 py-1.5 border border-white/5">
              <img src={toChain.icon} alt={toChain.name} className="w-5 h-5 rounded-full" />
              <span className="text-sm font-bold">{toChain.name}</span>
              <ChevronDown size={14} className="text-zinc-400" />
            </div>
            <span className="font-mono text-[28px] font-bold text-white">{amount}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 bg-surfaceLight/50 rounded-full px-2.5 py-1 border border-white/5">
              <img src="https://cryptologos.cc/logos/ethereum-eth-logo.svg" alt={token} className="w-4 h-4" />
              <span className="text-xs font-semibold">{token}</span>
              <ChevronDown size={10} className="text-zinc-400" />
            </div>
            <span className="text-xs text-zinc-500 font-mono">~$3,450.20</span>
          </div>
        </div>

        <div className="mt-6 bg-surface/60 border border-surfaceLight rounded-[20px] p-4 mb-6">
          <div className="flex justify-between items-center mb-3.5 text-[13px]">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              Bridge Fee
              <Info size={14} className="text-zinc-500" />
            </span>
            <span className="font-mono font-medium text-zinc-200">{bridgeFee.amount} {token} <span className="text-zinc-500">({bridgeFee.usd})</span></span>
          </div>
          <div className="flex justify-between items-center mb-3.5 text-[13px]">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              Estimated Time
              <Clock size={14} className="text-zinc-500" />
            </span>
            <span className="text-zinc-200 font-medium">{estimatedTime}</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              Route
              <Globe size={14} className="text-zinc-500" />
            </span>
            <button className="font-medium text-zinc-200 flex items-center gap-1 hover:text-white transition-colors">
              {fromChain.name} → {toChain.name}
              <ChevronRight size={14} className="text-zinc-500" />
            </button>
          </div>
        </div>

        <button className="w-full bg-neon text-black font-extrabold text-[15px] py-4 rounded-[20px] shadow-[0_0_24px_rgba(204,255,0,0.25)] hover:shadow-[0_0_32px_rgba(204,255,0,0.4)] hover:bg-[#D4FF33] transition-all flex items-center justify-center gap-2 tracking-wide">
          Review Bridge
        </button>
      </main>
      <BottomNavigation />
    </div>
  )
}
