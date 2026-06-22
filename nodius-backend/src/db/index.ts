import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

export function getNetworkMode(): 'devnet' | 'testnet' | 'mainnet' {
  return (process.env.APP_NETWORK as 'devnet' | 'testnet' | 'mainnet') || 'testnet'
}
