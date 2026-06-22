# Data Relationship Diagram – Nodius Wallet

## Postgres Schema

```sql
create extension if not exists pgcrypto;

create type network_mode as enum ('devnet', 'testnet', 'mainnet');
create type chain_type as enum ('evm', 'solana', 'ton');
create type tx_type as enum ('transfer', 'swap', 'bridge', 'meta_tx');
create type tx_status as enum ('pending', 'submitted', 'confirmed', 'failed');
create type gas_pool_status as enum ('healthy', 'low', 'empty');
create type alert_direction as enum ('above', 'below');
create type relayer_purpose as enum ('evm_meta_tx', 'solana_fee_payer', 'ton_sponsor');

create table profiles (
  id uuid primary key default gen_random_uuid(),
  privy_user_id text unique,
  primary_address text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_settings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  network_mode network_mode not null default 'testnet',
  local_currency text not null default 'usd',
  default_network text not null default 'Ethereum',
  gas_abstraction_enabled boolean not null default true,
  gas_speed text not null default 'normal',
  push_notifications boolean not null default false,
  ton_wallet_contract_addr text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id)
);

create table address_book (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  label text not null,
  address text not null,
  chain_type chain_type not null,
  chain_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table price_alerts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  symbol text not null,
  target_price numeric(36, 18) not null,
  direction alert_direction not null,
  triggered boolean not null default false,
  last_price numeric(36, 18),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contract_deployments (
  id uuid primary key default gen_random_uuid(),
  network_mode network_mode not null,
  chain_type chain_type not null,
  chain_id text not null,
  contract_name text not null,
  contract_address text not null,
  deployment_tx_hash text,
  abi jsonb,
  deployed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(network_mode, chain_type, chain_id, contract_name)
);

create table relayer_wallets (
  id uuid primary key default gen_random_uuid(),
  network_mode network_mode not null,
  chain_type chain_type not null,
  chain_id text not null,
  address text not null,
  purpose relayer_purpose not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(network_mode, chain_type, chain_id, purpose, address)
);

create table gas_pool (
  id uuid primary key default gen_random_uuid(),
  network_mode network_mode not null,
  chain_type chain_type not null,
  chain_id text not null,
  relayer_address text not null,
  native_symbol text not null,
  balance numeric(36, 18) not null default 0,
  threshold numeric(36, 18) not null default 0,
  status gas_pool_status not null default 'healthy',
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(network_mode, chain_type, chain_id, relayer_address)
);

create table nonce_tracker (
  id uuid primary key default gen_random_uuid(),
  network_mode network_mode not null,
  chain_id text not null,
  user_address text not null,
  nonce bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(network_mode, chain_id, user_address)
);

create table relay_queue (
  id uuid primary key default gen_random_uuid(),
  network_mode network_mode not null,
  chain_type chain_type not null,
  chain_id text not null,
  user_address text,
  from_address text,
  to_address text,
  tx_type tx_type not null,
  payload jsonb not null default '{}'::jsonb,
  tx_hash text,
  status tx_status not null default 'pending',
  error_message text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  network_mode network_mode not null,
  user_address text not null,
  chain_type chain_type not null,
  chain_id text not null,
  tx_hash text,
  tx_type tx_type not null,
  status tx_status not null default 'pending',
  from_token text,
  to_token text,
  from_amount numeric(36, 18),
  to_amount numeric(36, 18),
  from_chain_id text,
  to_chain_id text,
  route_provider text,
  explorer_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_relay_queue_status on relay_queue(status);
create index idx_relay_queue_mode_chain on relay_queue(network_mode, chain_type, chain_id);
create index idx_relay_queue_created_at on relay_queue(created_at);

create index idx_transactions_user on transactions(user_address);
create index idx_transactions_hash on transactions(tx_hash);
create index idx_transactions_mode_chain on transactions(network_mode, chain_type, chain_id);
create index idx_transactions_created_at on transactions(created_at desc);

create index idx_gas_pool_mode_chain on gas_pool(network_mode, chain_type, chain_id);
create index idx_price_alerts_profile on price_alerts(profile_id);
create index idx_address_book_profile on address_book(profile_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
before update on profiles
for each row execute function set_updated_at();

create trigger user_settings_set_updated_at
before update on user_settings
for each row execute function set_updated_at();

create trigger address_book_set_updated_at
before update on address_book
for each row execute function set_updated_at();

create trigger price_alerts_set_updated_at
before update on price_alerts
for each row execute function set_updated_at();

create trigger contract_deployments_set_updated_at
before update on contract_deployments
for each row execute function set_updated_at();

create trigger gas_pool_set_updated_at
before update on gas_pool
for each row execute function set_updated_at();

create trigger nonce_tracker_set_updated_at
before update on nonce_tracker
for each row execute function set_updated_at();

create trigger relay_queue_set_updated_at
before update on relay_queue
for each row execute function set_updated_at();

create trigger transactions_set_updated_at
before update on transactions
for each row execute function set_updated_at();
```
