export type ChainKey = 'ethereum' | 'solana' | 'polygon' | 'arbitrum' | 'base' | 'ton'

export interface ChainInfo {
  key: ChainKey
  name: string
  icon: string
  symbol: string
  chainId?: number
}
