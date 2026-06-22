import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const token = process.env.SUPABASE_MGMT_TOKEN
const projectRef = process.env.SUPABASE_PROJECT_REF || 'gbozkyrhfffoyddlxsha'

if (!token) {
  console.error('Missing SUPABASE_MGMT_TOKEN env var')
  process.exit(1)
}

const sql = `
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table address_book enable row level security;
alter table price_alerts enable row level security;
alter table contract_deployments enable row level security;
alter table gas_pool enable row level security;
alter table relay_queue enable row level security;
alter table transactions enable row level security;

-- RLS policies: service_role bypasses all RLS (used by backend)
-- These policies apply to direct user access via Supabase client

-- Profiles: users read/update own row
do $$ begin
  drop policy if exists profiles_select_own on profiles;
  create policy profiles_select_own on profiles
    for select using (auth.uid()::text = privy_user_id);
exception when others then null;
end $$;

do $$ begin
  drop policy if exists profiles_update_own on profiles;
  create policy profiles_update_own on profiles
    for update using (auth.uid()::text = privy_user_id);
exception when others then null;
end $$;

-- User settings: users read/update own row (via profile_id)
do $$ begin
  drop policy if exists user_settings_select_own on user_settings;
  create policy user_settings_select_own on user_settings
    for select using (
      profile_id in (select id from profiles where auth.uid()::text = privy_user_id)
    );
exception when others then null;
end $$;

do $$ begin
  drop policy if exists user_settings_update_own on user_settings;
  create policy user_settings_update_own on user_settings
    for update using (
      profile_id in (select id from profiles where auth.uid()::text = privy_user_id)
    );
exception when others then null;
end $$;

-- Address book: users CRUD own entries
do $$ begin
  drop policy if exists address_book_select_own on address_book;
  create policy address_book_select_own on address_book
    for select using (
      profile_id in (select id from profiles where auth.uid()::text = privy_user_id)
    );
exception when others then null;
end $$;

do $$ begin
  drop policy if exists address_book_insert_own on address_book;
  create policy address_book_insert_own on address_book
    for insert with check (
      profile_id in (select id from profiles where auth.uid()::text = privy_user_id)
    );
exception when others then null;
end $$;

do $$ begin
  drop policy if exists address_book_update_own on address_book;
  create policy address_book_update_own on address_book
    for update using (
      profile_id in (select id from profiles where auth.uid()::text = privy_user_id)
    );
exception when others then null;
end $$;

do $$ begin
  drop policy if exists address_book_delete_own on address_book;
  create policy address_book_delete_own on address_book
    for delete using (
      profile_id in (select id from profiles where auth.uid()::text = privy_user_id)
    );
exception when others then null;
end $$;

-- Price alerts: users CRUD own entries
do $$ begin
  drop policy if exists price_alerts_select_own on price_alerts;
  create policy price_alerts_select_own on price_alerts
    for select using (
      profile_id in (select id from profiles where auth.uid()::text = privy_user_id)
    );
exception when others then null;
end $$;

do $$ begin
  drop policy if exists price_alerts_insert_own on price_alerts;
  create policy price_alerts_insert_own on price_alerts
    for insert with check (
      profile_id in (select id from profiles where auth.uid()::text = privy_user_id)
    );
exception when others then null;
end $$;

do $$ begin
  drop policy if exists price_alerts_update_own on price_alerts;
  create policy price_alerts_update_own on price_alerts
    for update using (
      profile_id in (select id from profiles where auth.uid()::text = privy_user_id)
    );
exception when others then null;
end $$;

do $$ begin
  drop policy if exists price_alerts_delete_own on price_alerts;
  create policy price_alerts_delete_own on price_alerts
    for delete using (
      profile_id in (select id from profiles where auth.uid()::text = privy_user_id)
    );
exception when others then null;
end $$;

-- Contract deployments: authenticated users can read
do $$ begin
  drop policy if exists contract_deployments_select_auth on contract_deployments;
  create policy contract_deployments_select_auth on contract_deployments
    for select using (auth.role() = 'authenticated');
exception when others then null;
end $$;

-- Gas pool: authenticated users can read
do $$ begin
  drop policy if exists gas_pool_select_auth on gas_pool;
  create policy gas_pool_select_auth on gas_pool
    for select using (auth.role() = 'authenticated');
exception when others then null;
end $$;

-- Relay queue: users read own entries
do $$ begin
  drop policy if exists relay_queue_select_own on relay_queue;
  create policy relay_queue_select_own on relay_queue
    for select using (user_address is not null and exists (
      select 1 from profiles where auth.uid()::text = privy_user_id and primary_address = relay_queue.user_address
    ));
exception when others then null;
end $$;

-- Transactions: users read own entries
do $$ begin
  drop policy if exists transactions_select_own on transactions;
  create policy transactions_select_own on transactions
    for select using (user_address is not null and exists (
      select 1 from profiles where auth.uid()::text = privy_user_id and primary_address = transactions.user_address
    ));
exception when others then null;
end $$;
`

async function run() {
  console.log('Applying RLS policies...')
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )
  const text = await res.text()
  if (!res.ok) {
    console.error('Error:', text)
    process.exit(1)
  }
  console.log('RLS policies applied!')
}

run()
