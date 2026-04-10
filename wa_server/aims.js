import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uxxfyiukhlsahcyszutt.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4eGZ5aXVraGxzYWhjeXN6dXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTgyNTYwNCwiZXhwIjoyMDYxNDAxNjA0fQ.sqHGHO-5cyYrwFJUeGlWFBXScO44dRJfE-savaPGDW0';

const sessions = new Map();
const money = (n) => Number(n || 0).toFixed(2);
const uuid = () => crypto.randomUUID();
const nowISO = () => new Date().toISOString();
const addDaysISO = (dateISO, days) => new Date(new Date(dateISO).getTime() + days * 86400000).toISOString();
const next5s = () => new Date(Date.now() + 5000).toISOString();

const plans = [
  { price: 50, duration_days: 7, shares: 50, bonus_pct: 0, discount_pct: 0, label: '1 Week' },
  { price: 200, duration_days: 30, shares: 105, bonus_pct: 5, discount_pct: 0, label: '1 Month' },
  { price: 500, duration_days: 90, shares: 660, bonus_pct: 10, discount_pct: 15, label: '3 Months' },
  { price: 1000, duration_days: 180, shares: 1380, bonus_pct: 15, discount_pct: 15, label: '6 Months' },
  { price: 1920, duration_days: 365, shares: 2880, bonus_pct: 20, discount_pct: 20, label: '1 Year' },
  { price: 3840, duration_days: 730, shares: 6000, bonus_pct: 25, discount_pct: 20, label: '2 Years' },
  { price: 5400, duration_days: 1095, shares: 9360, bonus_pct: 30, discount_pct: 25, label: '3 Years' },
  { price: 9000, duration_days: 1825, shares: 16800, bonus_pct: 40, discount_pct: 25, label: '5 Years' },
  { price: 16800, duration_days: 3650, shares: 36000, bonus_pct: 50, discount_pct: 30, label: '1 Decade' }
];

const defaultRoles = [
  ['Marketing Person', 0, 'Top-rated growth engine for campaign strategy and lead conversion.', true],
  ['Sales Closer AI', 149, 'Closes high-intent leads with objection-handling scripts.', false],
  ['Customer Support Agent', 79, '24/7 support triage and response handling.', false],
  ['Social Media Strategist', 99, 'Plans content calendars and growth loops.', false],
  ['HR Screening Assistant', 59, 'Screens and ranks candidates automatically.', false],
  ['Finance Ops Assistant', 129, 'Tracks invoices, expenses, and reconciliation.', false],
  ['SEO Content Agent', 89, 'Builds SEO briefs and optimized drafts.', false],
  ['Outbound SDR Agent', 119, 'Runs prospecting and outreach workflows.', false],
  ['Operations Coordinator', 109, 'Keeps SOP tasks and team automation moving.', false],
  ['Project Manager AI', 139, 'Manages sprint cadence and delivery updates.', false],
  ['Legal Intake Assistant', 169, 'Collects intake and drafts initial legal docs.', false],
  ['Ecommerce Merchandiser', 95, 'Optimizes listings, bundles, and promotions.', false],
];

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : [];
}

async function one(path) { const rows = await sb(path); return rows[0] || null; }
async function ensureSeedData() {
  await sb('users', { method: 'POST', body: [{ email: 'aloycwl@gmail.com', password: 'Password123', referral_code: 'ALOYCWL', is_admin: true, total_subscribed: 0, total_earned: 0, share_balance: 0, wallet_usdt: 0, openclaw_ends_at: nowISO() }], prefer: 'resolution=ignore-duplicates,return=minimal' });
  await sb('roles', { method: 'POST', body: defaultRoles.map(([name, monthly_price, capabilities, popular]) => ({ name, monthly_price, capabilities, popular })), prefer: 'resolution=ignore-duplicates,return=minimal' });
}

function nav(user) {
  return `<nav><a href='/'>AIMS</a><a href='/deploy'>1-Click Deploy</a><a href='/staffing'>AI Staffing</a><a href='/referrals'>Referral Model</a>${user ? `<a href='/dashboard'>Dashboard</a><a href='/logout'>Logout</a>${user.is_admin ? `<a href='/admin'>Admin</a>` : ''}` : `<a href='/login'>Login</a><a href='/register'>Register</a>`}</nav>`;
}
function page(title, body, user = null) {
  return `<!doctype html><html><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/><title>${title}</title><link rel='stylesheet' href='/static/style.css'></head><body>${nav(user)}<main>${body}</main><footer><p>© AIMS Demo Platform • Built for staged production growth.</p></footer></body></html>`;
}

