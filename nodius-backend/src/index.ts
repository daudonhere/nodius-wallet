import 'dotenv/config'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { withSupabase } from '@supabase/server/adapters/hono'

import {
  submitRelay,
  submitMetaTx,
  getRelayStatus,
  getNonce,
  getGasPool,
  listPendingRelays,
  markRelayComplete,
  markRelayFailed,
} from './relayer'
import { getRelayContractAddress, getRelayerAddress, getRelayerBalance } from './evmSponsor'
import { hasSolanaRelayer, getSolanaRelayerKeypair, hasTonRelayer, getTonRelayerWallet, getSponsoredRelayerInfo } from './sponsoredRelayers'
import { buildSponsoredSolanaSwap, buildSponsoredSolanaTransfer } from './solanaSponsor'
import { buildSignedExecuteBody, sendTonExternalMessage } from './tonSponsor'
import { startWorker } from './worker'

const app = new OpenAPIHono()

startWorker()

app.use('/*', cors())

app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
})

// --- Auth middleware helpers ---

const authUser = withSupabase({ auth: 'user' })
const authSecret = withSupabase({ auth: 'secret' })
const authUserOrSecret = withSupabase({ auth: ['user', 'secret'] })
const authUserOrPublishable = withSupabase({ auth: ['user', 'publishable'] })

// --- Health (public) ---

app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }))

// --- Relay Submit (user) ---

app.use('/relay/submit', authUser)

const RelaySubmitSchema = z.object({
  walletId: z.string().openapi({ example: 'user_wallet_123' }),
  source: z.string().openapi({ example: 'evm' }),
  chainId: z.number().openapi({ example: 11155111 }),
  signedTx: z.string().openapi({ example: '0x...' }),
})

const RelaySubmitRoute = createRoute({
  method: 'post',
  path: '/relay/submit',
  security: [{ Bearer: [] }],
  request: { body: { content: { 'application/json': { schema: RelaySubmitSchema } }, required: true } },
  responses: {
    201: { description: 'Relay submitted', content: { 'application/json': { schema: z.object({ id: z.string(), txHash: z.string().optional() }) } } },
    400: { description: 'Missing required fields' },
    500: { description: 'Server error' },
  },
})

app.openapi(RelaySubmitRoute, async (c) => {
  const { walletId, source, chainId, signedTx } = c.req.valid('json')
  const result = await submitRelay(walletId, source, chainId, signedTx)
  if (result.error) return c.json({ error: result.error }, 500)
  return c.json(result, 201)
})

// --- Relay Status (user or secret) ---

app.use('/relay/status/:id', authUserOrSecret)

const RelayStatusRoute = createRoute({
  method: 'get',
  path: '/relay/status/{id}',
  request: { params: z.object({ id: z.string().openapi({ example: 'uuid' }) }) },
  responses: {
    200: { description: 'Relay status', content: { 'application/json': { schema: z.any() } } },
    400: { description: 'Invalid id' },
    404: { description: 'Not found' },
  },
})

app.openapi(RelayStatusRoute, async (c) => {
  const id = c.req.valid('param').id
  const entry = await getRelayStatus(id)
  if (!entry) return c.json({ error: 'Not found' }, 404)
  return c.json(entry)
})

// --- Meta Submit (user) ---

app.use('/relay/meta-submit', authUser)

const MetaSubmitSchema = z.object({
  walletId: z.string().openapi({ example: 'user_wallet_123' }),
  source: z.string().openapi({ example: 'evm' }),
  chainId: z.number().openapi({ example: 11155111 }),
  target: z.string().openapi({ example: '0x...' }),
  value: z.string().openapi({ example: '0' }),
  data: z.string().optional().openapi({ example: '0x' }),
  nonce: z.number().optional().openapi({ example: 0 }),
  deadline: z.number().optional().openapi({ example: 0 }),
  signature: z.string().openapi({ example: '0x...' }),
})

const MetaSubmitRoute = createRoute({
  method: 'post',
  path: '/relay/meta-submit',
  security: [{ Bearer: [] }],
  request: { body: { content: { 'application/json': { schema: MetaSubmitSchema } }, required: true } },
  responses: {
    201: { description: 'Meta-tx submitted', content: { 'application/json': { schema: z.object({ id: z.string(), txHash: z.string().optional() }) } } },
    400: { description: 'Missing required fields' },
    500: { description: 'Server error' },
  },
})

app.openapi(MetaSubmitRoute, async (c) => {
  const body = c.req.valid('json')
  const result = await submitMetaTx({ ...body, data: body.data || '0x', nonce: body.nonce || 0, deadline: body.deadline || 0 })
  if (result.error) return c.json({ error: result.error }, 500)
  return c.json(result, 201)
})

