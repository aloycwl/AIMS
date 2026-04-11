import { page } from '../lib/render.js';
import { money, eligible } from '../lib/utils.js';

export class MemberController {
  constructor(subscriptionService, userService, stripeService) {
    this.subscriptionService = subscriptionService;
    this.userService = userService;
    this.stripeService = stripeService;
  }

  async getPay(req, res) {
    const plan = await this.subscriptionService.getPlanByPrice(req.params.price);
    if (!plan) return res.status(404).send('Plan not found');

    const currency = req.query.currency || 'usd';

    // Instead of showing a form, we now redirect to Stripe Checkout
    try {
      const protocol = req.protocol;
      const host = req.get('host');
      const successUrl = `${protocol}://${host}/payment-success`;
      const cancelUrl = `${protocol}://${host}/deploy`;

      const session = await this.stripeService.createCheckoutSession(
        plan,
        req.user.id,
        successUrl,
        cancelUrl,
        currency
      );

      res.redirect(303, session.url);
    } catch (e) {
      console.error('Stripe Session Error:', e);
      res.status(500).send('Error initiating payment: ' + e.message);
    }
  }

  async paymentSuccess(req, res) {
    const { session_id } = req.query;
    if (!session_id) return res.redirect('/dashboard');

    try {
      const session = await this.stripeService.retrieveSession(session_id);
      if (session.payment_status === 'paid') {
        const userId = session.metadata.userId;
        const planId = session.metadata.planId;
        const planPrice = session.metadata.planPrice;

        let plan;
        if (planId) {
          plan = await this.subscriptionService.getPlanById(planId);
        } else {
          plan = await this.subscriptionService.getPlanByPrice(planPrice);
        }

        if (plan) {
          await this.subscriptionService.processSubscription(userId, plan);
        }
        res.redirect('/dashboard');
      } else {
        res.status(400).send('Payment not completed.');
      }
    } catch (e) {
      console.error('Payment Success Error:', e);
      res.status(500).send(e.message);
    }
  }

  async getDashboard(req, res) {
    try {
      const userId = req.user.id;
      await this.subscriptionService.updateSubscriptionStatuses(userId);

      const user = await this.userService.getUserById(userId);
      const subs = await this.subscriptionService.getSubscriptions(userId);
      const rewards = await this.subscriptionService.getRewards(userId);

      const subRows = subs.map((s) => `<tr><td data-label='Plan'>${s.plans?.label || '$' + s.price}</td><td data-label='Status'>${s.status}</td><td data-label='Instance IP'>${s.instance_ip || '-'}</td><td data-label='Expiry'>${s.expires_at ? new Date(s.expires_at).toLocaleString() : '-'}</td><td data-label='Telegram' class='action-cell'>${s.telegram_id || `<form method='post' action='/subscription/${s.id}/telegram' class='inline'><input name='telegram_id' placeholder='Telegram ID' required/><button class='small'>Save</button></form>`}</td></tr>`).join('');
      const rewardRows = rewards.map((r) => `<li>${new Date(r.created_at).toLocaleString()} — ${r.type.toUpperCase()} $${money(r.amount)} (${r.note})</li>`).join('');
      const port = process.env.PORT || 3131;

      res.send(page('Dashboard', `<section class='panel'><h2>Member Dashboard</h2><div class='stats'><div><span>Total Subscribed</span><strong>$${money(user.total_subscribed)}</strong></div><div><span>Total Earned</span><strong>$${money(user.total_earned)}</strong></div><div><span>Wallet (USDT)</span><strong>${money(user.wallet_usdt)}</strong></div><div><span>Shares</span><strong>${user.share_balance}</strong></div><div><span>Service Expires</span><strong>${user.openclaw_ends_at ? new Date(user.openclaw_ends_at).toLocaleDateString() : '-'}</strong></div></div><p style='margin-top:20px;text-align:center'>Eligibility: <b style='color:${eligible(user) ? 'var(--brand)' : 'var(--danger)'}'>${eligible(user) ? 'Eligible' : 'Capped (purchase new plan to reactivate)'}</b></p><div class='panel' style='margin-top:20px;text-align:center'><p class='muted' style='margin-bottom:8px'>Your Referral Link</p><code class="copy-box" onclick="copyLink(this)">${req.protocol}://${req.get('host')}/register?ref=${user.referral_code}</code></div></section><section class='panel'><h3>OpenClaw Instances</h3><table><thead><tr><th>Plan</th><th>Status</th><th>Instance IP</th><th>Expiry</th><th>Telegram</th></tr></thead><tbody>${subRows || '<tr><td colspan="5">No subscriptions yet.</td></tr>'}</tbody></table></section><section class='panel'><h3>Recent Rewards</h3><ul class='muted'>${rewardRows || '<li>No rewards yet.</li>'}</ul></section><section class='panel narrow'><h3>Withdraw (Demo BSC USDT)</h3><form method='post' action='/withdraw'><label for='address'>Wallet Address</label><input id='address' name='address' placeholder='0x...' required/><label for='amount'>Amount</label><input id='amount' name='amount' type='number' step='0.01' placeholder='0.00' required/><button>Submit Request</button></form></section>`, user, req.path));
    } catch (e) {
      res.status(500).send(e.message);
    }
  }

  async postTelegram(req, res) {
    await this.subscriptionService.updateTelegramId(req.params.id, req.user.id, req.body.telegram_id);
    res.redirect('/dashboard');
  }

  async postWithdraw(req, res) {
    try {
      await this.userService.withdraw(req.user.id, req.body.address, Number(req.body.amount || 0));
      res.redirect('/dashboard');
    } catch (e) {
      const user = await this.userService.getUserById(req.user.id);
      res.send(page('Withdraw Error', `<section class='panel'><h2>${e.message}</h2><a class='btn' href='/dashboard'>Back</a></section>`, user));
    }
  }
}
