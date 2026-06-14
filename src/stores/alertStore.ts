import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PriceAlert {
  id: string
  symbol: string
  targetPrice: number
  direction: 'above' | 'below'
  triggered: boolean
}

interface AlertState {
  alerts: PriceAlert[]
  lastPriceCheck: Record<string, number>
  addAlert: (symbol: string, targetPrice: number, direction: 'above' | 'below') => void
  removeAlert: (id: string) => void
  markTriggered: (id: string) => void
  setPrice: (symbol: string, price: number) => void
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set) => ({
      alerts: [],
      lastPriceCheck: {},
      addAlert: (symbol, targetPrice, direction) =>
        set((s) => ({
          alerts: [...s.alerts, { id: crypto.randomUUID(), symbol: symbol.toUpperCase(), targetPrice, direction, triggered: false }],
        })),
      removeAlert: (id) =>
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
      markTriggered: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) => (a.id === id ? { ...a, triggered: true } : a)),
        })),
      setPrice: (symbol, price) =>
        set((s) => ({ lastPriceCheck: { ...s.lastPriceCheck, [symbol.toUpperCase()]: price } })),
    }),
    { name: 'nodius-price-alerts' }
  )
)