// --- Sponsored Info (user or publishable) ---

app.use('/relay/sponsored-info', authUserOrPublishable)

const SponsoredInfoRoute = createRoute({
  method: 'get',
  path: '/relay/sponsored-info',
  responses: { 200: { description: 'Sponsored relayer info', content: { 'application/json': { schema: z.any() } } } },
})

app.openapi(SponsoredInfoRoute, async (c) => c.json(await getSponsoredRelayerInfo()))

// --- Sponsored Solana Swap (user) ---

app.use('/relay/sponsored-solana-swap', authUser)

const SolanaSwapSchema = z.object({
  quoteResponse: z.any(),
  userAddress: z.string().openapi({ example: '9ErX5EiqVtr9H...' }),
})

const SolanaSwapRoute = createRoute({
  method: 'post',
  path: '/relay/sponsored-solana-swap',
  security: [{ Bearer: [] }],
  request: { body: { content: { 'application/json': { schema: SolanaSwapSchema } }, required: true } },
  responses: {
    200: { description: 'Sponsored tx built', content: { 'application/json': { schema: z.object({ partiallySignedTx: z.string() }) } } },
    400: { description: 'Missing fields' },
    500: { description: 'Build failed' },
  },
})

app.openapi(SolanaSwapRoute, async (c) => {
  const { quoteResponse, userAddress } = c.req.valid('json')
  try {
    const result = await buildSponsoredSolanaSwap(quoteResponse, userAddress)
    return c.json(result)
  } catch (err: any) {
    return c.json({ error: err.message || 'Sponsored Solana swap failed' }, 500)
  }
})

// --- Sponsored Solana Transfer (user) ---

app.use('/relay/sponsored-solana-transfer', authUser)

const SolanaTransferSchema = z.object({
  to: z.string().openapi({ example: '9ErX5EiqVtr9H...' }),
  lamports: z.number().openapi({ example: 1000000 }),
  userAddress: z.string().openapi({ example: '9ErX5EiqVtr9H...' }),
})

const SolanaTransferRoute = createRoute({
  method: 'post',
  path: '/relay/sponsored-solana-transfer',
  security: [{ Bearer: [] }],
  request: { body: { content: { 'application/json': { schema: SolanaTransferSchema } }, required: true } },
  responses: {
    200: { description: 'Sponsored transfer built', content: { 'application/json': { schema: z.any() } } },
    400: { description: 'Missing fields' },
    500: { description: 'Build failed' },
  },
})

app.openapi(SolanaTransferRoute, async (c) => {
  const { to, lamports, userAddress } = c.req.valid('json')
  try {
    const result = await buildSponsoredSolanaTransfer(to, Number(lamports), userAddress)
    return c.json(result)
  } catch (err: any) {
    return c.json({ error: err.message || 'Sponsored Solana transfer failed' }, 500)
  }
})

// --- Sponsored TON Swap (user) ---

app.use('/relay/sponsored-ton-swap', authUser)

const TonSwapSchema = z.object({
  walletAddress: z.string().openapi({ example: 'EQCUhWYp6TZ...' }),
  target: z.string().openapi({ example: 'EQD...' }),
  value: z.string().openapi({ example: '100000000' }),
  payloadBase64: z.string().openapi({ example: 'te6...' }),
  seqno: z.number().openapi({ example: 0 }),
  signatureBase64: z.string().openapi({ example: 'te6...' }),
})

const TonSwapRoute = createRoute({
  method: 'post',
  path: '/relay/sponsored-ton-swap',
  security: [{ Bearer: [] }],
  request: { body: { content: { 'application/json': { schema: TonSwapSchema } }, required: true } },
  responses: {
    200: { description: 'Sponsored TON swap sent', content: { 'application/json': { schema: z.object({ txHash: z.string() }) } } },
    400: { description: 'Missing fields' },
    500: { description: 'Send failed' },
  },
})

app.openapi(TonSwapRoute, async (c) => {
  const { walletAddress, target, value, payloadBase64, seqno, signatureBase64 } = c.req.valid('json')
  try {
    const bodyCell = buildSignedExecuteBody(target, value, payloadBase64, seqno, signatureBase64)
    const txHash = await sendTonExternalMessage(walletAddress, bodyCell)
    return c.json({ txHash })
  } catch (err: any) {
    return c.json({ error: err.message || 'Sponsored TON swap failed' }, 500)
  }
})

// --- Relay Info (user or publishable) ---

app.use('/relay/info/:chainId', authUserOrPublishable)

