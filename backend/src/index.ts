import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  submitRelay,
  getRelayStatus,
  getNonce,
  getGasPool,
  listPendingRelays,
  markRelayComplete,
  markRelayFailed,
} from './relayer'
import { initDb } from './db/index'
import { startWorker } from './worker'

const app = new Hono()

await initDb()
startWorker()

app.use('/*', cors())

app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }))

app.post('/relay/submit', async (c) => {
  const body = await c.req.json()
  const { walletId, source, chainId, signedTx } = body

  if (!walletId || !source || !chainId || !signedTx) {
    return c.json({ error: 'Missing required fields: walletId, source, chainId, signedTx' }, 400)
  }

  const result = await submitRelay(walletId, source, chainId, signedTx)
  if (result.error) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result, 201)
})

app.get('/relay/status/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

  const entry = await getRelayStatus(id)
  if (!entry) return c.json({ error: 'Not found' }, 404)

  return c.json(entry)
})

app.get('/relay/pending', async (c) => {
  const pending = await listPendingRelays()
  return c.json(pending)
})

app.post('/relay/complete/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const { txHash } = await c.req.json()
  await markRelayComplete(id, txHash)
  return c.json({ status: 'ok' })
})

app.post('/relay/fail/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const { error } = await c.req.json()
  await markRelayFailed(id, error || 'Unknown error')
  return c.json({ status: 'ok' })
})

app.get('/nonce/:wallet/:chainId', async (c) => {
  const wallet = c.req.param('wallet')
  const chainId = parseInt(c.req.param('chainId'))
  if (isNaN(chainId)) return c.json({ error: 'Invalid chainId' }, 400)

  const nonce = await getNonce(wallet, chainId)
  return c.json({ wallet, chainId, nonce })
})

app.get('/gas-pool/:chainId', async (c) => {
  const chainId = parseInt(c.req.param('chainId'))
  if (isNaN(chainId)) return c.json({ error: 'Invalid chainId' }, 400)

  const pools = await getGasPool(chainId)
  return c.json({ chainId, pools })
})

const port = Number(process.env.PORT) || 3001
serve({ fetch: app.fetch, port })

console.log(`Backend running on http://localhost:${port}`)
