import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const relayQueue = sqliteTable('relay_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  walletId: text('wallet_id', { length: 64 }).notNull(),
  source: text('source', { length: 16 }).notNull(),
  chainId: integer('chain_id').notNull(),
  signedTx: text('signed_tx'),
  relayType: text('relay_type', { length: 16 }).notNull().default('raw'),
  target: text('target', { length: 64 }),
  value: text('value', { length: 64 }),
  calldata: text('calldata'),
  signature: text('signature', { length: 256 }),
  deadline: integer('deadline'),
  status: text('status', { length: 16 }).notNull().default('pending'),
  txHash: text('tx_hash', { length: 128 }),
  nonce: integer('nonce'),
  gasPrice: real('gas_price'),
  createdAt: integer('created_at').notNull(),
  submittedAt: integer('submitted_at'),
  completedAt: integer('completed_at'),
  error: text('error'),
})

export const nonceTracker = sqliteTable('nonce_tracker', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  walletAddress: text('wallet_address', { length: 64 }).notNull(),
  chainId: integer('chain_id').notNull(),
  nonce: integer('nonce').notNull(),
})

export const gasPool = sqliteTable('gas_pool', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chainId: integer('chain_id').notNull(),
  symbol: text('symbol', { length: 16 }).notNull(),
  balance: text('balance', { length: 64 }).notNull(),
  threshold: text('threshold', { length: 64 }).notNull(),
})
