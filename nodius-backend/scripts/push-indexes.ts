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
create index if not exists idx_relay_queue_status on relay_queue(status);
create index if not exists idx_relay_queue_mode_chain on relay_queue(network_mode, chain_type, chain_id);
create index if not exists idx_relay_queue_created_at on relay_queue(created_at);

create index if not exists idx_transactions_user on transactions(user_address);
create index if not exists idx_transactions_hash on transactions(tx_hash);
create index if not exists idx_transactions_mode_chain on transactions(network_mode, chain_type, chain_id);
create index if not exists idx_transactions_created_at on transactions(created_at desc);

create index if not exists idx_gas_pool_mode_chain on gas_pool(network_mode, chain_type, chain_id);
create index if not exists idx_price_alerts_profile on price_alerts(profile_id);
create index if not exists idx_address_book_profile on address_book(profile_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  create trigger profiles_set_updated_at before update on profiles for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger user_settings_set_updated_at before update on user_settings for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger address_book_set_updated_at before update on address_book for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger price_alerts_set_updated_at before update on price_alerts for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger contract_deployments_set_updated_at before update on contract_deployments for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger gas_pool_set_updated_at before update on gas_pool for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger nonce_tracker_set_updated_at before update on nonce_tracker for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger relay_queue_set_updated_at before update on relay_queue for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger transactions_set_updated_at before update on transactions for each row execute function set_updated_at();
exception when duplicate_object then null;
end $$;
`

async function run() {
  console.log('Adding indexes and triggers...')
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
  console.log('Indexes and triggers added!')
}

run()
