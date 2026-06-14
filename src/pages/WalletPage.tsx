import { Copy, MoreVertical, ArrowDownToLine, Power, Plus, TrendingUp, Wallet } from 'lucide-react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useTonAddress, useTonConnectModal } from '@tonconnect/ui-react'
import { injected } from 'wagmi/connectors'
import { useBalances } from '../hooks/useBalances'

export default function WalletPage() {
  const { address: evmAddress, isConnected: evmConnected } = useAccount()
  const { connect: evmConnect } = useConnect()
  const { disconnect: evmDisconnect } = useDisconnect()
  const solanaWallet = useSolanaWallet()
  const tonModal = useTonConnectModal()
  const tonAddress = useTonAddress()
  const { tokens, prices } = useBalances()

  const totalUsd = tokens.reduce((sum, t) => {
    const price = prices[t.symbol]?.price ?? 0
    return sum + parseFloat(t.balance || '0') * price
  }, 0)

  return (
    <>
      <header className="sticky top-0 pt-14 px-5 pb-4 flex justify-between items-center z-20 bg-darkbg/85 backdrop-blur-[12px]" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <h1 className="text-[22px] font-bold tracking-tight">Wallets</h1>
        <button className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-neon hover:border-neon/50 transition-colors shadow-sm">
          <Wallet size={20} />
        </button>
      </header>

      <div className="px-5 mb-8 text-center relative z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-1.5 bg-surfaceLight/50 px-3 py-1 rounded-full border border-white/5 mb-3">
          <span className="text-neon text-xs font-medium">Total Portfolio Value</span>
        </div>
        <h2 className="text-[40px] font-bold font-mono tracking-tight leading-none mb-1">
          ${totalUsd.toLocaleString()}<span className="text-zinc-500 text-3xl">.00</span>
        </h2>
        <div className="flex items-center gap-1 text-neon">
          <TrendingUp size={12} />
          <p className="text-[13px] font-semibold">Connected wallets</p>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-4 relative z-10">

        {evmConnected && evmAddress && (
          <div className="bg-gradient-to-br from-[#121212] to-[#0a0a0a] rounded-[24px] p-5 border border-neon/40 relative overflow-hidden shadow-[0_0_20px_rgba(204,255,0,0.05)]">
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-neon opacity-10 rounded-full blur-[30px] pointer-events-none" />
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="EVM" className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-[15px]">EVM Wallet</h3>
                    <span className="px-2 py-[2px] rounded text-[9px] font-bold bg-neon/15 text-neon border border-neon/30 uppercase tracking-widest">Main</span>
                  </div>
                  <button className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors group">
                    <span className="font-mono text-xs">{evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}</span>
                    <Copy size={10} className="opacity-70 group-hover:opacity-100" />
                  </button>
                </div>
              </div>
              <button className="text-zinc-500 hover:text-white p-1 -mr-1">
                <MoreVertical size={18} />
              </button>
            </div>
            <div className="mb-5 relative z-10">
              <p className="text-[26px] font-bold font-mono tracking-tight">
                ${(prices.ETH?.price ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2.5 relative z-10">
              <button className="flex-1 bg-surfaceLight hover:bg-surfaceLight/80 text-white text-xs font-semibold py-3 rounded-xl border border-white/5 transition-colors flex items-center justify-center gap-1.5">
                <ArrowDownToLine size={14} className="text-neon" />
                Receive
              </button>
              <button
                onClick={() => evmDisconnect()}
                className="flex-[0.4] bg-surfaceLight/50 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 text-xs font-semibold py-3 rounded-xl border border-white/5 hover:border-red-500/20 transition-colors flex items-center justify-center"
              >
                <Power size={18} />
              </button>
            </div>
          </div>
        )}

        {solanaWallet.connected && solanaWallet.publicKey && (
          <div className="bg-surface/60 rounded-[24px] p-5 border border-surfaceLight relative overflow-hidden">
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <img src="https://iconic.directory/assets/phantom/logos/v1/color.svg" alt="Solana" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-zinc-300 mb-0.5">Solana Wallet</h3>
                  <button className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors group">
                    <span className="font-mono text-xs">{solanaWallet.publicKey.toBase58().slice(0, 6)}...{solanaWallet.publicKey.toBase58().slice(-4)}</span>
                    <Copy size={10} className="opacity-70 group-hover:opacity-100" />
                  </button>
                </div>
              </div>
              <button className="text-zinc-600 hover:text-white p-1 -mr-1">
                <MoreVertical size={18} />
              </button>
            </div>
            <div className="mb-5 relative z-10">
              <p className="text-[22px] font-bold font-mono tracking-tight text-zinc-300">
                ${(prices.SOL?.price ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2.5 relative z-10">
              <button className="flex-1 bg-surface hover:bg-surfaceLight text-zinc-300 text-xs font-semibold py-3 rounded-xl border border-white/5 transition-colors">
                Set as Main
              </button>
              <button
                onClick={() => solanaWallet.disconnect()}
                className="flex-[0.4] bg-surface hover:bg-red-500/10 text-zinc-500 hover:text-red-500 text-xs font-semibold py-3 rounded-xl border border-white/5 hover:border-red-500/20 transition-colors flex items-center justify-center"
              >
                <Power size={18} />
              </button>
            </div>
          </div>
        )}

        {tonAddress && (
          <div className="bg-surface/60 rounded-[24px] p-5 border border-surfaceLight relative overflow-hidden">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <img src="https://cryptologos.cc/logos/toncoin-ton-logo.svg" alt="TON" className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-zinc-300 mb-0.5">TON Wallet</h3>
                <span className="font-mono text-xs text-zinc-500">{tonAddress.slice(0, 6)}...{tonAddress.slice(-4)}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (!evmConnected) evmConnect({ connector: injected() })
            if (!solanaWallet.connected && solanaWallet.wallets.length > 0) solanaWallet.select(solanaWallet.wallets[0]?.adapter.name ?? '')
            if (!tonAddress) tonModal.open()
          }}
          className="w-full bg-transparent hover:bg-surface/40 border-2 border-dashed border-surfaceLight hover:border-neon/40 rounded-[24px] p-5 flex flex-col items-center justify-center gap-3 transition-all mt-2 group"
        >
          <div className="w-10 h-10 rounded-full bg-surfaceLight group-hover:bg-neon/10 flex items-center justify-center transition-colors">
            <Plus size={20} className="text-zinc-400 group-hover:text-neon transition-colors" />
          </div>
          <span className="text-[13px] font-semibold text-zinc-400 group-hover:text-white transition-colors">Connect New Wallet</span>
        </button>
      </div>
    </>
  )
}
