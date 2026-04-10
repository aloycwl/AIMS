import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sql = fs.readFileSync(path.join(__dirname, 'activate.sql'), 'utf8');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uxxfyiukhlsahcyszutt.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4eGZ5aXVraGxzYWhjeXN6dXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTgyNTYwNCwiZXhwIjoyMDYxNDAxNjA0fQ.sqHGHO-5cyYrwFJUeGlWFBXScO44dRJfE-savaPGDW0';

async function run() {
  // Supabase SQL execution endpoint (available for service-role projects with SQL API enabled).
  const res = await fetch(`${SUPABASE_URL}/sql/v1`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/sql'
    },
    body: sql
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Activation API failed. You can paste wa_server/activate.sql into Supabase SQL editor.');
    console.error(text);
    process.exit(1);
  }

  console.log('Supabase activation completed successfully.');
}

run().catch((e) => {
  console.error('Activation error:', e.message);
  process.exit(1);
});
