import { create } from 'zustand'
import type { Transaction, TxFilter } from '../types/transaction'

interface TransactionState {
  transactions: Transaction[]
  activeFilter: TxFilter
  setFilter: (filter: TxFilter) => void
  addTransaction: (tx: Transaction) => void
  updateStatus: (id: string, status: Transaction['status']) => void
}

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  activeFilter: 'all',
  setFilter: (filter) => set({ activeFilter: filter }),
  addTransaction: (tx) =>
    set((state) => ({ transactions: [tx, ...state.transactions] })),
  updateStatus: (id, status) =>
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === id ? { ...tx, status } : tx
      ),
    })),
}))
