export type WalletSource = 'evm' | 'solana' | 'ton' | 'telegram'

export interface ConnectedWallet {
  id: string
  name: string
  source: WalletSource
  address: string
  icon?: string
  chainId?: number
  balance?: string
  balanceUsd?: string
  change?: string
}
