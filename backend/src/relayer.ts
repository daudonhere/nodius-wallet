import { eq, and } from 'drizzle-orm'
import { db } from './db/index'
import { relayQueue, nonceTracker, gasPool } from './db/schema'
import { executeRelayTx } from './relayContract'

const CHAIN_RPCS: Record<number, string> = {
  1: process.env.ETH_RPC || 'https://eth.llamarpc.com',
  137: process.env.POLYGON_RPC || 'https://polygon.llamarpc.com',
  42161: process.env.ARBITRUM_RPC || 'https://arbitrum.llamarpc.com',
  8453: process.env.BASE_RPC || 'https://base.llamarpc.com',
  11155111: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || ''}`,
  84532: 'https://sepolia.base.org',
}

export async function submitRelay(
  walletId: string,
  source: string,
  chainId: number,
  signedTx: string
): Promise<{ id: number; txHash?: string; error?: string }> {
  const rpc = CHAIN_RPCS[chainId]
  if (!rpc) return { id: 0, error: `Unsupported chain: ${chainId}` }

  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_sendRawTransaction',
          params: [signedTx],
        }),
      })

      const data = await res.json()
      if (data.error) {
        return { id: 0, error: data.error.message || 'RPC error' }
      }

      const txHash: string = data.result

      const [entry] = await db.insert(relayQueue).values({
        walletId,
        source,
        chainId,
        signedTx,
        status: 'submitted',
        txHash,
        createdAt: Date.now(),
        submittedAt: Date.now(),
      }).returning({ id: relayQueue.id })

      return { id: entry.id, txHash }
    } catch {
      if (attempt === maxRetries - 1) {
        return { id: 0, error: 'Broadcast failed after retries' }
      }
    }
  }

  return { id: 0, error: 'Broadcast failed' }
}

export async function getRelayStatus(id: number) {
  const [entry] = await db.select().from(relayQueue).where(eq(relayQueue.id, id))
  return entry || null
}

export async function getNonce(walletAddress: string, chainId: number): Promise<number> {
  const [tracker] = await db
    .select()
    .from(nonceTracker)
    .where(and(eq(nonceTracker.walletAddress, walletAddress), eq(nonceTracker.chainId, chainId)))
    .limit(1)

  if (!tracker) {
    const rpc = CHAIN_RPCS[chainId]
    if (!rpc) return 0

    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionCount',
          params: [walletAddress, 'pending'],
        }),
      })
      const data = await res.json()
      const onChainNonce = parseInt(data.result, 16)

      await db.insert(nonceTracker).values({ walletAddress, chainId, nonce: onChainNonce })
      return onChainNonce
    } catch {
      return 0
    }
  }

  return tracker.nonce
}

export async function incrementNonce(walletAddress: string, chainId: number): Promise<number> {
  const nextNonce = await getNonce(walletAddress, chainId) + 1

  const [existing] = await db
    .select()
    .from(nonceTracker)
    .where(and(eq(nonceTracker.walletAddress, walletAddress), eq(nonceTracker.chainId, chainId)))
    .limit(1)

  if (existing) {
    await db
      .update(nonceTracker)
      .set({ nonce: nextNonce })
      .where(eq(nonceTracker.id, existing.id))
  } else {
    await db
      .insert(nonceTracker)
      .values({ walletAddress, chainId, nonce: nextNonce })
  }

  return nextNonce
}

export async function getGasPool(chainId: number) {
  const pools = await db
    .select()
    .from(gasPool)
    .where(eq(gasPool.chainId, chainId))

  return pools.map((p) => ({
    symbol: p.symbol,
    balance: p.balance,
    threshold: p.threshold,
  }))
}

export async function updateGasPoolBalance(chainId: number, symbol: string, balance: string) {
  const [existing] = await db
    .select()
    .from(gasPool)
    .where(and(eq(gasPool.chainId, chainId), eq(gasPool.symbol, symbol)))
    .limit(1)

  if (existing) {
    await db
      .update(gasPool)
      .set({ balance })
      .where(eq(gasPool.id, existing.id))
  } else {
    await db
      .insert(gasPool)
      .values({ chainId, symbol, balance, threshold: '0.1' })
  }
}

export async function submitMetaTx(params: {
  walletId: string
  source: string
  chainId: number
  target: string
  value: string
  data: string
  nonce: number
  deadline: number
  signature: string
}): Promise<{ id: number; txHash?: string; error?: string }> {
  const rpc = CHAIN_RPCS[params.chainId]
  if (!rpc) return { id: 0, error: `Unsupported chain: ${params.chainId}` }

  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await executeRelayTx({
        chainId: params.chainId,
        target: params.target as `0x${string}`,
        value: params.value,
        data: params.data as `0x${string}`,
        nonce: params.nonce,
        deadline: params.deadline,
        signature: params.signature as `0x${string}`,
      })

      const [entry] = await db.insert(relayQueue).values({
        walletId: params.walletId,
        source: params.source,
        chainId: params.chainId,
        relayType: 'meta',
        target: params.target,
        value: params.value,
        calldata: params.data,
        signature: params.signature,
        nonce: params.nonce,
        deadline: params.deadline,
        status: 'submitted',
        txHash: result.txHash,
        createdAt: Date.now(),
        submittedAt: Date.now(),
      }).returning({ id: relayQueue.id })

      return { id: entry.id, txHash: result.txHash }
    } catch (err: any) {
      if (attempt === maxRetries - 1) {
        return { id: 0, error: err.message || 'Meta-tx relay failed' }
      }
    }
  }

  return { id: 0, error: 'Meta-tx relay failed' }
}

export async function listPendingRelays() {
  return db
    .select()
    .from(relayQueue)
    .where(eq(relayQueue.status, 'pending'))
    .orderBy(relayQueue.createdAt)
    .limit(50)
}

export async function markRelayComplete(id: number, txHash: string) {
  await db
    .update(relayQueue)
    .set({ status: 'completed', txHash, completedAt: Date.now() })
    .where(eq(relayQueue.id, id))
}

export async function markRelayFailed(id: number, error: string) {
  await db
    .update(relayQueue)
    .set({ status: 'failed', error, completedAt: Date.now() })
    .where(eq(relayQueue.id, id))
}
