import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

const client = createClient({
  url: process.env.DATABASE_URL || 'file:./data/nodius.db',
})

export async function initDb() {
  await client.execute(`CREATE TABLE IF NOT EXISTS relay_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id TEXT NOT NULL,
    source TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    signed_tx TEXT,
    relay_type TEXT NOT NULL DEFAULT 'raw',
    target TEXT,
    value TEXT,
    calldata TEXT,
    signature TEXT,
    deadline INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    tx_hash TEXT,
    nonce INTEGER,
    gas_price REAL,
    created_at INTEGER NOT NULL,
    submitted_at INTEGER,
    completed_at INTEGER,
    error TEXT
  )`)

  await client.execute(`CREATE TABLE IF NOT EXISTS nonce_tracker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    nonce INTEGER NOT NULL
  )`)

  await client.execute(`CREATE TABLE IF NOT EXISTS gas_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chain_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    balance TEXT NOT NULL,
    threshold TEXT NOT NULL
  )`)
}

export const db = drizzle(client, { schema })
