import type { TypedDataDefinition } from 'viem'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export const RELAY_EIP712_DOMAIN = {
  name: 'NodiusRelay',
  version: '1',
} as const

export const RELAY_EXECUTE_TYPE = {
  Execute: [
    { name: 'target', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const

export type RelayExecuteTypedData = TypedDataDefinition<typeof RELAY_EXECUTE_TYPE, 'Execute'>

export async function submitRelayTx(params: {
  walletId: string
  source: string
  chainId: number
  signedTx: string
}) {
  const res = await fetch(`${BACKEND_URL}/relay/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Relay submission failed')
  }

  return res.json() as Promise<{ id: number; txHash?: string }>
}

export async function submitMetaTx(params: {
  walletId: string
  source: string
  chainId: number
  target: string
  value: string
  data?: string
  nonce: number
  deadline: number
  signature: string
}) {
  const res = await fetch(`${BACKEND_URL}/relay/meta-submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, data: params.data || '0x' }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Meta-tx submission failed')
  }

  return res.json() as Promise<{ id: number; txHash?: string }>
}

export async function getRelayInfo(chainId: number) {
  const res = await fetch(`${BACKEND_URL}/relay/info/${chainId}`)
  if (!res.ok) return null
  return res.json() as Promise<{
    chainId: number
    contractAddress: string
    relayerAddress: string
    relayerBalance: string
  }>
}

export async function getRelayTxStatus(id: number) {
  const res = await fetch(`${BACKEND_URL}/relay/status/${id}`)
  if (!res.ok) return null
  return res.json()
}

export async function getNonce(walletAddress: string, chainId: number) {
  const res = await fetch(`${BACKEND_URL}/nonce/${walletAddress}/${chainId}`)
  if (!res.ok) return null
  return res.json() as Promise<{ wallet: string; chainId: number; nonce: number }>
}

export async function getGasPool(chainId: number) {
  const res = await fetch(`${BACKEND_URL}/gas-pool/${chainId}`)
  if (!res.ok) return null
  return res.json() as Promise<{ chainId: number; pools: { symbol: string; balance: string; threshold: string }[] }>
}
