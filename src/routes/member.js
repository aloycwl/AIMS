import { page } from '../lib/render.js';
import { addDaysISO, calcShares, eligible, money, next5s, nowISO, randomIP } from '../lib/utils.js';

async function uplineChain(one, user) {
  const chain = [];
  let current = user;

  while (current.referred_by) {
    const up = await one(`users?referral_code=eq.${encodeURIComponent(current.referred_by)}&select=*`);
    if (!up) break;
    chain.push(up);
    current = up;
  }

  return chain;
}

async function creditReward(sb, user, fromUserId, amount, type, note) {
  if (!user || amount <= 0 || !eligible(user)) return;

  const capLeft = (Number(user.total_subscribed) * 2) - Number(user.total_earned);
  const finalAmount = Math.max(0, Math.min(amount, capLeft));
  if (!finalAmount) return;

  await sb(`users?id=eq.${user.id}`, {
    method: 'PATCH',
    body: {
      total_earned: Number(user.total_earned) + finalAmount,
      wallet_usdt: Number(user.wallet_usdt) + finalAmount
    }
  });

  await sb('rewards', {
    method: 'POST',
    body: [{ user_id: user.id, from_user_id: fromUserId, amount: finalAmount, type, note, created_at: nowISO() }]
  });
}

export function registerMemberRoutes(app, ctx) {
  const { one, sb, requireAuth } = ctx;

  app.get('/pay/:price', requireAuth, async (req, res) => {
    const plan = await one(`plans?price=eq.${Number(req.params.price)}&select=*`);
    if (!plan) return res.status(404).send('Plan not found');

    res.send(page('Payment', `<section class='panel narrow'><h2>Demo Payment: $${plan.price}</h2><p>${plan.label} subscription</p><form method='post'><label>Card Number</label><input name='card' required/><label>Name on Card</label><input name='name' required/><label>CVV</label><input name='cvv' required/><button>Pay & Deploy</button></form><p class='muted'>This is a simulation. No real card data is processed.</p></section>`, req.user));
  });

  app.post('/pay/:price', requireAuth, async (req, res) => {
    try {
      const plan = await one(`plans?price=eq.${Number(req.params.price)}&select=*`);
      if (!plan) return res.status(404).send('Plan not found');

      const buyer = await one(`users?id=eq.${req.user.id}&select=*`);
      const totalSubscribed = Number(buyer.total_subscribed) + Number(plan.price);
      const shareBalance = Number(buyer.share_balance) + calcShares(plan);
      const baseDate = new Date(buyer.openclaw_ends_at) > new Date() ? buyer.openclaw_ends_at : nowISO();
      const openclawEndsAt = addDaysISO(baseDate, plan.duration_days);

      await sb(`users?id=eq.${buyer.id}`, { method: 'PATCH', body: { total_subscribed: totalSubscribed, share_balance: shareBalance, openclaw_ends_at: openclawEndsAt } });
      await sb('subscriptions', {
        method: 'POST',
        body: [{ user_id: buyer.id, plan_id: plan.id, price: plan.price, duration_days: plan.duration_days, shares_granted: calcShares(plan), status: 'provisioning', provision_at: next5s(), instance_ip: null, telegram_id: null, created_at: nowISO() }]
      });

      if (buyer.referred_by) {
        const direct = await one(`users?referral_code=eq.${encodeURIComponent(buyer.referred_by)}&select=*`);
        if (direct) await creditReward(sb, direct, buyer.id, Number(plan.price) * 0.5, 'direct', '50% direct referral reward');
      }

      const chain = (await uplineChain(one, buyer)).filter(eligible);
      const totalShares = chain.reduce((sum, u) => sum + Number(u.share_balance), 0);
      if (totalShares > 0) {
        for (const upline of chain) {
          const portion = (Number(plan.price) * 0.2) * (Number(upline.share_balance) / totalShares);
          await creditReward(sb, upline, buyer.id, portion, 'group', '20% group upline pool');
        }
      }

      res.redirect('/dashboard');
    } catch (e) {
      res.status(500).send(e.message);
    }
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

      const subs = await sb(`subscriptions?user_id=eq.${user.id}&select=*,plans(label)&order=created_at.desc`);
      const rewards = await sb(`rewards?user_id=eq.${user.id}&select=*&order=created_at.desc&limit=12`);
      const subRows = subs.map((s) => `<tr><td>${s.plans?.label || '$' + s.price}</td><td>${s.status}</td><td>${s.instance_ip || '-'}</td><td>${s.telegram_id || `<form method='post' action='/subscription/${s.id}/telegram' class='inline'><input name='telegram_id' placeholder='Telegram ID' required/><button class='small'>Save</button></form>`}</td></tr>`).join('');
      const rewardRows = rewards.map((r) => `<li>${new Date(r.created_at).toLocaleString()} — ${r.type.toUpperCase()} $${money(r.amount)} (${r.note})</li>`).join('');
      const port = process.env.PORT || 3131;

      res.send(page('Dashboard', `<section class='panel'><h2>Member Dashboard</h2><div class='stats'><div><span>Total Subscribed</span><strong>$${money(user.total_subscribed)}</strong></div><div><span>Total Earned</span><strong>$${money(user.total_earned)}</strong></div><div><span>Wallet (USDT)</span><strong>${money(user.wallet_usdt)}</strong></div><div><span>Shares</span><strong>${user.share_balance}</strong></div></div><p>Eligibility: <b>${eligible(user) ? 'Eligible' : 'Capped (purchase new plan to reactivate)'}</b></p><p>Referral Link: <code>http://localhost:${port}/register?ref=${user.referral_code}</code></p></section><section class='panel'><h3>OpenClaw Instances</h3><table><tr><th>Plan</th><th>Status</th><th>Instance IP</th><th>Telegram</th></tr>${subRows || '<tr><td colspan="4">No subscriptions yet.</td></tr>'}</table></section><section class='panel'><h3>Recent Rewards</h3><ul>${rewardRows || '<li>No rewards yet.</li>'}</ul></section><section class='panel narrow'><h3>Withdraw (Demo BSC USDT)</h3><form method='post' action='/withdraw'><label>Wallet Address</label><input name='address' required/><label>Amount</label><input name='amount' type='number' step='0.01' required/><button>Submit Request</button></form></section>`, user));
    } catch (e) {
      res.status(500).send(e.message);
    }
  });

  app.post('/subscription/:id/telegram', requireAuth, async (req, res) => {
    await sb(`subscriptions?id=eq.${req.params.id}&user_id=eq.${req.user.id}`, { method: 'PATCH', body: { telegram_id: req.body.telegram_id } });
    res.redirect('/dashboard');
  });

  app.post('/withdraw', requireAuth, async (req, res) => {
    try {
      const user = await one(`users?id=eq.${req.user.id}&select=*`);
      const amount = Number(req.body.amount || 0);
      if (amount <= 0 || amount > Number(user.wallet_usdt)) {
        return res.send(page('Withdraw', `<section class='panel'><h2>Invalid withdrawal amount.</h2><a class='btn' href='/dashboard'>Back</a></section>`, user));
      }

      await sb(`users?id=eq.${user.id}`, { method: 'PATCH', body: { wallet_usdt: Number(user.wallet_usdt) - amount } });
      await sb('withdrawals', { method: 'POST', body: [{ user_id: user.id, address: req.body.address, amount, network: 'BSC USDT', status: 'pending', created_at: nowISO() }] });
      res.redirect('/dashboard');
    } catch (e) {
      res.status(500).send(e.message);
    }
  });
}
