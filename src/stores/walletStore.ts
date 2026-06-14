import { create } from 'zustand'
import type { ConnectedWallet } from '../types/wallet'

interface WalletState {
  wallets: ConnectedWallet[]
  activeWalletId: string | null
  connect: (wallet: ConnectedWallet) => void
  disconnect: (id: string) => void
  setActive: (id: string) => void
  updateBalance: (id: string, balance: string, usd: string) => void
}

export const useWalletStore = create<WalletState>((set) => ({
  wallets: [],
  activeWalletId: null,
  connect: (wallet) =>
    set((state) => ({
      wallets: [...state.wallets, wallet],
      activeWalletId: wallet.id,
    })),
  disconnect: (id) =>
    set((state) => ({
      wallets: state.wallets.filter((w) => w.id !== id),
      activeWalletId: state.activeWalletId === id ? null : state.activeWalletId,
    })),
  setActive: (id) => set({ activeWalletId: id }),
  updateBalance: (id, balance, usd) =>
    set((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === id ? { ...w, balance, balanceUsd: usd } : w
      ),
    })),
}))
