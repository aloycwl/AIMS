import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sql = fs.readFileSync(path.join(__dirname, 'activate.sql'), 'utf8');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uxxfyiukhlsahcyszutt.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || 'sb_secret_Y2wtC4rtlqWwznZGZy2Yig_hF2OvjTl';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || ''; // Optional PAT for Management API
const SUPABASE_SQL_ENDPOINT = process.env.SUPABASE_SQL_ENDPOINT || ''; // Optional direct SQL endpoint override

const authHeaders = {
  apikey: SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${SUPABASE_SECRET_KEY}`
};

const getProjectRef = () => {
  try { return new URL(SUPABASE_URL).hostname.split('.')[0]; }
  catch { return ''; }
};

async function request(name, url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  return { name, ok: res.ok, status: res.status, text };
}

async function run() {
  const attempts = [];

  if (SUPABASE_SQL_ENDPOINT) {
    attempts.push(() => request('Custom SUPABASE_SQL_ENDPOINT', SUPABASE_SQL_ENDPOINT, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/sql' },
      body: sql
    }));
  }

  // Direct project SQL API endpoints (some projects/plans disable these).
  attempts.push(() => request('Project SQL API /sql/v1', `${SUPABASE_URL}/sql/v1`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/sql' },
    body: sql
  }));
  attempts.push(() => request('Project SQL API /pg/v1/query', `${SUPABASE_URL}/pg/v1/query`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  }));

  // Works only if custom function exists already.
  attempts.push(() => request('PostgREST RPC /rest/v1/rpc/exec_sql', `${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
  }));

  // Supabase Management API fallback (requires personal access token, not service role key).
  const ref = getProjectRef();
  if (SUPABASE_ACCESS_TOKEN && ref) {
    attempts.push(() => request('Management API /v1/projects/{ref}/database/query', `https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    }));
  }

  const results = [];
  for (const attempt of attempts) {
    try {
      const r = await attempt();
      results.push(r);
      if (r.ok) {
        console.log(`Activation completed via: ${r.name}`);
        return;
      }
    } catch (e) {
      results.push({ name: 'network/runtime error', ok: false, status: 0, text: e.message });
    }
  }

  console.error('Activation failed for all available endpoints.');
  for (const r of results) {
    console.error(`- ${r.name} -> ${r.status}: ${r.text}`);
  }

  console.error('\nWhy this happens: your project may not expose SQL HTTP endpoints, and exec_sql RPC is not installed yet.');
  console.error('Fix options:');
  console.error('1) Set SUPABASE_ACCESS_TOKEN (personal access token) and rerun npm run activate.');
  console.error('2) Or open Supabase SQL Editor and run ./activate.sql manually once.');
  process.exit(1);
}

run().catch((e) => {
  console.error('Activation error:', e.message);
  process.exit(1);
});
