export function createSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  async function sb(pathname, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
      method: options.method || 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: options.prefer || 'return=representation'
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!res.ok) {
      throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : [];
  }

  async function one(pathname) {
    const rows = await sb(pathname);
    return rows[0] || null;
  }

  return { sb, one };
}
