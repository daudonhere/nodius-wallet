import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrCode, Bell, ChevronDown, Copy, ArrowLeftRight, GitMerge, Send, ArrowDownToLine, CreditCard, Flame, TrendingUp, TrendingDown, MoreHorizontal, Wallet } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useTonAddress } from '@tonconnect/ui-react'
import { useBalances } from '../hooks/useBalances'

const walletIcons: Record<string, string> = {
  EVM: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
  Solana: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"%3E%3Cdefs%3E%3ClinearGradient id="a" x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse"%3E%3Cstop offset="0" stop-color="%23ab9ff2"/%3E%3Cstop offset="1" stop-color="%236352a0"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="128" height="128" rx="28" fill="url(%23a)"/%3E%3Cpath d="M88.2 48.2H50.7c-1.5 0-2.3 1.8-1.2 2.9l13.7 13.7c.6.6 1.4.9 2.3.9h25.6c1.5 0 2.3-1.8 1.2-2.9L78.6 49.1c-.6-.6-1.4-.9-2.3-.9h11.9zM44.7 62.2c0-1.5-1.8-2.3-2.9-1.2L28.1 74.7c-.6.6-.9 1.4-.9 2.3v12.4c0 1.5 1.8 2.3 2.9 1.2l13.7-13.7c.6-.6.9-1.4.9-2.3V62.2z" fill="%23fff"/%3E%3C/svg%3E',
  TON: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg',
}

interface WalletCard {
  name: string
  icon: string
  address: string
  balance: string
  glow: string
}

