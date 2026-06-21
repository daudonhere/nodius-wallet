const DEBRIDGE_API = 'https://api.dln.trade/v1.0'

export const DEBRIDGE_SOLANA_CHAIN_ID = 7565164
export const DEBRIDGE_TON_CHAIN_ID = -239

export function isDebridgeChain(chainId: number): boolean {
  return chainId === DEBRIDGE_SOLANA_CHAIN_ID || chainId === DEBRIDGE_TON_CHAIN_ID
}

export function isEvmChain(chainId: number): boolean {
  return chainId > 0 && chainId !== DEBRIDGE_SOLANA_CHAIN_ID
}

const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'

export const DEBRIDGE_CHAIN_META: Record<number, { name: string; icon: string; nativeToken: string }> = {
  [DEBRIDGE_SOLANA_CHAIN_ID]: {
    name: 'Solana',
    icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
    nativeToken: 'SOL',
  },
  [DEBRIDGE_TON_CHAIN_ID]: {
    name: 'TON',
    icon: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg',
    nativeToken: 'TON',
  },
}

export const EVM_CHAIN_META: Record<number, { name: string; nativeToken: string }> = {
  1: { name: 'Ethereum', nativeToken: 'ETH' },
  10: { name: 'Optimism', nativeToken: 'ETH' },
  56: { name: 'BNB Smart Chain', nativeToken: 'BNB' },
  137: { name: 'Polygon', nativeToken: 'MATIC' },
  250: { name: 'Fantom', nativeToken: 'FTM' },
  42161: { name: 'Arbitrum', nativeToken: 'ETH' },
  43114: { name: 'Avalanche', nativeToken: 'AVAX' },
  8453: { name: 'Base', nativeToken: 'ETH' },
}

const NATIVE_ADDRESS_EVM = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export interface DebridgeQuoteResult {
  estimatedToAmount: string
  estimatedFromAmount: string
  toToken: { symbol: string; decimals: number; address: string; chainId: number }
  fromToken: { symbol: string; decimals: number; address: string; chainId: number }
  feeUsd: string
  executionDuration: string
  orderId?: string
  route: string
}

export interface DebridgeTxResult {
  solanaTxBase64?: string
  evmTx?: { to: string; data: string; value: string; chainId: number }
  orderId: string
}

function chooseDestTokenOnChain(destChainId: number, _fromSymbol: string): { address: string; symbol: string; decimals: number } {
  if (isDebridgeChain(destChainId)) {
    const meta = DEBRIDGE_CHAIN_META[destChainId]
    const nativeMap: Record<string, { address: string; decimals: number }> = {
      SOL: { address: 'So11111111111111111111111111111111111111112', decimals: 9 },
      TON: { address: NATIVE_TOKEN_ADDRESS, decimals: 9 },
    }
    const native = nativeMap[meta?.nativeToken || '']
    if (native) return { address: native.address, symbol: meta.nativeToken, decimals: native.decimals }
    return { address: NATIVE_TOKEN_ADDRESS, symbol: meta?.nativeToken || 'Unknown', decimals: 9 }
  }
  const native = EVM_CHAIN_META[destChainId]
  if (native) return { address: NATIVE_ADDRESS_EVM, symbol: native.nativeToken, decimals: 18 }
  return { address: NATIVE_ADDRESS_EVM, symbol: 'ETH', decimals: 18 }
}

function toDebridgeAddress(_chainId: number, address: string): string {
  if (address === NATIVE_ADDRESS_EVM) return NATIVE_TOKEN_ADDRESS
  if (address === '' || address === NATIVE_TOKEN_ADDRESS) return NATIVE_TOKEN_ADDRESS
  return address
}

