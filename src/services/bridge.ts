const LIFI_API = 'https://li.quest/v1'

export interface BridgeQuote {
  estimatedToAmount: string
  estimatedFromAmount: string
  toToken: { symbol: string; decimals: number; address: string }
  fromToken: { symbol: string; decimals: number; address: string }
  estimate: { gasCosts: { amountUsd: string }[]; executionDuration: string }
  transactionRequest: { to: string; data: string; value: string; chainId: number }
  route: string
}

export async function getBridgeQuote(
  fromChain: string,
  toChain: string,
  fromToken: string,
  toToken: string,
  fromAmount: string,
  fromAddress: string
): Promise<BridgeQuote | null> {
  const params = { fromChain, toChain, fromToken, toToken, fromAmount, fromAddress }

  try {
    const res = await fetch(`${LIFI_API}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getBridgeStatus(bridge: string, txHash: string): Promise<string | null> {
  try {
    const res = await fetch(`${LIFI_API}/status?bridge=${bridge}&txHash=${txHash}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.status
  } catch {
    return null
  }
}
