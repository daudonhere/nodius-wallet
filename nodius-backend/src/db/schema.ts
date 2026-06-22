import {
  pgTable, pgEnum, uuid, text, numeric, integer, boolean, jsonb, timestamp, unique,
} from 'drizzle-orm/pg-core'

export const networkModeEnum = pgEnum('network_mode', ['devnet', 'testnet', 'mainnet'])
export const chainTypeEnum = pgEnum('chain_type', ['evm', 'solana', 'ton'])
export const txTypeEnum = pgEnum('tx_type', ['transfer', 'swap', 'bridge', 'meta_tx'])
export const txStatusEnum = pgEnum('tx_status', ['pending', 'submitted', 'confirmed', 'failed'])
export const gasPoolStatusEnum = pgEnum('gas_pool_status', ['healthy', 'low', 'empty'])
export const alertDirectionEnum = pgEnum('alert_direction', ['above', 'below'])
export const relayerPurposeEnum = pgEnum('relayer_purpose', ['evm_meta_tx', 'solana_fee_payer', 'ton_sponsor'])

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  privyUserId: text('privy_user_id').unique(),
  primaryAddress: text('primary_address'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  networkMode: networkModeEnum('network_mode').notNull().default('testnet'),
  localCurrency: text('local_currency').notNull().default('usd'),
  defaultNetwork: text('default_network').notNull().default('Ethereum'),
  gasAbstractionEnabled: boolean('gas_abstraction_enabled').notNull().default(true),
  gasSpeed: text('gas_speed').notNull().default('normal'),
  pushNotifications: boolean('push_notifications').notNull().default(false),
  tonWalletContractAddr: text('ton_wallet_contract_addr'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqueProfileId: unique().on(t.profileId) }))

export const addressBook = pgTable('address_book', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  address: text('address').notNull(),
  chainType: chainTypeEnum('chain_type').notNull(),
  chainId: text('chain_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const priceAlerts = pgTable('price_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  symbol: text('symbol').notNull(),
  targetPrice: numeric('target_price', { precision: 36, scale: 18 }).notNull(),
  direction: alertDirectionEnum('direction').notNull(),
  triggered: boolean('triggered').notNull().default(false),
  lastPrice: numeric('last_price', { precision: 36, scale: 18 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const contractDeployments = pgTable('contract_deployments', {
  id: uuid('id').defaultRandom().primaryKey(),
  networkMode: networkModeEnum('network_mode').notNull(),
  chainType: chainTypeEnum('chain_type').notNull(),
  chainId: text('chain_id').notNull(),
  contractName: text('contract_name').notNull(),
  contractAddress: text('contract_address').notNull(),
  deploymentTxHash: text('deployment_tx_hash'),
  abi: jsonb('abi'),
  deployedAt: timestamp('deployed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqueContract: unique().on(t.networkMode, t.chainType, t.chainId, t.contractName) }))

export const relayerWallets = pgTable('relayer_wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  networkMode: networkModeEnum('network_mode').notNull(),
  chainType: chainTypeEnum('chain_type').notNull(),
  chainId: text('chain_id').notNull(),
  address: text('address').notNull(),
  purpose: relayerPurposeEnum('purpose').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqueRelayerWallet: unique().on(t.networkMode, t.chainType, t.chainId, t.purpose, t.address) }))

export const gasPool = pgTable('gas_pool', {
  id: uuid('id').defaultRandom().primaryKey(),
  networkMode: networkModeEnum('network_mode').notNull(),
  chainType: chainTypeEnum('chain_type').notNull(),
  chainId: text('chain_id').notNull(),
  relayerAddress: text('relayer_address').notNull(),
  nativeSymbol: text('native_symbol').notNull(),
  balance: numeric('balance', { precision: 36, scale: 18 }).notNull().default('0'),
  threshold: numeric('threshold', { precision: 36, scale: 18 }).notNull().default('0'),
  status: gasPoolStatusEnum('status').notNull().default('healthy'),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqueGasPool: unique().on(t.networkMode, t.chainType, t.chainId, t.relayerAddress) }))

export const nonceTracker = pgTable('nonce_tracker', {
  id: uuid('id').defaultRandom().primaryKey(),
  networkMode: networkModeEnum('network_mode').notNull(),
  chainId: text('chain_id').notNull(),
  userAddress: text('user_address').notNull(),
  nonce: integer('nonce').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqueNonce: unique().on(t.networkMode, t.chainId, t.userAddress) }))

export const relayQueue = pgTable('relay_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  networkMode: networkModeEnum('network_mode').notNull(),
  chainType: chainTypeEnum('chain_type').notNull(),
  chainId: text('chain_id').notNull(),
  userAddress: text('user_address'),
  fromAddress: text('from_address'),
  toAddress: text('to_address'),
  txType: txTypeEnum('tx_type').notNull(),
  payload: jsonb('payload').notNull().default({}),
  txHash: text('tx_hash'),
  status: txStatusEnum('status').notNull().default('pending'),
  errorMessage: text('error_message'),
  attempts: integer('attempts').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  networkMode: networkModeEnum('network_mode').notNull(),
  userAddress: text('user_address').notNull(),
  chainType: chainTypeEnum('chain_type').notNull(),
  chainId: text('chain_id').notNull(),
  txHash: text('tx_hash'),
  txType: txTypeEnum('tx_type').notNull(),
  status: txStatusEnum('status').notNull().default('pending'),
  fromToken: text('from_token'),
  toToken: text('to_token'),
  fromAmount: numeric('from_amount', { precision: 36, scale: 18 }),
  toAmount: numeric('to_amount', { precision: 36, scale: 18 }),
  fromChainId: text('from_chain_id'),
  toChainId: text('to_chain_id'),
  routeProvider: text('route_provider'),
  explorerUrl: text('explorer_url'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
