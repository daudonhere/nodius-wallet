import { ArrowLeft, TrendingUp, TrendingDown, Flame } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BottomNavigation from '../components/BottomNavigation'

const allCoins = [
  { name: 'Bitcoin', symbol: 'BTC', price: '$64,230.50', change: '+2.45%', up: true, color: '#F7931A', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg' },
  { name: 'Ethereum', symbol: 'ETH', price: '$3,450.20', change: '+1.20%', up: true, color: '#627EEA', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' },
  { name: 'Solana', symbol: 'SOL', price: '$142.80', change: '-0.84%', up: false, color: '#14F195', icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg' },
  { name: 'Cardano', symbol: 'ADA', price: '$0.48', change: '+3.20%', up: true, color: '#0033AD', icon: 'https://cryptologos.cc/logos/cardano-ada-logo.svg' },
  { name: 'Polkadot', symbol: 'DOT', price: '$7.82', change: '+5.10%', up: true, color: '#E6007A', icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.svg' },
  { name: 'Avalanche', symbol: 'AVAX', price: '$35.20', change: '+4.80%', up: true, color: '#E84142', icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.svg' },
  { name: 'Chainlink', symbol: 'LINK', price: '$14.65', change: '+2.10%', up: true, color: '#375BD2', icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg' },
  { name: 'Polygon', symbol: 'MATIC', price: '$0.72', change: '-1.30%', up: false, color: '#8247E5', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg' },
  { name: 'Arbitrum', symbol: 'ARB', price: '$1.05', change: '+6.50%', up: true, color: '#2D374B', icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg' },
  { name: 'Dogecoin', symbol: 'DOGE', price: '$0.12', change: '+8.20%', up: true, color: '#C2A633', icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.svg' },
  { name: 'Toncoin', symbol: 'TON', price: '$6.90', change: '+1.50%', up: true, color: '#0098EA', icon: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg' },
  { name: 'Uniswap', symbol: 'UNI', price: '$9.40', change: '-2.10%', up: false, color: '#FF007A', icon: 'https://cryptologos.cc/logos/uniswap-uni-logo.svg' },
]

export default function TrendingPage() {
  const navigate = useNavigate()

  return (
    <div className="w-full h-screen flex flex-col bg-darkbg text-white font-sans overflow-hidden relative selection:bg-neon selection:text-black">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-neon/5 rounded-full blur-[100px] pointer-events-none" />

      <header className="sticky top-0 pt-10 pb-6 px-5 flex items-center gap-3 z-20 bg-darkbg">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Trending</h1>
          <p className="text-[11px] text-zinc-500 font-medium flex items-center gap-1">
            <Flame size={12} className="text-neon" />
            Top cryptocurrencies by volume
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 z-10 px-5">
        <div className="flex flex-col gap-3">
          {allCoins.map((coin, i) => (
            <div
              key={coin.symbol}
              className="flex items-center justify-between bg-surface/50 p-3.5 rounded-[18px] border border-surfaceLight hover:bg-surface transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <span className="text-[11px] text-zinc-600 font-mono w-5">{i + 1}</span>
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
      </main>
      <BottomNavigation />
    </div>
  )
}
