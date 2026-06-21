import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings, GasSpeed, LocalCurrency } from '../types/settings'

type MainChain = 'evm' | 'solana' | 'ton'

interface SettingsState extends AppSettings {
  mainChain: MainChain
  setMainChain: (v: MainChain) => void
  setDarkMode: (v: boolean) => void
  setLocalCurrency: (v: LocalCurrency) => void
  setDefaultNetwork: (v: string) => void
  setGasFeeRouting: (v: boolean) => void
  setGasSpeed: (v: GasSpeed) => void
  setBiometricUnlock: (v: boolean) => void
  setPushNotifications: (v: boolean) => void
  setTonWalletContractAddr: (v: string) => void
  customProfileName: string
  setCustomProfileName: (v: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: true,
      localCurrency: 'usd',
      defaultNetwork: 'Ethereum',
      mainChain: 'evm' as MainChain,
      gasFeeRouting: true,
      gasSpeed: 'normal',
      biometricUnlock: false,
      pushNotifications: false,
      tonWalletContractAddr: '',
      customProfileName: '',
      setCustomProfileName: (v) => set({ customProfileName: v }),
      setMainChain: (v) => set({ mainChain: v }),
      setDarkMode: (v) => set({ darkMode: v }),
      setLocalCurrency: (v) => set({ localCurrency: v }),
      setDefaultNetwork: (v) => set({ defaultNetwork: v }),
      setGasFeeRouting: (v) => set({ gasFeeRouting: v }),
      setGasSpeed: (v) => set({ gasSpeed: v }),
      setBiometricUnlock: (v) => set({ biometricUnlock: v }),
      setPushNotifications: (v) => set({ pushNotifications: v }),
      setTonWalletContractAddr: (v) => set({ tonWalletContractAddr: v }),
    }),
    { name: 'nodius-settings' }
  )
)
