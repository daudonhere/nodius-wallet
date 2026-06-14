import { db } from './db/index'
import { relayQueue, gasPool } from './db/schema'
import { eq, and } from 'drizzle-orm'

const CHAIN_RPCS: Record<number, string> = {
  1: process.env.ETH_RPC || 'https://eth.llamarpc.com',
  137: process.env.POLYGON_RPC || 'https://polygon.llamarpc.com',
  42161: process.env.ARBITRUM_RPC || 'https://arbitrum.llamarpc.com',
  8453: process.env.BASE_RPC || 'https://base.llamarpc.com',
}

const POLL_INTERVAL = 10_000
const GAS_POLL_INTERVAL = 60_000

async function broadcastTx(signedTx: string, chainId: number): Promise<string> {
  const rpc = CHAIN_RPCS[chainId]
  if (!rpc) throw new Error(`Unsupported chain: ${chainId}`)

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
  if (data.error) throw new Error(data.error.message || 'RPC error')
  return data.result as string
}

async function processPendingRelays() {
  const pending = await db
    .select()
    .from(relayQueue)
    .where(and(eq(relayQueue.status, 'pending'), eq(relayQueue.relayType, 'raw')))
    .orderBy(relayQueue.createdAt)
    .limit(20)

  for (const entry of pending) {
    try {
      if (!entry.signedTx) {
        await db.update(relayQueue).set({ status: 'failed', error: 'No signed tx', completedAt: Date.now() }).where(eq(relayQueue.id, entry.id))
        continue
      }
      const txHash = await broadcastTx(entry.signedTx, entry.chainId)
      await db
        .update(relayQueue)
        .set({ status: 'submitted', txHash, submittedAt: Date.now() })
        .where(eq(relayQueue.id, entry.id))
      console.log(`[Worker] Relay ${entry.id} submitted: ${txHash}`)
    } catch (err: any) {
      await db
        .update(relayQueue)
        .set({ status: 'failed', error: err.message, completedAt: Date.now() })
        .where(eq(relayQueue.id, entry.id))
      console.error(`[Worker] Relay ${entry.id} failed: ${err.message}`)
    }
  }
}

async function checkGasPool() {
  const pools = await db.select().from(gasPool)

  for (const pool of pools) {
    const rpc = CHAIN_RPCS[pool.chainId]
    if (!rpc) continue

    const nativeSymbol = pool.symbol
    const balanceWei = BigInt(pool.balance)
    const thresholdWei = BigInt(pool.threshold)

    if (balanceWei < thresholdWei) {
      console.warn(`[Worker] Low gas pool: ${nativeSymbol} on chain ${pool.chainId} (${pool.balance} < ${pool.threshold})`)
    }
  }
}

export async function startWorker() {
  console.log('[Worker] Started')

  setInterval(async () => {
    try {
      await processPendingRelays()
    } catch (err) {
      console.error('[Worker] Relay processing error:', err)
    }
  }, POLL_INTERVAL)

  setInterval(async () => {
    try {
      await checkGasPool()
    } catch (err) {
      console.error('[Worker] Gas pool check error:', err)
    }
  }, GAS_POLL_INTERVAL)
}