export default function HomePage() {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const { tokens, trending, prices } = useBalances()
  const { address: evmAddress, isConnected: evmConnected } = useAccount()
  const solanaWallet = useSolanaWallet()
  const tonAddress = useTonAddress()

  const wallets: WalletCard[] = [
    ...(evmConnected && evmAddress ? [{
      name: 'MetaMask', icon: walletIcons.EVM, address: `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`, balance: tokens.find(t => t.symbol === 'ETH')?.balance ?? '0', glow: 'bg-neon',
    }] : []),
    ...(solanaWallet.connected && solanaWallet.publicKey ? [{
      name: 'Phantom', icon: walletIcons.Solana, address: `${solanaWallet.publicKey.toBase58().slice(0, 4)}...${solanaWallet.publicKey.toBase58().slice(-4)}`, balance: tokens.find(t => t.symbol === 'SOL')?.balance ?? '0', glow: 'bg-[#ab9ff2]',
    }] : []),
    ...(tonAddress ? [{
      name: 'TON Wallet', icon: walletIcons.TON, address: `${tonAddress.slice(0, 4)}...${tonAddress.slice(-4)}`, balance: '—', glow: 'bg-[#0098EA]',
    }] : []),
  ]

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector('div:first-child')?.clientWidth ?? 1
    setActiveIndex(Math.round(el.scrollLeft / (cardWidth + 16)))
  }

  return (
    <>
      <header className="sticky top-0 pt-10 pb-6 px-5 flex justify-between items-center z-20 bg-darkbg/85 backdrop-blur-[12px]" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center">
            <Wallet size={20} className="text-neon" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-400 font-medium tracking-wide uppercase">
              {evmConnected || solanaWallet.connected || tonAddress ? 'Connected' : 'Demo'}
            </p>
            <button className="flex items-center gap-1.5 text-sm font-bold">
              {evmConnected ? `ETH: ${prices.ETH?.price ? '$' + prices.ETH.price : '—'}`
                : solanaWallet.connected ? `SOL: ${prices.SOL?.price ? '$' + prices.SOL.price : '—'}`
                : 'Nodius Wallet'}
              <ChevronDown className="text-zinc-500" size={14} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white hover:border-neon/50 transition-colors">
            <QrCode size={18} />
          </button>
          <button className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 relative hover:text-white hover:border-neon/50 transition-colors">
            <Bell size={18} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-neon rounded-full shadow-[0_0_8px_#CCFF00]" />
          </button>
        </div>
      </header>

      {wallets.length > 0 && (
        <div className="mt-4 mb-5">
          <div ref={scrollRef} onScroll={handleScroll} className="flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar px-5 pb-2">
            {wallets.map((wallet) => (
              <div key={wallet.name} className="snap-center shrink-0 w-[88%] bg-gradient-to-br from-[#111111] to-[#0a0a0a] rounded-[28px] p-6 border border-surfaceLight relative overflow-hidden">
                <div className={`absolute -right-10 -top-10 w-32 h-32 ${wallet.glow} opacity-10 rounded-full blur-[40px]`} />
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex items-center gap-2.5 bg-surfaceLight/50 px-3 py-1.5 rounded-full border border-white/5">
                    <img src={wallet.icon} alt={wallet.name} className="w-5 h-5" />
                    <span className="text-xs font-semibold text-zinc-300">{wallet.name}</span>
                  </div>
                  <button className="text-zinc-500 hover:text-neon transition-colors">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <div className="relative z-10">
                  <p className="text-xs text-zinc-400 font-medium mb-1">Total Balance</p>
                  <h2 className="text-[32px] font-bold font-mono tracking-tight mb-1">
                    {wallet.balance}
                  </h2>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <TrendingUp size={10} className="text-neon" />
                      <span className="text-[11px] font-bold text-neon">{prices[wallet.name === 'MetaMask' ? 'ETH' : wallet.name === 'Phantom' ? 'SOL' : 'TON']?.change24h?.toFixed(2) ?? '—'}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-zinc-500 font-mono bg-surfaceLight/50 px-2 py-1 rounded-md">{wallet.address}</p>
                    <button className="text-zinc-400 hover:text-white">
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2 mt-2">
            {wallets.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'bg-neon w-4' : 'bg-zinc-600'}`} />
            ))}
          </div>
        </div>
      )}

      <div className="px-5 mb-8">
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => navigate('/swap')} className="bg-surface border border-surfaceLight rounded-[20px] p-4 flex flex-col items-center justify-center gap-3 hover:border-neon hover:bg-surfaceLight transition-all group">
            <div className="w-12 h-12 rounded-full bg-darkbg border border-surfaceLight flex items-center justify-center text-white group-hover:text-neon group-hover:border-neon/50 transition-colors">
              <ArrowLeftRight size={20} />
            </div>
            <span className="text-[13px] font-semibold">Swap</span>
          </button>
          <button onClick={() => navigate('/bridge')} className="bg-surface border border-surfaceLight rounded-[20px] p-4 flex flex-col items-center justify-center gap-3 hover:border-neon hover:bg-surfaceLight transition-all group">
            <div className="w-12 h-12 rounded-full bg-darkbg border border-surfaceLight flex items-center justify-center text-white group-hover:text-neon group-hover:border-neon/50 transition-colors">
              <GitMerge size={20} />
            </div>
            <span className="text-[13px] font-semibold">Bridge</span>
          </button>
          <button onClick={() => navigate('/transfer')} className="bg-surface border border-surfaceLight rounded-[20px] p-4 flex flex-col items-center justify-center gap-3 hover:border-neon hover:bg-surfaceLight transition-all group">
            <div className="w-12 h-12 rounded-full bg-darkbg border border-surfaceLight flex items-center justify-center text-white group-hover:text-neon group-hover:border-neon/50 transition-colors">
              <Send size={20} />
            </div>
            <span className="text-[13px] font-semibold">Transfer</span>
          </button>
        </div>
      </div>

      <div className="px-5 mb-8">
        <div className="flex gap-3">
          <button className="flex-1 bg-surfaceLight/50 text-white text-sm font-semibold py-3.5 rounded-xl border border-white/5 flex items-center justify-center gap-2 hover:bg-surfaceLight transition-colors">
            <ArrowDownToLine size={16} className="text-neon" />
            Receive
          </button>
          <button className="flex-1 bg-surfaceLight/50 text-white text-sm font-semibold py-3.5 rounded-xl border border-white/5 flex items-center justify-center gap-2 hover:bg-surfaceLight transition-colors">
            <CreditCard size={16} className="text-neon" />
            Buy Crypto
          </button>
        </div>
      </div>

      <div className="px-5">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-bold flex items-center gap-2">
            Trending
            <Flame size={16} className="text-neon" />
          </h3>
          <button onClick={() => navigate('/trending')} className="text-zinc-400 text-xs font-semibold hover:text-white transition-colors">View All</button>
        </div>

        <div className="flex flex-col gap-3">
          {trending.slice(0, 5).map((coin) => (
            <div key={coin.symbol} className="flex items-center justify-between bg-surface/50 p-3.5 rounded-[18px] border border-surfaceLight hover:bg-surface transition-colors cursor-pointer">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${coin.color}1A` }}>
                  <img src={coin.icon} alt={coin.symbol} className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-[15px]">{coin.name}</h4>
                  <p className="text-[11px] text-zinc-500 font-medium uppercase">{coin.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <h4 className="font-bold text-[15px] font-mono">{coin.price}</h4>
                <div className={`flex items-center justify-end gap-1 mt-0.5 ${coin.up ? 'text-neon' : 'text-red-500'}`}>
                  {coin.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  <p className="text-xs font-semibold">{coin.change}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
