import { useCallback, useEffect, useState } from 'react'
import { Search, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ArrowDownToLine, CheckCircle2, Clock, XCircle, Loader2, RefreshCw, X, Wallet, FileSearch } from 'lucide-react'
import { useTonAddress } from '@tonconnect/ui-react'
import { useWalletConnection } from '../hooks/useWalletConnection'
import { fetchEVMHistory, fetchSolanaHistory } from '../services/explorer'
import type { Transaction } from '../types/transaction'

type TxFilter = 'all' | 'sent' | 'received' | 'swap'

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

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: 'text-neon', label: 'Completed' },
  pending: { icon: Clock, color: 'text-yellow-400', label: 'Pending' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
}

export default function HistoryPage() {
  const [activeFilter, setActiveFilter] = useState<TxFilter>('all')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { evm, solana } = useWalletConnection()
  const tonAddress = useTonAddress()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const promises: Promise<Transaction[]>[] = []

    if (evm.address && evm.chainId) {
      const chains = evm.chainId ? [evm.chainId] : [1, 137, 42161, 8453]
      for (const c of chains) {
        promises.push(fetchEVMHistory(evm.address, c))
      }
    }

    if (solana.address) {
      promises.push(fetchSolanaHistory(solana.address))
    }

    if (promises.length === 0) {
      setTransactions([])
      setLoading(false)
      return
    }

    const results = await Promise.all(promises)
    const all = results.flat().sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    setTransactions(all)
    setLoading(false)
  }, [evm.address, evm.chainId, solana.address, tonAddress])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 60_000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const filtered = (activeFilter === 'all'
    ? transactions
    : activeFilter === 'sent'
      ? transactions.filter((tx) => tx.type === 'send')
      : activeFilter === 'received'
        ? transactions.filter((tx) => tx.type === 'receive')
        : transactions.filter((tx) => tx.type === 'swap' || tx.type === 'bridge')
  ).filter(tx =>
    !searchQuery ||
    tx.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.amount.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tx.usdValue && tx.usdValue.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const totalIn = transactions.filter((tx) => tx.type === 'receive').length
  const totalOut = transactions.filter((tx) => tx.type === 'send').length

  return (
    <>
      <header className="sticky top-0 pt-14 px-5 pb-6 flex justify-between items-center z-20 bg-darkbg/85 backdrop-blur-[12px] border-b border-white/5" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <h1 className="text-[22px] font-bold tracking-tight">History</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchAll}
            disabled={loading}
            className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-neon hover:border-neon/50 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
          <button onClick={() => setShowSearch(!showSearch)} className="w-10 h-10 rounded-full bg-surface border border-surfaceLight flex items-center justify-center text-zinc-300 hover:text-neon hover:border-neon/50 transition-colors">
            <Search size={18} />
          </button>
        </div>
      </header>

      <div className="px-5 mt-4 mb-6">
        <div className="bg-surface/50 border border-surfaceLight rounded-[20px] p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-zinc-500 font-medium tracking-wide uppercase">Total Transactions</span>
            <span className="text-xs text-zinc-400">All time</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-[28px] font-bold font-mono tracking-tight">{transactions.length}</p>
            <div className="flex items-center gap-3 text-[12px]">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <div className="w-2 h-2 rounded-full bg-neon" />
                <span className="font-mono font-medium">{totalIn}</span>
                <span className="text-zinc-500">in</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <div className="w-2 h-2 rounded-full text-red-500 flex items-center justify-center">
                  <ArrowUpRight size={8} />
                </div>
                <span className="font-mono font-medium">{totalOut}</span>
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

      {showSearch && (
        <div className="px-5 mb-4">
          <div className="flex items-center gap-2 bg-surface/50 border border-surfaceLight rounded-xl px-3.5 py-2.5">
            <Search size={16} className="text-zinc-500 shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by token, amount..."
              className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600 font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="px-5 flex flex-col gap-2.5 pb-4">
        {loading && (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
            {evm.address || solana.address || tonAddress ? (
              <FileSearch size={32} className="text-zinc-600" />
            ) : (
              <Wallet size={32} className="text-zinc-600" />
            )}
            <p className="text-sm">{evm.address || solana.address || tonAddress ? 'No history found' : 'No wallet connected'}</p>
          </div>
        )}

        {filtered.map((tx) => {
          const type = typeConfig[tx.type] || typeConfig.receive
          const TypeIcon = type.icon
          const status = statusConfig[tx.status] || statusConfig.completed
          const StatusIcon = status.icon

          return (
            <div
              key={tx.id}
              className="flex items-center justify-between bg-surface/50 p-3.5 rounded-[18px] border border-surfaceLight hover:bg-surface transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-full ${type.bg} flex items-center justify-center ${type.color} relative`}>
                  <TypeIcon size={16} />
                  {tx.type === 'swap' && tx.tokenLogo && (
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
                    {tx.chainId && (
                      <>
                        <span className="text-[9px] text-zinc-600">●</span>
                        <span className="text-[11px] text-zinc-500 font-mono">EVM</span>
                      </>
                    )}
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
