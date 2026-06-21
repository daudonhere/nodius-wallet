export type GasSpeed = 'slow' | 'normal' | 'fast'
export type LocalCurrency = 'usd' | 'eur' | 'idr' | 'sgd'

export interface AppSettings {
  darkMode: boolean
  localCurrency: LocalCurrency
  defaultNetwork: string
  gasFeeRouting: boolean
  gasSpeed: GasSpeed
  biometricUnlock: boolean
  pushNotifications: boolean
  tonWalletContractAddr: string
}
