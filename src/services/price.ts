interface PriceResponse {
  [coinId: string]: { usd: number; usd_24h_change: number }
}

const BASE = 'https://api.coingecko.com/api/v3'

const coinIds: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano',
  DOT: 'polkadot', AVAX: 'avalanche-2', LINK: 'chainlink', MATIC: 'matic-network',
  ARB: 'arbitrum', DOGE: 'dogecoin', TON: 'the-open-network', UNI: 'uniswap',
  USDC: 'usd-coin', USDT: 'tether',
}

export async function fetchPrices(symbols: string[]): Promise<Record<string, { price: number; change24h: number }>> {
  const ids = symbols.map((s) => coinIds[s.toUpperCase()]).filter(Boolean).join(',')
  if (!ids) return {}

  const res = await fetch(`${BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`)
  if (!res.ok) return {}

  const data: PriceResponse = await res.json()
  const result: Record<string, { price: number; change24h: number }> = {}

  for (const [symbol, id] of Object.entries(coinIds)) {
    const coin = data[id]
    if (coin?.usd != null) result[symbol] = { price: coin.usd, change24h: coin.usd_24h_change ?? 0 }
  }

  return result
}

export const TRENDING_COINS = [
  { name: 'Bitcoin', symbol: 'BTC', color: '#F7931A', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg' },
  { name: 'Ethereum', symbol: 'ETH', color: '#627EEA', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' },
  { name: 'Solana', symbol: 'SOL', color: '#14F195', icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg' },
  { name: 'Cardano', symbol: 'ADA', color: '#0033AD', icon: 'https://cryptologos.cc/logos/cardano-ada-logo.svg' },
  { name: 'Polkadot', symbol: 'DOT', color: '#E6007A', icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.svg' },
  { name: 'Avalanche', symbol: 'AVAX', color: '#E84142', icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.svg' },
  { name: 'Chainlink', symbol: 'LINK', color: '#375BD2', icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg' },
  { name: 'Polygon', symbol: 'MATIC', color: '#8247E5', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg' },
  { name: 'Arbitrum', symbol: 'ARB', color: '#2D374B', icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg' },
  { name: 'Dogecoin', symbol: 'DOGE', color: '#C2A633', icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.svg' },
  { name: 'Toncoin', symbol: 'TON', color: '#0098EA', icon: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg' },
  { name: 'Uniswap', symbol: 'UNI', color: '#FF007A', icon: 'https://cryptologos.cc/logos/uniswap-uni-logo.svg' },
]
