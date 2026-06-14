import { useState } from 'react'
import { Search, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ArrowDownToLine, CheckCircle2, Clock, XCircle } from 'lucide-react'

type TxFilter = 'all' | 'sent' | 'received' | 'swap'

type TxStatus = 'completed' | 'pending' | 'failed'

type Transaction = {
  id: string
  type: 'send' | 'receive' | 'swap' | 'bridge'
  token: string
  tokenLogo: string
  label: string
  amount: string
  usdValue: string
  date: string
  status: TxStatus
}

const transactions: Transaction[] = [
  { id: '1', type: 'receive', token: 'ETH', tokenLogo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', label: 'From Binance', amount: '+2.5 ETH', usdValue: '$8,625.50', date: 'Today, 14:32', status: 'completed' },
  { id: '2', type: 'send', token: 'BTC', tokenLogo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg', label: 'To MetaMask', amount: '-0.15 BTC', usdValue: '$9,634.58', date: 'Today, 11:20', status: 'completed' },
  { id: '3', type: 'swap', token: 'ETH', tokenLogo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', label: 'ETH → USDC', amount: '+3,450 USDC', usdValue: '$3,450.20', date: 'Yesterday, 22:15', status: 'completed' },
  { id: '4', type: 'receive', token: 'SOL', tokenLogo: 'https://cryptologos.cc/logos/solana-sol-logo.svg', label: 'From Phantom', amount: '+50 SOL', usdValue: '$7,140.00', date: 'Yesterday, 18:45', status: 'completed' },
  { id: '5', type: 'bridge', token: 'ETH', tokenLogo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', label: 'Ethereum → Polygon', amount: '1.0 ETH', usdValue: '$3,450.20', date: 'Yesterday, 09:30', status: 'completed' },
  { id: '6', type: 'send', token: 'USDC', tokenLogo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg', label: 'To 0x8f3...b2d1', amount: '-500 USDC', usdValue: '$500.00', date: 'Jun 12, 16:00', status: 'pending' },
  { id: '7', type: 'swap', token: 'SOL', tokenLogo: 'https://cryptologos.cc/logos/solana-sol-logo.svg', label: 'SOL → BTC', amount: '+0.045 BTC', usdValue: '$2,890.37', date: 'Jun 11, 12:10', status: 'failed' },
  { id: '8', type: 'receive', token: 'ETH', tokenLogo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', label: 'Staking Rewards', amount: '+0.02 ETH', usdValue: '$69.00', date: 'Jun 10, 08:00', status: 'completed' },
]

const filters: { key: TxFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
  { key: 'swap', label: 'Swap' },
]

const typeConfig = {
  send: { icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-500/10' },
  receive: { icon: ArrowDownLeft, color: 'text-neon', bg: 'bg-neon/10' },
  swap: { icon: ArrowLeftRight, color: 'text-[#627EEA]', bg: 'bg-[#627EEA]/10' },
  bridge: { icon: ArrowDownToLine, color: 'text-[#ab9ff2]', bg: 'bg-[#ab9ff2]/10' },
}

const statusConfig: Record<TxStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: 'text-neon', label: 'Completed' },
  pending: { icon: Clock, color: 'text-yellow-400', label: 'Pending' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
}

export default function HistoryPage() {
  const [activeFilter, setActiveFilter] = useState<TxFilter>('all')

  const filtered = activeFilter === 'all'
    ? transactions
    : activeFilter === 'sent'
      ? transactions.filter((tx) => tx.type === 'send')
      : activeFilter === 'received'
        ? transactions.filter((tx) => tx.type === 'receive')
        : transactions.filter((tx) => tx.type === 'swap' || tx.type === 'bridge')

  return (
    <>
      <header className="sticky top-0 pt-14 px-5 pb-4 flex justify-between items-center z-20 bg-darkbg/85 backdrop-blur-[12px]" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <h1 className="text-[22px] font-bold tracking-tight">History</h1>
        <button className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-neon hover:border-neon/50 transition-colors shadow-sm">
          <Search size={18} />
        </button>
      </header>

      <div className="px-5 mb-6">
        <div className="bg-surface/50 border border-surfaceLight rounded-[20px] p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-zinc-500 font-medium tracking-wide uppercase">Total Transactions</span>
            <span className="text-xs text-zinc-400">Last 30 days</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-[28px] font-bold font-mono tracking-tight">47</p>
            <div className="flex items-center gap-3 text-[12px]">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <div className="w-2 h-2 rounded-full bg-neon" />
                <span className="font-mono font-medium">32</span>
                <span className="text-zinc-500">in</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <div className="w-2 h-2 rounded-full text-red-500">
                  <ArrowUpRight size={8} />
                </div>
                <span className="font-mono font-medium">15</span>
                <span className="text-zinc-500">out</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mb-5">
        <div className="bg-darkbg border border-surfaceLight p-1 rounded-xl flex gap-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg transition-colors ${
                activeFilter === f.key
                  ? 'bg-surfaceLight text-white border border-white/5 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 flex flex-col gap-2.5 pb-4">
        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <p className="text-sm">No transactions found</p>
          </div>
        )}

        {filtered.map((tx) => {
          const type = typeConfig[tx.type]
          const TypeIcon = type.icon
          const status = statusConfig[tx.status]
          const StatusIcon = status.icon

          return (
            <div
              key={tx.id}
              className="flex items-center justify-between bg-surface/50 p-3.5 rounded-[18px] border border-surfaceLight hover:bg-surface transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-full ${type.bg} flex items-center justify-center ${type.color} relative`}>
                  <TypeIcon size={16} />
                  {tx.type === 'swap' && (
                    <img src={tx.tokenLogo} alt="" className="w-3.5 h-3.5 rounded-full absolute -bottom-0.5 -right-0.5 border border-darkbg" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-[14px]">{tx.label}</h4>
                    <span className={`flex items-center gap-0.5 ${status.color}`}>
                      <StatusIcon size={10} />
                      <span className="text-[9px] font-semibold tracking-wide uppercase">{status.label}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-zinc-500 font-medium">{tx.date}</span>
                    <span className="text-[9px] text-zinc-600">●</span>
                    <span className="text-[11px] text-zinc-500 font-mono">{tx.token}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-[14px] font-mono ${tx.type === 'send' ? 'text-red-500' : 'text-neon'}`}>
                  {tx.amount}
                </p>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">{tx.usdValue}</p>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
