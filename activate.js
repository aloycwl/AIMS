import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sql = fs.readFileSync(path.join(__dirname, 'activate.sql'), 'utf8');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uxxfyiukhlsahcyszutt.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4eGZ5aXVraGxzYWhjeXN6dXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTgyNTYwNCwiZXhwIjoyMDYxNDAxNjA0fQ.sqHGHO-5cyYrwFJUeGlWFBXScO44dRJfE-savaPGDW0';

const authHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
};

async function tryEndpoint(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function run() {
  const attempts = [
    {
      name: 'SQL API /sql/v1',
      call: () => tryEndpoint(`${SUPABASE_URL}/sql/v1`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/sql' },
        body: sql
      })
    },
    {
      name: 'SQL API /pg/v1/query',
      call: () => tryEndpoint(`${SUPABASE_URL}/pg/v1/query`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql })
      })
    },
    {
      name: 'RPC exec_sql',
      call: () => tryEndpoint(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      })
    }
  ];

  const results = [];
  for (const attempt of attempts) {
    try {
      const r = await attempt.call();
      results.push({ endpoint: attempt.name, ...r });
      if (r.ok) {
        console.log(`Activation completed via ${attempt.name}.`);
        return;
      }
    } catch (e) {
      results.push({ endpoint: attempt.name, ok: false, status: 0, text: e.message });
    }
  }

  console.error('Activation failed for all API endpoints.');
  for (const r of results) {
    console.error(`- ${r.endpoint} -> ${r.status}: ${r.text}`);
  }
  console.error('\nFallback: open Supabase SQL Editor and run ./activate.sql manually.');
  process.exit(1);
}

run().catch((e) => {
  console.error('Activation error:', e.message);
  process.exit(1);
});
