import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  type Chain,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, polygon, arbitrum, base, sepolia, baseSepolia } from 'viem/chains'

const CHAINS: Record<number, Chain> = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  8453: base,
  11155111: sepolia,
  84532: baseSepolia,
}

const RELAY_CONTRACTS: Record<number, `0x${string}`> = {
  1: (process.env.RELAY_CONTRACT_ETH || '0x') as `0x${string}`,
  11155111: (process.env.RELAY_CONTRACT_ETH || '0x') as `0x${string}`,
  137: (process.env.RELAY_CONTRACT_POLYGON || '0x') as `0x${string}`,
  42161: (process.env.RELAY_CONTRACT_ARBITRUM || '0x') as `0x${string}`,
  8453: (process.env.RELAY_CONTRACT_BASE || '0x') as `0x${string}`,
  84532: (process.env.RELAY_CONTRACT_BASE || '0x') as `0x${string}`,
}

const RELAY_ABI = [
  {
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'execute',
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

const RELAYER_PRIVATE_KEY = (process.env.RELAYER_PRIVATE_KEY || '') as `0x${string}`

function getClients(chainId: number) {
  const chain = CHAINS[chainId]
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`)

  const rpcUrl = (chainId === 1 ? process.env.ETH_RPC
    : chainId === 11155111 ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || ''}`
    : chainId === 137 ? process.env.POLYGON_RPC
    : chainId === 42161 ? process.env.ARBITRUM_RPC
    : chainId === 8453 ? process.env.BASE_RPC
    : chainId === 84532 ? 'https://sepolia.base.org'
    : undefined) || chain.rpcUrls.default.http[0]

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
  const account = privateKeyToAccount(RELAYER_PRIVATE_KEY)
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) })

  return { publicClient, walletClient, account }
}

export async function executeRelayTx(params: {
  chainId: number
  target: `0x${string}`
  value: string
  data: `0x${string}`
  nonce: number
  deadline: number
  signature: `0x${string}`
}): Promise<{ txHash: `0x${string}` }> {
  const contractAddress = RELAY_CONTRACTS[params.chainId]
  if (!contractAddress || contractAddress === '0x') {
    throw new Error(`Relay contract not configured for chain ${params.chainId}`)
  }

  const { publicClient, walletClient, account } = getClients(params.chainId)

  const calldata = encodeFunctionData({
    abi: RELAY_ABI,
    functionName: 'execute',
    args: [
      params.target,
      BigInt(params.value),
      params.data,
      BigInt(params.nonce),
      BigInt(params.deadline),
      params.signature,
    ],
  })

  const gas = await publicClient.estimateGas({
    account: account.address,
    to: contractAddress,
    data: calldata,
    value: BigInt(params.value),
  })

  const txHash = await walletClient.sendTransaction({
    to: contractAddress,
    data: calldata,
    value: BigInt(params.value),
    gas: gas,
  })

  return { txHash }
}

export function getRelayContractAddress(chainId: number): `0x${string}` | null {
  const addr = RELAY_CONTRACTS[chainId]
  if (!addr || addr === '0x') return null
  return addr
}

export async function getRelayerAddress(): Promise<`0x${string}`> {
  const account = privateKeyToAccount(RELAYER_PRIVATE_KEY)
  return account.address
}

export async function getRelayerBalance(chainId: number): Promise<string> {
  const { publicClient, account } = getClients(chainId)
  const balance = await publicClient.getBalance({ address: account.address })
  return balance.toString()
}

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

export { RELAY_CONTRACTS, CHAINS }