async function currentUser(req) {
  const sid = req.headers.cookie?.split(';').map(s => s.trim()).find(x => x.startsWith('sid='))?.split('=')[1];
  if (!sid || !sessions.has(sid)) return null;
  return one(`users?id=eq.${sessions.get(sid)}&select=*`);
}
async function requireAuth(req, res, next) {
  try {
    const user = await currentUser(req);
    if (!user) return res.redirect('/login');
    req.user = user;
    next();
  } catch (e) { res.status(500).send(e.message); }
}
const eligible = (u) => Number(u.total_earned) < Number(u.total_subscribed) * 2;
const calcShares = (p) => Math.floor(p.shares * (1 + p.bonus_pct / 100));
const randomIP = () => `${10 + Math.floor(Math.random() * 180)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

async function uplineChain(user) {
  const chain = [];
  let current = user;
  while (current.referred_by) {
    const up = await one(`users?referral_code=eq.${encodeURIComponent(current.referred_by)}&select=*`);
    if (!up) break;
    chain.push(up); current = up;
  }
  return chain;
}

async function creditReward(user, fromUserId, amount, type, note) {
  if (!user || amount <= 0 || !eligible(user)) return;
  const capLeft = (Number(user.total_subscribed) * 2) - Number(user.total_earned);
  const finalAmount = Math.max(0, Math.min(amount, capLeft));
  if (!finalAmount) return;
  await sb(`users?id=eq.${user.id}`, { method: 'PATCH', body: { total_earned: Number(user.total_earned) + finalAmount, wallet_usdt: Number(user.wallet_usdt) + finalAmount } });
  await sb('rewards', { method: 'POST', body: [{ user_id: user.id, from_user_id: fromUserId, amount: finalAmount, type, note, created_at: nowISO() }] });
}

app.get('/', async (req, res) => {
  const user = await currentUser(req);
  const html = `<section class='hero'><div><h1>AIMS — AI Management System</h1><p>Production-ready structure for OpenClaw deployment, AI staffing commerce, and referral operations.</p><div class='actions'><a class='btn' href='/deploy'>Launch 1-Click Deploy</a><a class='btn ghost' href='/staffing'>View AI Staffing</a></div></div><img src='https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80' alt='AI server room' /></section><section class='grid feature-grid'><article class='card'><h3>OpenClaw Subscription</h3><p>Fast payment simulation and provisioning telemetry.</p></article><article class='card'><h3>Agent Staffing</h3><p>12 role catalog with CMS-driven expansion.</p></article><article class='card'><h3>Referral Economics</h3><p>50% direct and weighted 20% upline pool.</p></article></section>`;
  res.send(page('AIMS', html, user));
});

app.get('/register', async (req, res) => {
  res.send(page('Register', `<section class='panel'><h2>Create Account</h2><p>Use any email for test onboarding; verification is intentionally disabled.</p><form method='post'><label>Email</label><input name='email' required/><label>Password</label><input type='password' name='password' required/><label>Referral Code (optional)</label><input name='ref' value='${req.query.ref || ''}'/><button>Create account</button></form></section>`));
});
app.post('/register', async (req, res) => {
  try {
    const { email, password, ref } = req.body;
    const exists = await one(`users?email=eq.${encodeURIComponent(email)}&select=id`);
    if (exists) return res.send(page('Register', `<section class='panel'><h2>Email already exists</h2><a class='btn' href='/register'>Try another</a></section>`));
    const referral_code = `${email.split('@')[0].slice(0, 6).toUpperCase()}${Math.floor(Math.random() * 9999)}`;
    await sb('users', { method: 'POST', body: [{ email, password, referral_code, referred_by: ref || null, is_admin: false, total_subscribed: 0, total_earned: 0, share_balance: 0, wallet_usdt: 0, openclaw_ends_at: nowISO() }] });
    res.redirect('/login');
  } catch (e) { res.status(500).send(e.message); }
});

app.get('/login', async (req, res) => res.send(page('Login', `<section class='panel narrow'><h2>Sign in</h2><form method='post'><label>Email</label><input name='email' required/><label>Password</label><input type='password' name='password' required/><button>Login</button></form></section>`)));
app.post('/login', async (req, res) => {
  try {
    const user = await one(`users?email=eq.${encodeURIComponent(req.body.email)}&password=eq.${encodeURIComponent(req.body.password)}&select=*`);
    if (!user) return res.send(page('Login', `<section class='panel'><h2>Invalid credentials</h2><a class='btn' href='/login'>Try again</a></section>`));
    const sid = uuid(); sessions.set(sid, user.id);
    res.setHeader('Set-Cookie', `sid=${sid}; Path=/; HttpOnly`);
    res.redirect('/dashboard');
  } catch (e) { res.status(500).send(e.message); }
});
app.get('/logout', (req, res) => { res.setHeader('Set-Cookie', 'sid=; Max-Age=0; Path=/'); res.redirect('/'); });

app.get('/deploy', async (req, res) => {
  const user = await currentUser(req);
  const rows = plans.map(p => `<tr><td>$${p.price}</td><td>${p.label}</td><td>${p.shares}</td><td>+${p.bonus_pct}%</td><td>${p.discount_pct}%</td><td><a class='btn small' href='/pay/${p.price}'>Choose</a></td></tr>`).join('');
  res.send(page('Deploy', `<section class='panel'><h2>OpenClaw 1-Click Deploy</h2><p>Select a plan to simulate payment and instant provisioning orchestration.</p><table><tr><th>Price</th><th>Duration</th><th>Shares</th><th>Bonus</th><th>Discount</th><th></th></tr>${rows}</table></section>`, user));
});

app.get('/pay/:price', requireAuth, async (req, res) => {
  const p = plans.find(x => x.price === Number(req.params.price));
  if (!p) return res.status(404).send('Plan not found');
  res.send(page('Payment', `<section class='panel narrow'><h2>Demo Payment: $${p.price}</h2><p>${p.label} subscription</p><form method='post'><label>Card Number</label><input name='card' required/><label>Name on Card</label><input name='name' required/><label>CVV</label><input name='cvv' required/><button>Pay & Deploy</button></form><p class='muted'>This is a simulation. No real card data is processed.</p></section>`, req.user));
});

app.post('/pay/:price', requireAuth, async (req, res) => {
  try {
    const p = plans.find(x => x.price === Number(req.params.price));
    if (!p) return res.status(404).send('Plan not found');

    const buyer = await one(`users?id=eq.${req.user.id}&select=*`);
    const total_subscribed = Number(buyer.total_subscribed) + p.price;
    const share_balance = Number(buyer.share_balance) + calcShares(p);
    const baseDate = new Date(buyer.openclaw_ends_at) > new Date() ? buyer.openclaw_ends_at : nowISO();
    const openclaw_ends_at = addDaysISO(baseDate, p.duration_days);

    await sb(`users?id=eq.${buyer.id}`, { method: 'PATCH', body: { total_subscribed, share_balance, openclaw_ends_at } });
    await sb('subscriptions', { method: 'POST', body: [{ user_id: buyer.id, price: p.price, duration_days: p.duration_days, shares_granted: calcShares(p), status: 'provisioning', provision_at: next5s(), instance_ip: null, telegram_id: null, created_at: nowISO() }] });

    if (buyer.referred_by) {
      const direct = await one(`users?referral_code=eq.${encodeURIComponent(buyer.referred_by)}&select=*`);
      if (direct) await creditReward(direct, buyer.id, p.price * 0.5, 'direct', '50% direct referral reward');
    }

    const chain = (await uplineChain(buyer)).filter(eligible);
    const totalShares = chain.reduce((sum, u) => sum + Number(u.share_balance), 0);
    if (totalShares > 0) {
      for (const upline of chain) {
        const portion = (p.price * 0.2) * (Number(upline.share_balance) / totalShares);
        await creditReward(upline, buyer.id, portion, 'group', '20% group upline pool');
      }
    }
    res.redirect('/dashboard');
  } catch (e) { res.status(500).send(e.message); }
});

app.get('/staffing', async (req, res) => {
  const user = await currentUser(req);
  const roles = await sb('roles?select=*&order=popular.desc,name.asc');
  const cards = roles.map(r => `<article class='card role'><h3>${r.name}${r.popular ? `<span class='tag'>Most Popular</span>` : ''}</h3><p>${r.capabilities}</p><p class='price'>${Number(r.monthly_price) === 0 ? 'Free' : `$${r.monthly_price}/mo`}</p><a class='btn small' href='/staffing/${r.id}'>Hire now</a></article>`).join('');
  res.send(page('Staffing', `<section class='panel'><h2>AI Agent Staffing</h2><p>Deploy specialized digital workers with standardized onboarding instructions.</p><div class='grid'>${cards}</div></section>`, user));
});

app.get('/staffing/:id', async (req, res) => {
  const user = await currentUser(req);
  const role = await one(`roles?id=eq.${req.params.id}&select=*`);
  if (!role) return res.status(404).send('Role not found');
  res.send(page(role.name, `<section class='panel'><h2>${role.name}</h2><p>${role.capabilities}</p><div class='two-col'><div><h3>Setup checklist</h3><ol><li>Create your Telegram access channel.</li><li>Upload SOP + KPIs in dashboard notes.</li><li>Assign data sources and response guardrails.</li><li>Activate QA review mode for the first 72 hours.</li></ol></div><div class='info'><h3>Commercial terms</h3><p>Monthly Price: <b>${Number(role.monthly_price) === 0 ? 'Free' : '$' + role.monthly_price}</b></p><p>Billing: Demo-only for this environment.</p></div></div></section>`, user));
});

app.get('/referrals', async (req, res) => {
  const user = await currentUser(req);
  res.send(page('Referral Model', `<section class='panel'><h2>Referral & Group Reward System</h2><div class='two-col'><div><h3>Payout structure</h3><ul><li>Direct upline receives <b>50%</b> on every subscription payment and renewal.</li><li>An additional <b>20%</b> enters the group pool.</li><li>Pool is split across all uplines to root by share weighting.</li><li>Formula: <code>reward = group_pool × (member_shares / total_upline_shares)</code>.</li></ul></div><div class='info'><h3>Eligibility model</h3><ul><li>User can earn until cumulative rewards hit <b>2× total subscription spend</b>.</li><li>When capped, rewards pause until any new plan is purchased.</li><li>If service duration ends before 2× cap, earning remains active.</li><li>Plan bonus % increases shares granted.</li></ul></div></div><h3>Example</h3><p>A → B → C, with A=500 shares and B=100 shares.</p><p>A gets <b>20% × (500/600)</b>, B gets <b>20% × (100/600)</b>.</p></section>`, user));
});

app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const user = await one(`users?id=eq.${req.user.id}&select=*`);
    const provisioning = await sb(`subscriptions?user_id=eq.${user.id}&status=eq.provisioning&select=*`);
    for (const sub of provisioning) {
      if (new Date(sub.provision_at) <= new Date()) {
        await sb(`subscriptions?id=eq.${sub.id}`, { method: 'PATCH', body: { status: 'provisioned', instance_ip: randomIP() } });
      }
    }

    const subs = await sb(`subscriptions?user_id=eq.${user.id}&select=*&order=created_at.desc`);
    const rewards = await sb(`rewards?user_id=eq.${user.id}&select=*&order=created_at.desc&limit=12`);
    const subRows = subs.map(s => `<tr><td>$${s.price}</td><td>${s.status}</td><td>${s.instance_ip || '-'}</td><td>${s.telegram_id || `<form method='post' action='/subscription/${s.id}/telegram' class='inline'><input name='telegram_id' placeholder='Telegram ID' required/><button class='small'>Save</button></form>`}</td></tr>`).join('');
    const rewardRows = rewards.map(r => `<li>${new Date(r.created_at).toLocaleString()} — ${r.type.toUpperCase()} $${money(r.amount)} (${r.note})</li>`).join('');

    res.send(page('Dashboard', `<section class='panel'><h2>Member Dashboard</h2><div class='stats'><div><span>Total Subscribed</span><strong>$${money(user.total_subscribed)}</strong></div><div><span>Total Earned</span><strong>$${money(user.total_earned)}</strong></div><div><span>Wallet (USDT)</span><strong>${money(user.wallet_usdt)}</strong></div><div><span>Shares</span><strong>${user.share_balance}</strong></div></div><p>Eligibility: <b>${eligible(user) ? 'Eligible' : 'Capped (purchase new plan to reactivate)'}</b></p><p>Referral Link: <code>http://localhost:3000/register?ref=${user.referral_code}</code></p></section><section class='panel'><h3>OpenClaw Instances</h3><table><tr><th>Plan</th><th>Status</th><th>Instance IP</th><th>Telegram</th></tr>${subRows || '<tr><td colspan="4">No subscriptions yet.</td></tr>'}</table></section><section class='panel'><h3>Recent Rewards</h3><ul>${rewardRows || '<li>No rewards yet.</li>'}</ul></section><section class='panel narrow'><h3>Withdraw (Demo BSC USDT)</h3><form method='post' action='/withdraw'><label>Wallet Address</label><input name='address' required/><label>Amount</label><input name='amount' type='number' step='0.01' required/><button>Submit Request</button></form></section>`, user));
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/subscription/:id/telegram', requireAuth, async (req, res) => {
  await sb(`subscriptions?id=eq.${req.params.id}&user_id=eq.${req.user.id}`, { method: 'PATCH', body: { telegram_id: req.body.telegram_id } });
  res.redirect('/dashboard');
});

