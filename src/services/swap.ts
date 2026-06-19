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
  tx?: { to: string; data: string; value: string }
  raw?: any
  route?: string
  priceImpact?: string
  feeUsd?: string
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
    const data = await res.json()
    return { ...data, priceImpact: data.estimatedPriceImpact }
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
      feeUsd: data.estimate?.gasCosts?.[0]?.amountUSD,
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

export async function getStonfiTokens(): Promise<SwapTokenListItem[]> {
  try {
    const { StonApiClient } = await import('@ston-fi/api')
    const stonApiClient = new StonApiClient()
    const assets = await stonApiClient.getAssets()
    return assets
      .filter((asset) => !asset.blacklisted && !asset.deprecated && asset.kind !== 'NotAnAsset' && (asset.tags.includes('asset:popular') || asset.tags.includes('asset:liquidity:high') || asset.tags.includes('asset:liquidity:very_high')))
      .map((asset) => ({
        symbol: asset.symbol,
        name: asset.displayName || asset.symbol,
        address: asset.kind === 'Ton' ? 'ton' : asset.contractAddress,
        decimals: asset.decimals,
        logoURI: asset.imageUrl,
        chainId: 607,
      }))
  } catch {
    return []
  }
}

export async function getStonfiQuote(
  offerAddress: string,
  askAddress: string,
  offerUnits: string,
  slippageTolerance = '0.005'
): Promise<SwapQuote | null> {
  try {
    const { StonApiClient } = await import('@ston-fi/api')
    const stonApiClient = new StonApiClient()
    const data = await stonApiClient.simulateSwap({ offerAddress, askAddress, offerUnits, slippageTolerance })
    return {
      price: data.askUnits && data.offerUnits ? (Number(data.askUnits) / Number(data.offerUnits)).toString() : '',
      estimatedGas: data.feeUnits || '—',
      priceImpact: data.priceImpact,
      buyAmount: data.askUnits,
      sellAmount: data.offerUnits,
      route: 'STON.fi',
      raw: data,
    }
  } catch {
    return null
  }
}

export async function getStonfiSwapTransaction(simulationResult: any, userWalletAddress: string) {
  const [{ Client, dexFactory }] = await Promise.all([import('@ston-fi/sdk')])
  const tonClient = new Client({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' })
  const dexContracts = dexFactory(simulationResult.router)
  const router = tonClient.open(dexContracts.Router.create(simulationResult.router.address))
  const proxyTon = dexContracts.pTON.create(simulationResult.router.ptonMasterAddress)

  if (simulationResult.offerAddress === 'ton') {
    return router.getSwapTonToJettonTxParams({
      userWalletAddress,
      offerAmount: simulationResult.offerUnits,
      minAskAmount: simulationResult.minAskUnits,
      askJettonAddress: simulationResult.askAddress,
      proxyTon,
    })
  }

  if (simulationResult.askAddress === 'ton') {
    return router.getSwapJettonToTonTxParams({
      userWalletAddress,
      offerJettonAddress: simulationResult.offerAddress,
      offerAmount: simulationResult.offerUnits,
      minAskAmount: simulationResult.minAskUnits,
      proxyTon,
    })
  }

  return router.getSwapJettonToJettonTxParams({
    userWalletAddress,
    offerJettonAddress: simulationResult.offerAddress,
    askJettonAddress: simulationResult.askAddress,
    offerAmount: simulationResult.offerUnits,
    minAskAmount: simulationResult.minAskUnits,
  })
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
  amount: string,
  slippageBps = '50'
): Promise<SwapQuote | null> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps,
  })

  try {
    const res = await fetch(`${JUPITER_API}/quote?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    return {
      price: data.outAmount && data.inAmount ? (Number(data.outAmount) / Number(data.inAmount)).toString() : '',
      estimatedGas: data.platformFee?.amount || '—',
      priceImpact: data.priceImpactPct,
      buyAmount: data.outAmount,
      sellAmount: data.inAmount,
      route: data.routePlan?.[0]?.swapInfo?.label || 'Jupiter',
      raw: data,
    }
  } catch {
    return null
  }
}

export async function getJupiterSwapTransaction(quoteResponse: any, userPublicKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${JUPITER_API}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.swapTransaction || null
  } catch {
    return null
  }
}
