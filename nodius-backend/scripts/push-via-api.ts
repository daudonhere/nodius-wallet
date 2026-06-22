import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const token = process.env.SUPABASE_MGMT_TOKEN
const projectRef = process.env.SUPABASE_PROJECT_REF || 'gbozkyrhfffoyddlxsha'
const sqlPath = resolve(__dirname, '../scripts/migrate.sql')
const sql = readFileSync(sqlPath, 'utf-8')

if (!token) {
  console.error('Missing SUPABASE_MGMT_TOKEN env var')
  process.exit(1)
}

async function run() {
  console.log('Pushing schema via Management API...')
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
  console.log('Schema pushed successfully!')
}

run()
