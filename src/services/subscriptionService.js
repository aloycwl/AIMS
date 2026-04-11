import { addDaysISO, calcShares, eligible, next5s, nowISO, randomIP } from '../lib/utils.js';

export class SubscriptionService {
  constructor(sb, one) {
    this.sb = sb;
    this.one = one;
  }

  async getPlanByPrice(price) {
    return this.one(`plans?price=eq.${Number(price)}&select=*`);
  }

  async getPlanById(id) {
    return this.one(`plans?id=eq.${id}&select=*`);
  }

  async getUplineChain(user) {
    const chain = [];
    let current = user;

    while (current.referred_by) {
      const up = await this.one(`users?referral_code=eq.${encodeURIComponent(current.referred_by)}&select=*`);
      if (!up) break;
      chain.push(up);
      current = up;
    }

    return chain;
  }

  async creditReward(user, fromUserId, amount, type, note) {
    if (!user || amount <= 0 || !eligible(user)) return;

    const capLeft = (Number(user.total_subscribed) * 2) - Number(user.total_earned);
    const finalAmount = Math.max(0, Math.min(amount, capLeft));
    if (!finalAmount) return;

    await this.sb(`users?id=eq.${user.id}`, {
      method: 'PATCH',
      body: {
        total_earned: Number(user.total_earned) + finalAmount,
        wallet_usdt: Number(user.wallet_usdt) + finalAmount
      }
    });

    await this.sb('rewards', {
      method: 'POST',
      body: [{ user_id: user.id, from_user_id: fromUserId, amount: finalAmount, type, note, created_at: nowISO() }]
    });
  }

  async processSubscription(userId, plan) {
    const buyer = await this.one(`users?id=eq.${userId}&select=*`);
    const restartingAfterCap = !eligible(buyer);
    const grantedShares = calcShares(plan);
    const totalSubscribed = Number(buyer.total_subscribed) + Number(plan.price);
    const shareBalance = restartingAfterCap ? grantedShares : Number(buyer.share_balance) + grantedShares;
    const baseDate = new Date(buyer.openclaw_ends_at) > new Date() ? buyer.openclaw_ends_at : nowISO();
    const openclawEndsAt = addDaysISO(baseDate, plan.duration_days);

    await this.sb(`users?id=eq.${buyer.id}`, {
      method: 'PATCH',
      body: {
        total_subscribed: totalSubscribed,
        share_balance: shareBalance,
        openclaw_ends_at: openclawEndsAt
      }
    });

    const [activeSub] = await this.sb(`subscriptions?user_id=eq.${buyer.id}&status=in.(provisioning,provisioned)&order=created_at.desc&limit=1`);

    if (activeSub) {
      await this.sb(`subscriptions?id=eq.${activeSub.id}`, {
        method: 'PATCH',
        body: {
          plan_id: plan.id,
          price: Number(activeSub.price) + Number(plan.price),
          duration_days: Number(activeSub.duration_days) + Number(plan.duration_days),
          shares_granted: shareBalance,
          expires_at: openclawEndsAt
        }
      });
    } else {
      await this.sb('subscriptions', {
        method: 'POST',
        body: [{
          user_id: buyer.id,
          plan_id: plan.id,
          price: plan.price,
          duration_days: plan.duration_days,
          shares_granted: grantedShares,
          status: 'provisioning',
          provision_at: next5s(),
          expires_at: openclawEndsAt,
          instance_ip: null,
          telegram_id: null,
          created_at: nowISO()
        }]
      });
    }

    // Process Rewards
    if (buyer.referred_by) {
      const direct = await this.one(`users?referral_code=eq.${encodeURIComponent(buyer.referred_by)}&select=*`);
      if (direct) {
        await this.creditReward(direct, buyer.id, Number(plan.price) * 0.5, 'direct', '50% direct referral reward');
      }
    }

    const chain = (await this.getUplineChain(buyer)).filter(eligible);
    const totalShares = chain.reduce((sum, u) => sum + Number(u.share_balance), 0);
    if (totalShares > 0) {
      for (const upline of chain) {
        const portion = (Number(plan.price) * 0.2) * (Number(upline.share_balance) / totalShares);
        await this.creditReward(upline, buyer.id, portion, 'group', '20% group upline pool');
      }
    }
  }

  async updateSubscriptionStatuses(userId) {
    const provisioning = await this.sb(`subscriptions?user_id=eq.${userId}&status=eq.provisioning&select=*`);
    const provisioningPromises = provisioning
      .filter((sub) => new Date(sub.provision_at) <= new Date())
      .map((sub) => this.sb(`subscriptions?id=eq.${sub.id}`, { method: 'PATCH', body: { status: 'provisioned', instance_ip: randomIP() } }));

    const provisioned = await this.sb(`subscriptions?user_id=eq.${userId}&status=eq.provisioned&select=*`);
    const expiredPromises = provisioned
      .filter((sub) => sub.expires_at && new Date(sub.expires_at) <= new Date())
      .map((sub) => this.sb(`subscriptions?id=eq.${sub.id}`, { method: 'PATCH', body: { status: 'expired' } }));

    await Promise.all([...provisioningPromises, ...expiredPromises]);
  }

  async getSubscriptions(userId) {
    return this.sb(`subscriptions?user_id=eq.${userId}&select=*,plans(label)&order=created_at.desc`);
  }

  async getRewards(userId, limit = 12) {
    return this.sb(`rewards?user_id=eq.${userId}&select=*&order=created_at.desc&limit=${limit}`);
  }

  async updateTelegramId(subscriptionId, userId, telegramId) {
    return this.sb(`subscriptions?id=eq.${subscriptionId}&user_id=eq.${userId}`, {
      method: 'PATCH',
      body: { telegram_id: telegramId }
    });
  }
}
