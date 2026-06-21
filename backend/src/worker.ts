import { db } from './db/index'
import { relayQueue, gasPool } from './db/schema'
import { eq, and } from 'drizzle-orm'
import { getRelayerBalance } from './relayContract'
import { hasSolanaRelayer, getSolanaRelayerKeypair } from './sponsoredRelayers'

const DEBRIDGE_SOLANA_CHAIN_ID = 7565164
const DEBRIDGE_TON_CHAIN_ID = -239

const CHAIN_RPCS: Record<number, string> = {
  1: process.env.ETH_RPC || 'https://eth.llamarpc.com',
  137: process.env.POLYGON_RPC || 'https://polygon.llamarpc.com',
  42161: process.env.ARBITRUM_RPC || 'https://arbitrum.llamarpc.com',
  8453: process.env.BASE_RPC || 'https://base.llamarpc.com',
  11155111: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || ''}`,
  84532: 'https://sepolia.base.org',
  [DEBRIDGE_SOLANA_CHAIN_ID]: process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
}

const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'

const POLL_INTERVAL = 10_000
const GAS_POLL_INTERVAL = 60_000

async function broadcastTx(signedTx: string, chainId: number, source: string): Promise<string> {
  const isSolana = source === 'solana'
  const rpc = isSolana ? SOLANA_RPC : CHAIN_RPCS[chainId]
  if (!rpc) throw new Error(`Unsupported chain: ${chainId}`)
  const rawTx = isSolana ? Buffer.from(signedTx.replace(/^0x/, ''), 'hex').toString('base64') : signedTx

  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: isSolana ? 'sendTransaction' : 'eth_sendRawTransaction',
      params: isSolana ? [rawTx, { encoding: 'base64' }] : [rawTx],
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
      const txHash = await broadcastTx(entry.signedTx, entry.chainId, entry.source)
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

async function fetchSolBalance(pubkey: string): Promise<string> {
  try {
    const res = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [pubkey] }),
    })
    const data = await res.json() as any
    if (data.result?.value != null) return String(data.result.value / 1e9)
    return '0'
  } catch { return '0' }
}

async function fetchTonBalance(address: string): Promise<string> {
  try {
    const tonApiKey = process.env.TONAPI_KEY || ''
    const res = await fetch(`https://tonapi.io/v2/accounts/${address}`, {
      headers: tonApiKey ? { Authorization: `Bearer ${tonApiKey}` } : {},
    })
    const data = await res.json() as any
    if (data.balance != null) return String(Number(data.balance) / 1e9)
    return '0'
  } catch { return '0' }
}

async function checkGasPool() {
  const pools = await db.select().from(gasPool)

  for (const pool of pools) {
    let liveBalance = '0'

    if (pool.chainId === DEBRIDGE_SOLANA_CHAIN_ID) {
      if (hasSolanaRelayer()) {
        const pubkey = getSolanaRelayerKeypair().publicKey.toBase58()
        liveBalance = await fetchSolBalance(pubkey)
      }
    } else if (pool.chainId === DEBRIDGE_TON_CHAIN_ID) {
      const pubkey = process.env.TON_RELAYER_PUBKEY || ''
      if (pubkey) liveBalance = await fetchTonBalance(pubkey)
    } else {
      const rpc = CHAIN_RPCS[pool.chainId]
      if (!rpc) continue
      liveBalance = await getRelayerBalance(pool.chainId)
    }

    await db
      .update(gasPool)
      .set({ balance: liveBalance })
      .where(eq(gasPool.id, pool.id))

    const balanceNum = Number(liveBalance)
    const thresholdNum = Number(pool.threshold)

    if (balanceNum < thresholdNum) {
      console.warn(`[Worker] Low gas pool: ${pool.symbol} on chain ${pool.chainId} (${pool.balance} < ${pool.threshold})`)
    }
  }
}

async function ensureGasPoolEntry(chainId: number, symbol: string, threshold: string) {
  const existing = await db.select().from(gasPool).where(and(eq(gasPool.chainId, chainId), eq(gasPool.symbol, symbol)))
  if (existing.length === 0) {
    await db.insert(gasPool).values({ chainId, symbol, balance: '0', threshold })
  }
}

export async function startWorker() {
  console.log('[Worker] Started')

  await ensureGasPoolEntry(DEBRIDGE_SOLANA_CHAIN_ID, 'SOL', '0.1')
  await ensureGasPoolEntry(DEBRIDGE_TON_CHAIN_ID, 'TON', '0.1')

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
