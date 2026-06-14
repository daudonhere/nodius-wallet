import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AddressBookEntry, AddressChain } from '../types/address'

interface AddressState {
  addresses: AddressBookEntry[]
  addAddress: (label: string, address: string, chain: AddressChain) => void
  removeAddress: (id: string) => void
  updateLabel: (id: string, label: string) => void
}

export const useAddressStore = create<AddressState>()(
  persist(
    (set) => ({
      addresses: [],
      addAddress: (label, address, chain) =>
        set((s) => ({
          addresses: [
            ...s.addresses,
            { id: crypto.randomUUID(), label, address, chain, createdAt: Date.now() },
          ],
        })),
      removeAddress: (id) =>
        set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) })),
      updateLabel: (id, label) =>
        set((s) => ({
          addresses: s.addresses.map((a) => (a.id === id ? { ...a, label } : a)),
        })),
    }),
    { name: 'nodius-addresses' }
  )
)
