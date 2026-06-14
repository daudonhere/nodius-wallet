import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const relayQueue = sqliteTable('relay_queue', {
  id: integer().primaryKey({ autoIncrement: true }),
  walletId: text({ length: 64 }).notNull(),
  source: text({ length: 16 }).notNull(),
  chainId: integer().notNull(),
  signedTx: text().notNull(),
  status: text({ length: 16 }).notNull().default('pending'),
  txHash: text({ length: 128 }),
  nonce: integer(),
  gasPrice: real(),
  createdAt: integer().notNull(),
  submittedAt: integer(),
  completedAt: integer(),
  error: text(),
})

export const nonceTracker = sqliteTable('nonce_tracker', {
  id: integer().primaryKey({ autoIncrement: true }),
  walletAddress: text({ length: 64 }).notNull(),
  chainId: integer().notNull(),
  nonce: integer().notNull(),
})

export const gasPool = sqliteTable('gas_pool', {
  id: integer().primaryKey({ autoIncrement: true }),
  chainId: integer().notNull(),
  symbol: text({ length: 16 }).notNull(),
  balance: text({ length: 64 }).notNull(),
  threshold: text({ length: 64 }).notNull(),
})
