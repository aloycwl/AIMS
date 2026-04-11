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
      if (SUPABASE_KEY.startsWith('sk_test_')) {
        console.warn('Mocking Supabase response for dev/test.');
        if (pathname.includes('plans')) return [{ id: 1, label: '30 Days', price: 50, duration_days: 30, shares: 50, bonus_pct: 0, discount_pct: 0 }];
        if (pathname.includes('roles')) return [{ id: 1, name: 'Support Bot', capabilities: 'Answers FAQs', monthly_price: 0, popular: true }];
        return [];
      }
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