export async function getDebridgeQuote(
  fromChain: number,
  _toChain: number,
  fromToken: string,
  toChainId: number,
  fromAmount: string,
  fromDecimals: number,
  fromSymbol: string,
): Promise<DebridgeQuoteResult | null> {
  const srcToken = toDebridgeAddress(fromChain, fromToken)
  const dest = chooseDestTokenOnChain(toChainId, fromSymbol)

  const body = {
    srcChainId: fromChain,
    srcChainTokenIn: srcToken,
    srcChainTokenInAmount: fromAmount,
    dstChainId: toChainId,
    dstChainTokenOut: dest.address,
    dstChainTokenOutAmount: '0',
    prependOperatingExpenses: true,
    allowOperator: true,
  }

  try {
    const res = await fetch(`${DEBRIDGE_API}/order/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const data = await res.json()

    const order = data.order
    if (!order) return null

    const outputAmount = order.dstChainTokenOutAmount || '0'
    const inputAmount = order.srcChainTokenInAmount || fromAmount
    const fee = order.protocolFee?.fixedFee || '0'

    return {
      estimatedToAmount: outputAmount,
      estimatedFromAmount: inputAmount,
      toToken: {
        symbol: dest.symbol,
        decimals: dest.decimals,
        address: dest.address,
        chainId: toChainId,
      },
      fromToken: {
        symbol: fromSymbol,
        decimals: fromDecimals,
        address: fromToken,
        chainId: fromChain,
      },
      feeUsd: fee,
      executionDuration: String(order.approxFulfillmentTime || 60),
      route: 'deBridge',
    }
  } catch {
    return null
  }
}

export async function getDebridgeTx(
  quote: DebridgeQuoteResult,
  fromChain: number,
  _toChain: number,
  fromToken: string,
  toChainId: number,
  fromAmount: string,
  _fromDecimals: number,
  fromSymbol: string,
  userAddress: string,
  destUserAddress: string,
): Promise<DebridgeTxResult | null> {
  const srcToken = toDebridgeAddress(fromChain, fromToken)
  const dest = chooseDestTokenOnChain(toChainId, fromSymbol)

  const body: Record<string, any> = {
    srcChainId: fromChain,
    srcChainTokenIn: srcToken,
    srcChainTokenInAmount: fromAmount,
    dstChainId: toChainId,
    dstChainTokenOut: dest.address,
    dstChainTokenOutAmount: quote.estimatedToAmount,
    srcChainOrderAuthorityAddress: userAddress,
    dstChainOrderAuthorityAddress: destUserAddress,
    prependOperatingExpenses: false,
    takeChainId: toChainId,
    takeTokenAddress: dest.address,
    takeAmount: quote.estimatedToAmount,
  }

  try {
    const res = await fetch(`${DEBRIDGE_API}/order/create-tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('deBridge create-tx error', res.status, errText)
      return null
    }
    const data = await res.json()

    const tx = data.tx
    const orderId = data.orderId || ''

    if (!tx) return null

    if (fromChain === DEBRIDGE_SOLANA_CHAIN_ID) {
      return {
        solanaTxBase64: tx.data,
        orderId,
      }
    }
    if (fromChain === DEBRIDGE_TON_CHAIN_ID) {
      return {
        solanaTxBase64: tx.data,
        orderId,
      }
    }
    return {
      evmTx: {
        to: tx.to,
        data: tx.data,
        value: tx.value || '0',
        chainId: tx.chainId || fromChain,
      },
      orderId,
    }
  } catch {
    return null
  }
}

export async function getDebridgeDestChains(
  sourceChainId: number,
  sourceChainName: string,
): Promise<{ id: number; name: string; icon: string; nativeToken: string }[]> {
  if (sourceChainName === 'Solana' || sourceChainId === DEBRIDGE_SOLANA_CHAIN_ID) {
    return Object.entries(EVM_CHAIN_META).map(([id, meta]) => ({
      id: Number(id),
      name: meta.name,
      icon: `https://cryptologos.cc/logos/${meta.name.toLowerCase()}-${meta.nativeToken.toLowerCase()}-logo.svg`,
      nativeToken: meta.nativeToken,
    }))
  }
  if (sourceChainName === 'TON' || sourceChainId === DEBRIDGE_TON_CHAIN_ID) {
    return Object.entries(EVM_CHAIN_META).map(([id, meta]) => ({
      id: Number(id),
      name: meta.name,
      icon: `https://cryptologos.cc/logos/${meta.name.toLowerCase()}-${meta.nativeToken.toLowerCase()}-logo.svg`,
      nativeToken: meta.nativeToken,
    }))
  }
  const solana: { id: number; name: string; icon: string; nativeToken: string } = {
    id: DEBRIDGE_SOLANA_CHAIN_ID,
    name: 'Solana',
    icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
    nativeToken: 'SOL',
  }
  const ton: { id: number; name: string; icon: string; nativeToken: string } = {
    id: DEBRIDGE_TON_CHAIN_ID,
    name: 'TON',
    icon: 'https://cryptologos.cc/logos/toncoin-ton-logo.svg',
    nativeToken: 'TON',
  }
  return [solana, ton]
}

export async function getDebridgeStatus(orderId: string): Promise<string | null> {
  try {
    const res = await fetch(`${DEBRIDGE_API}/order/${orderId}/status`)
    if (!res.ok) return null
    const data = await res.json()
    return data.status || null
  } catch {
    return null
  }
}
