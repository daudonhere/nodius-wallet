import { useState } from 'react'
import { ArrowLeft, ChevronDown, QrCode, BookUser, Zap, Settings2, History } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BottomNavigation from '../components/BottomNavigation'

interface TokenOption {
  symbol: string
  name: string
  icon: string
  balance: string
  usd: string
}

const tokens: TokenOption[] = [
  { symbol: 'ETH', name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', balance: '1.54', usd: '$3,450.20' },
  { symbol: 'USDC', name: 'USD Coin', icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg', balance: '200.00', usd: '$200.00' },
  { symbol: 'SOL', name: 'Solana', icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg', balance: '15.20', usd: '$2,170.56' },
]

const recentAddresses = [
  { label: '0x4F9...A1b2', name: 'Main Wallet' },
  { label: '8xYv...2pQ1', name: 'Phantom Savings' },
]

export default function TransferPage() {
  const navigate = useNavigate()
  const [address, setAddress] = useState('')
  const [selectedToken] = useState<TokenOption>(tokens[0])
  const [amount, setAmount] = useState('')
  const [network] = useState('Ethereum')

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
        <h1 className="text-base font-bold tracking-wide">Transfer</h1>
        <button className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white transition-colors relative">
          <Settings2 size={18} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 z-10 px-5">
        <div className="mt-2 mb-4">
          <label className="text-xs text-zinc-400 font-medium mb-2 block">Recipient Address</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter wallet address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-surface border border-surfaceLight rounded-[20px] py-4 px-4 pr-24 text-sm font-mono text-white placeholder-zinc-600 outline-none focus:border-neon/50 transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5">
              <button className="w-9 h-9 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400 hover:text-neon hover:border-neon/30 transition-all border border-transparent">
                <QrCode size={16} />
              </button>
              <button className="w-9 h-9 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400 hover:text-neon hover:border-neon/30 transition-all border border-transparent">
                <BookUser size={16} />
              </button>
            </div>
          </div>

          {recentAddresses.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {recentAddresses.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setAddress(r.label)}
                  className="flex items-center gap-1.5 bg-surfaceLight/50 border border-white/5 rounded-full px-3 py-1.5 text-xs text-zinc-300 hover:bg-surfaceLight hover:text-white transition-colors"
                >
                  <History size={12} className="text-zinc-500" />
                  {r.label}
                  <span className="text-zinc-500">({r.name})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface border border-surfaceLight rounded-[28px] p-5 shadow-lg mb-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-zinc-400 font-medium">Amount</span>
            <span className="text-[11px] text-zinc-500 font-mono">
              Bal: {selectedToken.balance} {selectedToken.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent border-none outline-none font-mono text-[40px] font-bold text-white w-[55%] placeholder-zinc-800 tracking-tight"
            />
            <button className="flex items-center gap-2 bg-surfaceLight hover:bg-surfaceLight/80 transition-colors py-2.5 px-3.5 rounded-full border border-white/5 shadow-sm">
              <img src={selectedToken.icon} alt={selectedToken.symbol} className="w-[22px] h-[22px]" />
              <span className="font-bold text-[15px]">{selectedToken.symbol}</span>
              <ChevronDown size={14} className="text-zinc-400 ml-0.5" />
            </button>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-1.5">
              {['25%', '50%', '75%', 'Max'].map((pct) => (
                <button
                  key={pct}
                  className="text-[11px] font-bold bg-surfaceLight border border-white/5 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-white hover:border-neon/30 transition-colors"
                >
                  {pct}
                </button>
              ))}
            </div>
            <span className="text-xs text-zinc-500 font-mono">{selectedToken.usd}</span>
          </div>
        </div>

        <div className="bg-surface/60 border border-surfaceLight rounded-[20px] p-4 mb-6">
          <div className="flex justify-between items-center mb-3.5 text-[13px]">
            <span className="text-zinc-400 font-medium">Network</span>
            <button className="flex items-center gap-1.5 font-medium text-zinc-200 hover:text-white transition-colors">
              <img src="https://cryptologos.cc/logos/ethereum-eth-logo.svg" alt={network} className="w-4 h-4" />
              {network}
              <ChevronDown size={14} className="text-zinc-500" />
            </button>
          </div>
          <div className="flex justify-between items-center mb-3.5 text-[13px]">
            <span className="text-zinc-400 font-medium">Network Fee</span>
            <div className="flex items-center gap-2">
              <span className="line-through text-zinc-600 font-mono">$2.40</span>
              <div className="flex items-center gap-1 bg-neon/10 px-2 py-0.5 rounded-md">
                <Zap size={12} className="text-neon" />
                <span className="text-neon font-bold text-[11px] uppercase tracking-wide">Free</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-zinc-400 font-medium">Total</span>
            <span className="text-white font-bold font-mono">
              {amount || '0'} {selectedToken.symbol}
            </span>
          </div>
        </div>

        <button className="w-full bg-neon text-black font-extrabold text-[15px] py-4 rounded-[20px] shadow-[0_0_24px_rgba(204,255,0,0.25)] hover:shadow-[0_0_32px_rgba(204,255,0,0.4)] hover:bg-[#D4FF33] transition-all flex items-center justify-center gap-2 tracking-wide">
          Review Transfer
        </button>
      </main>
      <BottomNavigation />
    </div>
  )
}
