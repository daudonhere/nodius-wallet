import { supabaseAdmin, getNetworkMode } from './db/index'
import { getRelayerBalance } from './evmSponsor'
import { hasSolanaRelayer, getSolanaRelayerKeypair, hasTonRelayer, getTonRelayerWallet } from './sponsoredRelayers'
import { updateGasPoolBalance } from './relayer'

const DEBRIDGE_SOLANA_CHAIN_ID = 7565164
const DEBRIDGE_TON_CHAIN_ID = -239

const CHAIN_RPCS: Record<string, string> = {
  '1': process.env.ETH_RPC || 'https://eth.llamarpc.com',
  '137': process.env.POLYGON_RPC || 'https://polygon.llamarpc.com',
  '42161': process.env.ARBITRUM_RPC || 'https://arbitrum.llamarpc.com',
  '8453': process.env.BASE_RPC || 'https://base.llamarpc.com',
  '11155111': `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || ''}`,
  '84532': 'https://sepolia.base.org',
  [String(DEBRIDGE_SOLANA_CHAIN_ID)]: process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
}

const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'
const POLL_INTERVAL = 10_000
const GAS_POLL_INTERVAL = 60_000
const networkMode = getNetworkMode()

async function broadcastTx(signedTx: string, chainId: string, source: string): Promise<string> {
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
  const { data: pending } = await supabaseAdmin
    .from('relay_queue')
    .select('*')
    .eq('status', 'pending')
    .eq('network_mode', networkMode)
    .order('created_at', { ascending: true })
    .limit(20)

  if (!pending) return

  for (const entry of pending) {
    try {
      const signedTx = (entry.payload as any)?.signedTx
      if (!signedTx) {
        await supabaseAdmin
          .from('relay_queue')
          .update({ status: 'failed', error_message: 'No signed tx' })
          .eq('id', entry.id)
        continue
      }
      const txHash = await broadcastTx(signedTx, entry.chain_id, entry.chain_type)
      await supabaseAdmin
        .from('relay_queue')
        .update({ status: 'submitted', tx_hash: txHash })
        .eq('id', entry.id)
      console.log(`[Worker] Relay ${entry.id} submitted: ${txHash}`)
    } catch (err: any) {
      await supabaseAdmin
        .from('relay_queue')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', entry.id)
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
  const { data: pools } = await supabaseAdmin
    .from('gas_pool')
    .select('*')
    .eq('network_mode', networkMode)

  if (!pools) return

  for (const pool of pools) {
    let liveBalance = '0'
    const chainIdNum = parseInt(pool.chain_id)

    if (chainIdNum === DEBRIDGE_SOLANA_CHAIN_ID) {
      if (hasSolanaRelayer()) {
        const pubkey = getSolanaRelayerKeypair().publicKey.toBase58()
        liveBalance = await fetchSolBalance(pubkey)
      }
    } else if (chainIdNum === DEBRIDGE_TON_CHAIN_ID) {
      if (hasTonRelayer()) {
        const { wallet } = await getTonRelayerWallet()
        liveBalance = await fetchTonBalance(wallet.address.toString())
      }
    } else {
      const rpc = CHAIN_RPCS[pool.chain_id]
      if (!rpc) continue
      liveBalance = await getRelayerBalance(chainIdNum)
    }

    await updateGasPoolBalance(
      chainIdNum,
      pool.chain_type,
      pool.native_symbol,
      liveBalance,
      pool.relayer_address,
    )
  }
}

async function ensureGasPoolEntry(
  chainId: number,
  chainType: string,
  symbol: string,
  relayerAddress: string,
  threshold: string,
) {
  const { data: existing } = await supabaseAdmin
    .from('gas_pool')
    .select('id')
    .eq('chain_id', String(chainId))
    .eq('chain_type', chainType)
    .eq('network_mode', networkMode)
    .maybeSingle()

  if (!existing) {
    await supabaseAdmin
      .from('gas_pool')
      .insert({
        network_mode: networkMode,
        chain_type: chainType,
        chain_id: String(chainId),
        relayer_address: relayerAddress,
        native_symbol: symbol,
        balance: '0',
        threshold,
        status: 'healthy',
      })
  }
}

export async function startWorker() {
  console.log('[Worker] Started')

  const solanaPubkey = hasSolanaRelayer() ? getSolanaRelayerKeypair().publicKey.toBase58() : ''
  const tonWallet = hasTonRelayer() ? (await getTonRelayerWallet()).wallet : null

  if (solanaPubkey) {
    await ensureGasPoolEntry(DEBRIDGE_SOLANA_CHAIN_ID, 'solana', 'SOL', solanaPubkey, '0.1')
  }
  if (tonWallet) {
    await ensureGasPoolEntry(DEBRIDGE_TON_CHAIN_ID, 'ton', 'TON', tonWallet.address.toString(), '0.1')
  }

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