const RelayInfoRoute = createRoute({
  method: 'get',
  path: '/relay/info/{chainId}',
  request: { params: z.object({ chainId: z.string().openapi({ example: '11155111' }) }) },
  responses: {
    200: { description: 'Relay info', content: { 'application/json': { schema: z.any() } } },
    400: { description: 'Invalid chainId' },
    404: { description: 'Not configured' },
  },
})

app.openapi(RelayInfoRoute, async (c) => {
  const chainId = parseInt(c.req.valid('param').chainId)
  if (isNaN(chainId)) return c.json({ error: 'Invalid chainId' }, 400)
  const contractAddress = getRelayContractAddress(chainId)
  if (!contractAddress) return c.json({ error: 'Relay not configured for chain' }, 404)
  const relayerAddress = await getRelayerAddress()
  const relayerBalance = await getRelayerBalance(chainId)
  return c.json({ chainId, contractAddress, relayerAddress, relayerBalance })
})

// --- Relay Pending (secret) ---

app.use('/relay/pending', authSecret)

const PendingRoute = createRoute({
  method: 'get',
  path: '/relay/pending',
  responses: { 200: { description: 'Pending relays', content: { 'application/json': { schema: z.any() } } } },
})

app.openapi(PendingRoute, async (c) => c.json(await listPendingRelays()))

// --- Relay Complete (secret) ---

app.use('/relay/complete/:id', authSecret)

const CompleteRoute = createRoute({
  method: 'post',
  path: '/relay/complete/{id}',
  request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: z.object({ txHash: z.string() }) } }, required: true } },
  responses: { 200: { description: 'Marked complete', content: { 'application/json': { schema: z.object({ status: z.string() }) } } } },
})

app.openapi(CompleteRoute, async (c) => {
  const id = c.req.valid('param').id
  const { txHash } = c.req.valid('json')
  await markRelayComplete(id, txHash)
  return c.json({ status: 'ok' })
})

// --- Relay Fail (secret) ---

app.use('/relay/fail/:id', authSecret)

const FailRoute = createRoute({
  method: 'post',
  path: '/relay/fail/{id}',
  request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: z.object({ error: z.string().optional() }) } }, required: true } },
  responses: { 200: { description: 'Marked failed', content: { 'application/json': { schema: z.object({ status: z.string() }) } } } },
})

app.openapi(FailRoute, async (c) => {
  const id = c.req.valid('param').id
  const { error } = c.req.valid('json')
  await markRelayFailed(id, error || 'Unknown error')
  return c.json({ status: 'ok' })
})

// --- Nonce (user) ---

app.use('/nonce/:wallet/:chainId', authUser)

const NonceRoute = createRoute({
  method: 'get',
  path: '/nonce/{wallet}/{chainId}',
  request: { params: z.object({ wallet: z.string(), chainId: z.string() }) },
  responses: {
    200: { description: 'Nonce', content: { 'application/json': { schema: z.object({ wallet: z.string(), chainId: z.number(), nonce: z.number() }) } } },
    400: { description: 'Invalid chainId' },
  },
})

app.openapi(NonceRoute, async (c) => {
  const { wallet, chainId: cid } = c.req.valid('param')
  const chainId = parseInt(cid)
  if (isNaN(chainId)) return c.json({ error: 'Invalid chainId' }, 400 as any)
  const nonce = await getNonce(wallet, chainId)
  return c.json({ wallet, chainId, nonce } as any)
})

// --- Gas Pool (user or publishable) ---

app.use('/gas-pool/:chainId', authUserOrPublishable)

const GasPoolRoute = createRoute({
  method: 'get',
  path: '/gas-pool/{chainId}',
  request: { params: z.object({ chainId: z.string() }) },
  responses: {
    200: { description: 'Gas pool', content: { 'application/json': { schema: z.any() } } },
    400: { description: 'Invalid chainId' },
  },
})

app.openapi(GasPoolRoute, async (c) => {
  const chainId = parseInt(c.req.valid('param').chainId)
  if (isNaN(chainId)) return c.json({ error: 'Invalid chainId' }, 400 as any)
  const pools = await getGasPool(chainId)
  return c.json({ chainId, pools } as any)
})

// --- OpenAPI Doc + Swagger UI (public) ---

app.doc('/doc', {
  openapi: '3.1.0',
  info: { title: 'Nodius Relayer API', version: '0.1.0' },
  servers: [{ url: `http://localhost:${Number(process.env.PORT) || 3001}`, description: 'Local' }],
})

app.get('/ui', swaggerUI({ url: '/doc' }))

// --- Start ---

const port = Number(process.env.PORT) || 3001
serve({ fetch: app.fetch, port })
console.log(`Backend running on http://localhost:${port}`)
console.log(`Swagger UI: http://localhost:${port}/ui`)
console.log(`OpenAPI spec: http://localhost:${port}/doc`)
