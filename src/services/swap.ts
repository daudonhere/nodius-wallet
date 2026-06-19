const ZEROX_API = 'https://api.0x.org'
const JUPITER_API = 'https://quote-api.jup.ag/v6'
const LIFI_API = 'https://li.quest/v1'

export interface SwapTokenListItem {
  symbol: string
  name: string
  address: string
  decimals: number
  logoURI?: string
  chainId?: number
}

export interface SwapQuote {
  price: string
  gas?: string
  estimatedGas?: string
  buyAmount?: string
  sellAmount?: string
  toAmount?: string
  allowanceTarget?: string
  tx: { to: string; data: string; value: string }
  route?: string
  sources?: { name: string; proportion: string }[]
}

export async function getZeroXQuote(
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  chainId: number = 1,
  slippagePercentage = '0.005'
): Promise<SwapQuote | null> {
  const params = new URLSearchParams({
    sellToken,
    buyToken,
    sellAmount,
    chainId: chainId.toString(),
    slippagePercentage,
  })

  try {
    const res = await fetch(`${ZEROX_API}/swap/v1/quote?${params}`, {
      headers: { '0x-api-key': import.meta.env.VITE_ZEROX_API_KEY || '' },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getZeroXTokens(chainId: number = 1): Promise<SwapTokenListItem[]> {
  try {
    const res = await fetch(`${ZEROX_API}/swap/v1/tokens?chainId=${chainId}`, {
      headers: { '0x-api-key': import.meta.env.VITE_ZEROX_API_KEY || '' },
    })
    if (!res.ok) return []
    const data = await res.json()
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data.tokens)
        ? data.tokens
        : Object.values(data.records || {})
    return list.map((token: any) => ({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals,
      logoURI: token.logoURI || token.logoUrl || token.logoURI,
      chainId,
    })).filter((token: SwapTokenListItem) => token.symbol && token.address && token.decimals != null)
  } catch {
    return []
  }
}

export async function getLifiQuote(
  chainId: number,
  fromToken: string,
  toToken: string,
  fromAddress: string,
  fromAmount: string,
  slippage = '0.005'
): Promise<SwapQuote | null> {
  const params = new URLSearchParams({
    fromChain: chainId.toString(),
    toChain: chainId.toString(),
    fromToken,
    toToken,
    fromAddress,
    fromAmount,
    slippage,
  })

  try {
    const res = await fetch(`${LIFI_API}/quote?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    return {
      price: data.estimate?.exchangeRate?.toString() || '',
      estimatedGas: data.estimate?.gasCosts?.[0]?.estimate?.toString(),
      buyAmount: data.estimate?.toAmount,
      sellAmount: data.estimate?.fromAmount,
      tx: { to: data.transactionRequest?.to, data: data.transactionRequest?.data, value: data.transactionRequest?.value || '0' },
      route: data.toolDetails?.name || data.tool,
    }
  } catch {
    return null
  }
}

export async function getLifiTokens(chainId: number = 1): Promise<SwapTokenListItem[]> {
  try {
    const res = await fetch(`${LIFI_API}/tokens?chains=${chainId}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.tokens?.[chainId] || []).map((token: any) => ({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals,
      logoURI: token.logoURI,
      chainId,
    })).filter((token: SwapTokenListItem) => token.symbol && token.address && token.decimals != null)
  } catch {
    return []
  }
}

export async function getJupiterTokens(): Promise<SwapTokenListItem[]> {
  try {
    const res = await fetch('https://token.jup.ag/all')
    if (!res.ok) return []
    const data = await res.json()
    return (Array.isArray(data) ? data : []).map((token: any) => ({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals,
      logoURI: token.logoURI,
      chainId: 101,
    })).filter((token: SwapTokenListItem) => token.symbol && token.address && token.decimals != null)
  } catch {
    return []
  }
}

export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: string
): Promise<SwapQuote | null> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps: '50',
  })

  try {
    const res = await fetch(`${JUPITER_API}/quote?${params}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
