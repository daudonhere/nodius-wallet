-- Nodius Wallet - Supabase Postgres Schema
-- Jalankan di Supabase Dashboard > SQL Editor

do $$ begin
  create type "public"."alert_direction" as enum('above', 'below');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "public"."chain_type" as enum('evm', 'solana', 'ton');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "public"."gas_pool_status" as enum('healthy', 'low', 'empty');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "public"."network_mode" as enum('devnet', 'testnet', 'mainnet');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "public"."relayer_purpose" as enum('evm_meta_tx', 'solana_fee_payer', 'ton_sponsor');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "public"."tx_status" as enum('pending', 'submitted', 'confirmed', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type "public"."tx_type" as enum('transfer', 'swap', 'bridge', 'meta_tx');
exception when duplicate_object then null;
end $$;

create table if not exists "profiles" (
  "id" uuid primary key default gen_random_uuid() not null,
  "privy_user_id" text unique,
  "primary_address" text,
  "display_name" text,
  "avatar_url" text,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists "user_settings" (
  "id" uuid primary key default gen_random_uuid() not null,
  "profile_id" uuid references profiles(id) on delete cascade,
  "network_mode" "network_mode" default 'testnet' not null,
  "local_currency" text default 'usd' not null,
  "default_network" text default 'Ethereum' not null,
  "gas_abstraction_enabled" boolean default true not null,
  "gas_speed" text default 'normal' not null,
  "push_notifications" boolean default false not null,
  "ton_wallet_contract_addr" text,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null,
  constraint "user_settings_profile_id_unique" unique("profile_id")
);

create table if not exists "address_book" (
  "id" uuid primary key default gen_random_uuid() not null,
  "profile_id" uuid references profiles(id) on delete cascade,
  "label" text not null,
  "address" text not null,
  "chain_type" "chain_type" not null,
  "chain_id" text,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists "price_alerts" (
  "id" uuid primary key default gen_random_uuid() not null,
  "profile_id" uuid references profiles(id) on delete cascade,
  "symbol" text not null,
  "target_price" numeric(36, 18) not null,
  "direction" "alert_direction" not null,
  "triggered" boolean default false not null,
  "last_price" numeric(36, 18),
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists "contract_deployments" (
  "id" uuid primary key default gen_random_uuid() not null,
  "network_mode" "network_mode" not null,
  "chain_type" "chain_type" not null,
  "chain_id" text not null,
  "contract_name" text not null,
  "contract_address" text not null,
  "deployment_tx_hash" text,
  "abi" jsonb,
  "deployed_at" timestamptz,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null,
  constraint "contract_deployments_unique" unique("network_mode","chain_type","chain_id","contract_name")
);

create table if not exists "relayer_wallets" (
  "id" uuid primary key default gen_random_uuid() not null,
  "network_mode" "network_mode" not null,
  "chain_type" "chain_type" not null,
  "chain_id" text not null,
  "address" text not null,
  "purpose" "relayer_purpose" not null,
  "active" boolean default true not null,
  "created_at" timestamptz default now() not null,
  constraint "relayer_wallets_unique" unique("network_mode","chain_type","chain_id","purpose","address")
);

create table if not exists "gas_pool" (
  "id" uuid primary key default gen_random_uuid() not null,
  "network_mode" "network_mode" not null,
  "chain_type" "chain_type" not null,
  "chain_id" text not null,
  "relayer_address" text not null,
  "native_symbol" text not null,
  "balance" numeric(36, 18) default '0' not null,
  "threshold" numeric(36, 18) default '0' not null,
  "status" "gas_pool_status" default 'healthy' not null,
  "last_checked_at" timestamptz,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null,
  constraint "gas_pool_unique" unique("network_mode","chain_type","chain_id","relayer_address")
);

create table if not exists "nonce_tracker" (
  "id" uuid primary key default gen_random_uuid() not null,
  "network_mode" "network_mode" not null,
  "chain_id" text not null,
  "user_address" text not null,
  "nonce" integer default 0 not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null,
  constraint "nonce_tracker_unique" unique("network_mode","chain_id","user_address")
);

create table if not exists "relay_queue" (
  "id" uuid primary key default gen_random_uuid() not null,
  "network_mode" "network_mode" not null,
  "chain_type" "chain_type" not null,
  "chain_id" text not null,
  "user_address" text,
  "from_address" text,
  "to_address" text,
  "tx_type" "tx_type" not null,
  "payload" jsonb default '{}'::jsonb not null,
  "tx_hash" text,
  "status" "tx_status" default 'pending' not null,
  "error_message" text,
  "attempts" integer default 0 not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table if not exists "transactions" (
  "id" uuid primary key default gen_random_uuid() not null,
  "network_mode" "network_mode" not null,
  "user_address" text not null,
  "chain_type" "chain_type" not null,
  "chain_id" text not null,
  "tx_hash" text,
  "tx_type" "tx_type" not null,
  "status" "tx_status" default 'pending' not null,
  "from_token" text,
  "to_token" text,
  "from_amount" numeric(36, 18),
  "to_amount" numeric(36, 18),
  "from_chain_id" text,
  "to_chain_id" text,
  "route_provider" text,
  "explorer_url" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);
