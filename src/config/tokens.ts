export const POPULAR_TOKEN_SYMBOLS = new Set([
  'ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE',
  'MATIC', 'POL', 'ARB',
  'SOL', 'JUP', 'JTO', 'BONK', 'WIF', 'PYTH', 'RAY', 'ORCA',
])

export type PopularTokenSymbol = typeof POPULAR_TOKEN_SYMBOLS extends Set<infer T> ? T : never
