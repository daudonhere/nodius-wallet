import { useState } from 'react'
import { X, Plus, Trash2, BookUser } from 'lucide-react'
import { useAddressStore } from '../stores/addressStore'
import type { AddressChain } from '../types/address'

const chainOptions: { key: AddressChain; label: string }[] = [
  { key: 'evm', label: 'EVM' },
  { key: 'solana', label: 'Solana' },
  { key: 'ton', label: 'TON' },
]

export default function AddressBookModal({ onSelect, onClose }: {
  onSelect: (address: string, chain: AddressChain) => void
  onClose: () => void
}) {
  const { addresses, addAddress, removeAddress } = useAddressStore()
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [address, setAddress] = useState('')
  const [chain, setChain] = useState<AddressChain>('evm')
  const [search, setSearch] = useState('')

  const filtered = addresses.filter((a) =>
    a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.address.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = () => {
    if (!label.trim() || !address.trim()) return
    addAddress(label.trim(), address.trim(), chain)
    setLabel('')
    setAddress('')
    setAdding(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md max-h-[80vh] bg-surface border border-surfaceLight rounded-t-[28px] p-5 pb-10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            <BookUser size={18} className="text-neon" />
            Address Book
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-400">
            <X size={16} />
          </button>
        </div>

        <input
          type="text"
          placeholder="Search addresses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-darkbg border border-surfaceLight rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-neon/50 mb-4"
        />

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {filtered.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">
              {search ? 'No matches' : 'No saved addresses'}
            </p>
          )}
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between bg-darkbg border border-surfaceLight rounded-[16px] p-3.5 group"
            >
              <button
                onClick={() => { onSelect(entry.address, entry.chain); onClose() }}
                className="flex-1 text-left"
              >
                <p className="text-sm font-bold">{entry.label}</p>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  {entry.address.slice(0, 10)}...{entry.address.slice(-4)}
                </p>
                <span className="text-[10px] text-zinc-600 font-medium uppercase mt-1 block">
                  {entry.chain}
                </span>
              </button>
              <button
                onClick={() => removeAddress(entry.id)}
                className="w-8 h-8 rounded-full bg-surfaceLight flex items-center justify-center text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {adding ? (
          <div className="bg-darkbg border border-surfaceLight rounded-[16px] p-4 space-y-3">
            <input
              type="text"
              placeholder="Label (e.g. Binance Deposit)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-surface border border-surfaceLight rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-neon/50"
            />
            <input
              type="text"
              placeholder="Wallet address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-surface border border-surfaceLight rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 font-mono outline-none focus:border-neon/50"
            />
            <div className="flex gap-2">
              {chainOptions.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setChain(c.key)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    chain === c.key
                      ? 'bg-neon text-black border-neon'
                      : 'bg-surfaceLight text-zinc-400 border-white/5 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAdding(false)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-surfaceLight text-zinc-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-neon text-black"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full py-3 rounded-[16px] border border-dashed border-surfaceLight text-sm text-zinc-400 hover:text-white hover:border-neon/50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Address
          </button>
        )}
      </div>
    </div>
  )
}
