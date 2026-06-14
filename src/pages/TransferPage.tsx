import { useState } from 'react'
import { ArrowLeft, QrCode, BookUser, Zap, Settings2, CheckCircle2, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useTonAddress } from '@tonconnect/ui-react'
import BottomNavigation from '../components/BottomNavigation'
import NeonButton from '../components/NeonButton'
import TokenSelectButton from '../components/TokenSelectButton'
import QuickAmount from '../components/QuickAmount'
import { useTransfer } from '../hooks/useTransfer'
import { useBalances } from '../hooks/useBalances'

type Network = 'Ethereum' | 'Solana' | 'TON'

const networks: { key: Network; icon: string }[] = [
  { key: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' },
  { key: 'Solana', icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg' },
  { key: 'TON', icon: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg' },
]

export default function TransferPage() {
  const navigate = useNavigate()
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [network, setNetwork] = useState<Network>('Ethereum')

  const { address: evmAddress } = useAccount()
  const solanaWallet = useSolanaWallet()
  const tonAddress = useTonAddress()
  const { tokens } = useBalances()
  const transfer = useTransfer()

  const isConnected = network === 'Ethereum' ? !!evmAddress
    : network === 'Solana' ? !!solanaWallet.publicKey
    : !!tonAddress

  const handleTransfer = async () => {
    if (!address || !amount) return
    try {
      if (network === 'Ethereum') await transfer.sendEVM(address, amount)
      else if (network === 'Solana') await transfer.sendSolana(address, amount)
      else await transfer.sendTON(address, amount)
    } catch {}
  }

  return (
    <div className="w-full h-screen flex flex-col bg-darkbg text-white font-sans overflow-hidden relative selection:bg-neon selection:text-black">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-neon/5 rounded-full blur-[100px] pointer-events-none" />

      <header className="shrink-0 pt-14 px-5 pb-4 flex justify-between items-center z-20 bg-darkbg/85 backdrop-blur-[12px]" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold tracking-wide">Transfer</h1>
        <button className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-white transition-colors relative">
          <Settings2 size={18} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 z-10 px-5">
        {transfer.state === 'success' ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-neon/10 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-neon" />
            </div>
            <h2 className="text-xl font-bold">Transfer Sent</h2>
            <p className="text-zinc-400 text-sm font-mono break-all text-center max-w-xs">{transfer.txHash}</p>
            <NeonButton onClick={() => { transfer.reset(); navigate(-1) }}>Done</NeonButton>
          </div>
        ) : (
          <>
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
            </div>

            <div className="bg-surface border border-surfaceLight rounded-[28px] p-5 shadow-lg mb-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-zinc-400 font-medium">Amount</span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  Bal: {tokens.find(t => t.symbol === (network === 'Ethereum' ? 'ETH' : network === 'Solana' ? 'SOL' : 'TON'))?.balance ?? '—'}
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
                <TokenSelectButton
                  symbol={network === 'Ethereum' ? 'ETH' : network === 'Solana' ? 'SOL' : 'TON'}
                  icon={networks.find(n => n.key === network)?.icon ?? ''}
                />
              </div>
              <div className="flex justify-between items-center">
                <QuickAmount onSelect={(pct) => {
                  const bal = tokens.find(t => t.symbol === (network === 'Ethereum' ? 'ETH' : network === 'Solana' ? 'SOL' : 'TON'))?.balance
                  if (bal && bal !== '—') {
                    const num = parseFloat(bal) * (pct === 'Max' ? 1 : parseInt(pct) / 100)
                    setAmount(num.toFixed(6))
                  }
                }} />
              </div>
            </div>

            <div className="bg-surface/60 border border-surfaceLight rounded-[20px] p-4 mb-6">
              <div className="flex justify-between items-center mb-3.5 text-[13px]">
                <span className="text-zinc-400 font-medium">Network</span>
                <div className="flex gap-1.5">
                  {networks.map((n) => (
                    <button
                      key={n.key}
                      onClick={() => setNetwork(n.key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        network === n.key
                          ? 'bg-surfaceLight text-white border border-white/5'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <img src={n.icon} alt={n.key} className="w-3.5 h-3.5" />
                      {n.key}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-zinc-400 font-medium">Network Fee</span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-zinc-600 font-mono">$2.40</span>
                  <div className="flex items-center gap-1 bg-neon/10 px-2 py-0.5 rounded-md">
                    <Zap size={12} className="text-neon" />
                    <span className="text-neon font-bold text-[11px] uppercase tracking-wide">Free</span>
                  </div>
                </div>
              </div>
            </div>

            {!isConnected && (
              <p className="text-center text-zinc-500 text-sm mb-3">Connect a {network} wallet to send</p>
            )}

            <NeonButton
              onClick={handleTransfer}
              disabled={!isConnected || !address || !amount || transfer.state === 'signing' || transfer.state === 'broadcasting'}
            >
              {transfer.state === 'signing' || transfer.state === 'broadcasting' ? (
                <><Loader2 size={18} className="animate-spin" /> Sending...</>
              ) : (
                'Review Transfer'
              )}
            </NeonButton>

            {transfer.state === 'error' && (
              <p className="text-red-500 text-xs text-center mt-2">{transfer.error || 'Transaction failed'}</p>
            )}
          </>
        )}
      </main>
      <BottomNavigation />
    </div>
  )
}
