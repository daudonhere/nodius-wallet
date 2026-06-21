import { Copy, Power, TrendingUp, Wallet, Check } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { useWalletConnection } from '../hooks/useWalletConnection'
import { useBalances } from '../hooks/useBalances'
import { useSettingsStore } from '../stores/settingsStore'

function fmtBalance(b: string): string {
  const n = parseFloat(b)
  if (n === 0) return '0'
  if (n >= 1) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  if (n >= 0.01) return n.toFixed(4)
  if (n >= 0.0001) return n.toFixed(6)
  return n.toFixed(8)
}

export default function WalletPage() {
  const { ready, authenticated, login } = usePrivy()
  const { evm, solana, ton } = useWalletConnection()
  const { tokens, prices } = useBalances()
  const { mainChain, setMainChain } = useSettingsStore()

  return (
    <div className="flex flex-col min-h-[80dvh]">
      <header className="sticky top-0 pt-14 px-5 pb-6 flex justify-between items-center z-20 bg-darkbg/85 backdrop-blur-[12px] border-b border-white/5" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <h1 className="text-[22px] font-bold tracking-tight">Wallets</h1>
        <button className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-neon hover:border-neon/50 transition-colors">
          <Wallet size={20} />
        </button>
      </header>

      <div className={`px-5 mt-4 flex flex-col gap-4 relative z-10 ${!authenticated ? 'flex-1 justify-center' : ''}`}>
        {!authenticated && !ton.connected && (
          <h2 className="text-[15px] font-semibold text-zinc-500/60 text-center mb-2">No Blockchain Connected</h2>
        )}

        {authenticated && evm.connected && evm.address && (
          <div className="bg-gradient-to-br from-[#121212] to-[#0a0a0a] rounded-[24px] p-5 border border-neon relative overflow-hidden shadow-none" style={{ borderColor: 'rgba(204, 255, 0, 0.15)' }}>
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-neon opacity-10 rounded-full blur-[30px] pointer-events-none" />
             <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                    <img src="https://cryptologos.cc/logos/versions/ethereum-eth-logo-diamond-purple.svg" alt="EVM Wallet" className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px]">EVM Chain</h3>
                  <button className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors group">
                    <span className="font-mono text-xs">{evm.address.slice(0, 6)}...{evm.address.slice(-4)}</span>
                    <Copy size={10} className="opacity-70 group-hover:opacity-100" />
                  </button>
                </div>
              </div>
            </div>
            <div className="mb-3 relative z-10">
              <p className="text-[26px] font-bold font-mono tracking-tight">
                {(() => { const b = tokens.find(t => t.symbol === 'ETH')?.balance ?? '0'; return parseFloat(b) === 0 ? '0' : fmtBalance(b) })()} <span className="text-sm text-zinc-400 font-sans font-normal">ETH</span>
              </p>
              <p className="text-sm text-zinc-500 font-mono mt-0.5">
                ≈ ${(parseFloat(tokens.find(t => t.symbol === 'ETH')?.balance || '0') * (prices.ETH?.price ?? 0)).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2.5 relative z-10">
              {mainChain === 'evm' ? (
                <div className="flex-1 bg-neon/10 text-neon text-xs font-semibold py-3 rounded-xl border border-neon/30 flex items-center justify-center gap-1.5">
                  <Check size={14} />
                  Main Chain
                </div>
              ) : (
                <button onClick={() => setMainChain('evm')} className="flex-1 bg-surfaceLight hover:bg-surfaceLight/80 text-white text-xs font-semibold py-3 rounded-xl border border-white/5 transition-colors flex items-center justify-center gap-1.5">
                  <TrendingUp size={14} />
                  Set as Main
                </button>
              )}
              <button
                onClick={() => evm.disconnect()}
                className="flex-[0.4] bg-surfaceLight/50 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 text-xs font-semibold py-3 rounded-xl border border-white/5 hover:border-red-500/20 transition-colors flex items-center justify-center"
              >
                <Power size={18} />
              </button>
            </div>
          </div>
        )}

        {solana.connected && solana.address && (
          <div className="bg-gradient-to-br from-[#121212] to-[#0a0a0a] rounded-[24px] p-5 border border-neon relative overflow-hidden" style={{ borderColor: 'rgba(204, 255, 0, 0.15)' }}>
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <img src="https://cryptologos.cc/logos/solana-sol-logo.svg" alt="Solana" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-zinc-300 mb-0.5">Solana Chain</h3>
                  <button className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors group">
                    <span className="font-mono text-xs">{solana.address.slice(0, 6)}...{solana.address.slice(-4)}</span>
                    <Copy size={10} className="opacity-70 group-hover:opacity-100" />
                  </button>
                </div>
              </div>
            </div>
            <div className="mb-3 relative z-10">
              <p className="text-[22px] font-bold font-mono tracking-tight text-zinc-300">
                {(() => { const b = tokens.find(t => t.symbol === 'SOL')?.balance ?? '0'; return parseFloat(b) === 0 ? '0' : fmtBalance(b) })()} <span className="text-sm text-zinc-500 font-sans font-normal">SOL</span>
              </p>
              <p className="text-sm text-zinc-500 font-mono mt-0.5">
                ≈ ${(parseFloat(tokens.find(t => t.symbol === 'SOL')?.balance || '0') * (prices.SOL?.price ?? 0)).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2.5 relative z-10">
              {mainChain === 'solana' ? (
                <div className="flex-1 bg-neon/10 text-neon text-xs font-semibold py-3 rounded-xl border border-neon/30 flex items-center justify-center gap-1.5">
                  <Check size={14} />
                  Main Chain
                </div>
              ) : (
                <button onClick={() => setMainChain('solana')} className="flex-1 bg-surface hover:bg-surfaceLight text-zinc-300 text-xs font-semibold py-3 rounded-xl border border-white/5 transition-colors">
                  Set as Main
                </button>
              )}
              <button
                onClick={() => solana.disconnect()}
                className="flex-[0.4] bg-surface hover:bg-red-500/10 text-zinc-500 hover:text-red-500 text-xs font-semibold py-3 rounded-xl border border-white/5 hover:border-red-500/20 transition-colors flex items-center justify-center"
              >
                <Power size={18} />
              </button>
            </div>
          </div>
        )}

        {ton.connected && ton.address && (
          <div className="bg-gradient-to-br from-[#121212] to-[#0a0a0a] rounded-[24px] p-5 border border-neon relative overflow-hidden" style={{ borderColor: 'rgba(204, 255, 0, 0.15)' }}>
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <img src="https://cryptologos.cc/logos/toncoin-ton-logo.svg" alt="TON" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-zinc-300 mb-0.5">TON Chain</h3>
                  <span className="font-mono text-xs text-zinc-500">{ton.address.slice(0, 6)}...{ton.address.slice(-4)}</span>
                </div>
              </div>
              <button
                onClick={() => ton.disconnect()}
                className="w-9 h-9 rounded-full bg-surface hover:bg-red-500/10 text-zinc-500 hover:text-red-500 text-xs border border-white/5 hover:border-red-500/20 transition-colors flex items-center justify-center"
              >
                <Power size={16} />
              </button>
            </div>
            <div className="flex gap-2.5 relative z-10">
              {mainChain === 'ton' ? (
                <div className="flex-1 bg-neon/10 text-neon text-xs font-semibold py-3 rounded-xl border border-neon/30 flex items-center justify-center gap-1.5">
                  <Check size={14} />
                  Main Chain
                </div>
              ) : (
                <button onClick={() => setMainChain('ton')} className="flex-1 bg-surface hover:bg-surfaceLight text-zinc-300 text-xs font-semibold py-3 rounded-xl border border-white/5 transition-colors">
                  Set as Main
                </button>
              )}
              <div className="flex-[0.4]" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {!authenticated && (
            <button
              onClick={() => login()}
              disabled={!ready}
              className="mx-auto max-w-sm w-full bg-transparent hover:bg-surface/40 border-2 border-dashed border-surfaceLight hover:border-neon/40 rounded-[24px] p-5 flex flex-col items-center justify-center gap-3 transition-all group"
            >
              <div className="flex items-center justify-center gap-3">
                <img src="https://cryptologos.cc/logos/versions/ethereum-eth-logo-diamond-purple.svg" alt="EVM" className="w-8 h-8 rounded-full ring-2 ring-zinc-700" />
                <img src="https://cryptologos.cc/logos/solana-sol-logo.svg" alt="Solana" className="w-8 h-8 rounded-full ring-2 ring-zinc-700" />
              </div>
              <span className="text-[13px] font-semibold text-zinc-400 group-hover:text-white transition-colors">{ready ? 'Connect EVM & Solana' : 'Loading...'}</span>
            </button>
          )}
          {!ton.connected && (
            <button
              onClick={() => ton.connect()}
              className="mx-auto max-w-sm w-full bg-transparent hover:bg-surface/40 border-2 border-dashed border-surfaceLight hover:border-neon/40 rounded-[24px] p-5 flex flex-col items-center justify-center gap-3 transition-all group"
            >
              <img src="https://cryptologos.cc/logos/toncoin-ton-logo.svg" alt="TON" className="w-7 h-7 rounded-full ring-2 ring-zinc-700" />
              <span className="text-[13px] font-semibold text-zinc-400 group-hover:text-white transition-colors">Connect Ton</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
