const LIFI_API = 'https://li.quest/v1'

export interface BridgeChain {
  id: number
  name: string
  icon: string
  nativeToken: string
}

const NATIVE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export const FALLBACK_CHAINS: BridgeChain[] = [
  { id: 1, name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg', nativeToken: 'ETH' },
  { id: 10, name: 'Optimism', icon: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg', nativeToken: 'ETH' },
  { id: 56, name: 'BNB Smart Chain', icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg', nativeToken: 'BNB' },
  { id: 137, name: 'Polygon', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg', nativeToken: 'MATIC' },
  { id: 250, name: 'Fantom', icon: 'https://cryptologos.cc/logos/fantom-ftm-logo.svg', nativeToken: 'FTM' },
  { id: 42161, name: 'Arbitrum', icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg', nativeToken: 'ETH' },
  { id: 43114, name: 'Avalanche', icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.svg', nativeToken: 'AVAX' },
  { id: 8453, name: 'Base', icon: 'https://cryptologos.cc/logos/base-base-logo.svg', nativeToken: 'ETH' },
]

const FALLBACK_NAMES: Record<number, string> = Object.fromEntries(FALLBACK_CHAINS.map((c) => [c.id, c.name]))

const tokenListCache: Record<number, any[]> = {}
let tokenListLoading: Record<number, Promise<any[]>> = {}
let chainsCache: BridgeChain[] | null = null
let chainsLoading: Promise<BridgeChain[]> | null = null

export async function loadLifiTokens(chainId: number): Promise<any[]> {
  if (tokenListCache[chainId]) return tokenListCache[chainId]
  if (typeof tokenListLoading[chainId] !== 'undefined') return tokenListLoading[chainId]

  const promise = (async () => {
    try {
      const res = await fetch(`${LIFI_API}/tokens?chains=${chainId}`)
      if (!res.ok) return []
      const data = await res.json()
      const list = data.tokens?.[chainId] || []
      tokenListCache[chainId] = list
      return list
    } catch {
      return []
    }
  })()

  tokenListLoading[chainId] = promise
  const result = await promise
  delete tokenListLoading[chainId]
  return result
}

export async function getLifiChains(): Promise<BridgeChain[]> {
  if (chainsCache) return chainsCache
  if (chainsLoading) return chainsLoading

  const promise: Promise<BridgeChain[]> = (async (): Promise<BridgeChain[]> => {
    try {
      const res = await fetch(`${LIFI_API}/chains`)
      if (!res.ok) {
        chainsCache = FALLBACK_CHAINS
        return chainsCache
      }
      const data = await res.json()
      const raw = (data.chains || []).filter((c: any) => {
        const type = (c.key || c.chainType || '').toLowerCase()
        return type === 'evm' || type === 'eip155'
      })
      const mapped: BridgeChain[] = raw.map((c: any) => ({
        id: c.id,
        name: c.name || FALLBACK_NAMES[c.id] || `Chain ${c.id}`,
        icon: c.logoURI || c.icon || FALLBACK_CHAINS.find((fc) => fc.id === c.id)?.icon || `https://cryptologos.cc/logos/ethereum-eth-logo.svg`,
        nativeToken: c.nativeToken?.symbol || 'ETH',
      })).filter((chain: BridgeChain) => chain.id)
      chainsCache = mapped.length > 0 ? mapped : FALLBACK_CHAINS
      return chainsCache
    } catch {
      chainsCache = FALLBACK_CHAINS
      return chainsCache
    }
  })()

  chainsLoading = promise
  const result = await promise
  chainsLoading = null
  return result
}

export interface BridgeQuote {
  estimatedToAmount: string
  estimatedFromAmount: string
  toToken: { symbol: string; decimals: number; address: string; chainId: number }
  fromToken: { symbol: string; decimals: number; address: string; chainId: number }
  estimate: { gasCosts: { amountUsd: string; estimate: string }[]; executionDuration: string }
  transactionRequest: { to: string; data: string; value: string; chainId: number }
  route: string
  tool: string
}

export async function getBridgeQuote(
  fromChain: number,
  toChain: number,
  fromToken: string,
  toToken: string,
  fromAmount: string,
  fromAddress: string,
  toAddress?: string,
  slippage?: string,
): Promise<BridgeQuote | null> {
  const params = new URLSearchParams({
    fromChain: String(fromChain),
    toChain: String(toChain),
    fromToken,
    toToken,
    fromAmount,
    fromAddress,
  })
  if (toAddress) params.set('toAddress', toAddress)
  if (slippage && slippage !== 'Auto') {
    params.set('slippage', (parseFloat(slippage) / 100).toString())
  }

  try {
    const res = await fetch(`${LIFI_API}/quote?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    const normEstimate = data.estimate ? {
      ...data.estimate,
      gasCosts: data.estimate.gasCosts?.map((gc: any) => ({
        amount: gc.amount,
        amountUsd: gc.amountUsd ?? gc.amountUSD,
        estimate: gc.estimate,
      })) || [],
    } : undefined
    return {
      estimatedToAmount: data.estimate?.toAmount || '0',
      estimatedFromAmount: data.action?.fromAmount || '0',
      toToken: data.action?.toToken,
      fromToken: data.action?.fromToken,
      estimate: normEstimate as BridgeQuote['estimate'],
      transactionRequest: data.transactionRequest,
      route: data.toolDetails?.name || data.tool || 'LI.FI',
      tool: data.tool,
    } as BridgeQuote
  } catch {
    return null
  }
}

export async function getBridgeStatus(tool: string, txHash: string): Promise<string | null> {
  try {
    const res = await fetch(`${LIFI_API}/status?bridge=${tool}&txHash=${txHash}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.status
  } catch {
    return null
  }
}

export async function resolveDestToken(
  symbol: string,
  sourceAddress: string,
  destChainId: number
): Promise<{ address: string; decimals: number } | null> {
  if (sourceAddress === NATIVE_ADDRESS) {
    return { address: NATIVE_ADDRESS, decimals: 18 }
  }

  const tokens = await loadLifiTokens(destChainId)
  const match = tokens.find(
    (t) => t.symbol?.toUpperCase() === symbol.toUpperCase()
  )
  if (match) {
    return { address: match.address, decimals: match.decimals || 18 }
  }

  return null
}

export async function findTokenOnChain(
  symbol: string,
  chainId: number
): Promise<boolean> {
  const tokens = await loadLifiTokens(chainId)
  return tokens.some((t) => t.symbol?.toUpperCase() === symbol.toUpperCase())
}

export async function getTokenDestChains(
  symbol: string,
  sourceAddress: string,
  sourceChainId: number | null
): Promise<BridgeChain[]> {
  const chains = await getLifiChains()

  if (sourceAddress === NATIVE_ADDRESS) {
    return chains.filter((c) => c.id !== sourceChainId)
  }

  const result: BridgeChain[] = []
  for (const chain of chains) {
    if (chain.id === sourceChainId) continue
    const exists = await findTokenOnChain(symbol, chain.id)
    if (exists) result.push(chain)
  }
  return result
}

export async function preloadBridgeTokenLists(): Promise<{ chains: BridgeChain[] }> {
  const chains = await getLifiChains()
  await Promise.all(chains.map((c) => loadLifiTokens(c.id)))
  return { chains }
}
