export interface Token {
  symbol: string
  name: string
  icon: string
  address?: string
  decimals: number
  chainId?: number
  balance?: string
  usdPrice?: number
}

export interface TrendingCoin {
  name: string
  symbol: string
  price: string
  change: string
  up: boolean
  color: string
  icon: string
}
