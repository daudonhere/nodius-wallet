const ZEROX_API = 'https://api.0x.org'
const JUPITER_API = 'https://quote-api.jup.ag/v6'

export interface SwapQuote {
  price: string
  gas: string
  estimatedGas: string
  toAmount: string
  tx: { to: string; data: string; value: string }
  route: string
}

export async function getZeroXQuote(
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  chainId: number = 1
): Promise<SwapQuote | null> {
  const params = new URLSearchParams({
    sellToken,
    buyToken,
    sellAmount,
    chainId: chainId.toString(),
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