app.post('/withdraw', requireAuth, async (req, res) => {
  try {
    const user = await one(`users?id=eq.${req.user.id}&select=*`);
    const amount = Number(req.body.amount || 0);
    if (amount <= 0 || amount > Number(user.wallet_usdt)) return res.send(page('Withdraw', `<section class='panel'><h2>Invalid withdrawal amount.</h2><a class='btn' href='/dashboard'>Back</a></section>`, user));
    await sb(`users?id=eq.${user.id}`, { method: 'PATCH', body: { wallet_usdt: Number(user.wallet_usdt) - amount } });
    await sb('withdrawals', { method: 'POST', body: [{ user_id: user.id, address: req.body.address, amount, network: 'BSC USDT', status: 'pending', created_at: nowISO() }] });
    res.redirect('/dashboard');
  } catch (e) { res.status(500).send(e.message); }
});

app.get('/admin', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).send('Admin only');
  const [users, roles, subs, rewards] = await Promise.all([
    sb('users?select=id'), sb('roles?select=*'), sb('subscriptions?select=id'), sb('rewards?select=id')
  ]);
  const roleRows = roles.map(r => `<tr><td>${r.name}</td><td>${r.monthly_price}</td><td>${r.popular ? 'Yes' : 'No'}</td><td><form method='post' action='/admin/roles/${r.id}/delete'><button class='small danger'>Delete</button></form></td></tr>`).join('');
  res.send(page('Admin', `<section class='panel'><h2>Admin Control Center</h2><div class='stats'><div><span>Users</span><strong>${users.length}</strong></div><div><span>Subscriptions</span><strong>${subs.length}</strong></div><div><span>Rewards</span><strong>${rewards.length}</strong></div><div><span>Roles</span><strong>${roles.length}</strong></div></div></section><section class='panel'><h3>Add Staffing Role (CMS)</h3><form method='post' action='/admin/roles'><label>Name</label><input name='name' required/><label>Monthly Price</label><input name='monthly_price' type='number'/><label>Capabilities</label><input name='capabilities' required/><label><input type='checkbox' name='popular'/> Mark as popular</label><button>Add role</button></form></section><section class='panel'><h3>Role Catalog</h3><table><tr><th>Name</th><th>Price</th><th>Popular</th><th></th></tr>${roleRows}</table></section>`, req.user));
});

app.post('/admin/roles', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).send('Admin only');
  await sb('roles', { method: 'POST', body: [{ name: req.body.name, monthly_price: Number(req.body.monthly_price || 0), capabilities: req.body.capabilities, popular: req.body.popular === 'on' }] });
  res.redirect('/admin');
});

app.post('/admin/roles/:id/delete', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).send('Admin only');
  await sb(`roles?id=eq.${req.params.id}`, { method: 'DELETE', prefer: 'return=minimal' });
  res.redirect('/admin');
});

const port = process.env.PORT || 3000;
ensureSeedData().then(() => {
  app.listen(port, () => console.log(`AIMS app running on http://localhost:${port}`));
}).catch((e) => {
  console.error('Boot failed:', e.message);
  process.exit(1);
});
