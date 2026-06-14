import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings, GasSpeed, LocalCurrency } from '../types/settings'

interface SettingsState extends AppSettings {
  setDarkMode: (v: boolean) => void
  setLocalCurrency: (v: LocalCurrency) => void
  setDefaultNetwork: (v: string) => void
  setGasFeeRouting: (v: boolean) => void
  setGasSpeed: (v: GasSpeed) => void
  setBiometricUnlock: (v: boolean) => void
  setPushNotifications: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: true,
      localCurrency: 'usd',
      defaultNetwork: 'Ethereum',
      gasFeeRouting: true,
      gasSpeed: 'normal',
      biometricUnlock: false,
      pushNotifications: false,
      setDarkMode: (v) => set({ darkMode: v }),
      setLocalCurrency: (v) => set({ localCurrency: v }),
      setDefaultNetwork: (v) => set({ defaultNetwork: v }),
      setGasFeeRouting: (v) => set({ gasFeeRouting: v }),
      setGasSpeed: (v) => set({ gasSpeed: v }),
      setBiometricUnlock: (v) => set({ biometricUnlock: v }),
      setPushNotifications: (v) => set({ pushNotifications: v }),
    }),
    { name: 'nodius-settings' }
  )
)
