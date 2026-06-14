import { ArrowLeft, TrendingUp, TrendingDown, Flame } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BottomNavigation from '../components/BottomNavigation'
import { useBalances } from '../hooks/useBalances'

export default function TrendingPage() {
  const navigate = useNavigate()
  const { trending } = useBalances()

  return (
    <div className="w-full h-screen flex flex-col bg-darkbg text-white font-sans overflow-hidden relative selection:bg-neon selection:text-black">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-neon/5 rounded-full blur-[100px] pointer-events-none" />

      <header className="sticky top-0 pt-10 pb-6 px-5 flex items-center gap-3 z-20 bg-darkbg">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white transition-colors shrink-0">
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
          {trending.map((coin, i) => (
            <div key={coin.symbol} className="flex items-center justify-between bg-surface/50 p-3.5 rounded-[18px] border border-surfaceLight hover:bg-surface transition-colors cursor-pointer">
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
