import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }))

const port = Number(process.env.PORT) || 3001
serve({ fetch: app.fetch, port })

console.log(`Backend running on http://localhost:${port}`)
