import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sql = fs.readFileSync(path.join(__dirname, '..', 'sql_add_reset_token.sql'), 'utf8')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL')
  process.exit(1)
}

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}

const getProjectRef = () => new URL(SUPABASE_URL).hostname.split('.')[0]

async function run() {
  const ref = getProjectRef()

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  })

  const text = await res.text()

  if (!res.ok) {
    console.error(`Activation failed: ${res.status}`)
    console.error(text)
    process.exit(1)
  }

  console.log('Activation completed successfully')
}

run().catch((e) => {
  console.error('Unexpected error:', e.message)
  process.exit(1)
})
