import { nowISO } from '../lib/utils.js';

export class UserService {
  constructor(sb, one) {
    this.sb = sb;
    this.one = one;
  }

  async getUserById(userId) {
    return this.one(`users?id=eq.${encodeURIComponent(userId)}&select=*`);
  }

  async withdraw(userId, address, amount) {
    const user = await this.getUserById(userId);
    if (amount <= 0 || amount > Number(user.wallet_usdt)) {
      throw new Error('Invalid withdrawal amount.');
    }

    await this.sb(`users?id=eq.${user.id}`, {
      method: 'PATCH',
      body: { wallet_usdt: Number(user.wallet_usdt) - amount }
    });

    await this.sb('withdrawals', {
      method: 'POST',
      body: [{
        user_id: user.id,
        address,
        amount,
        network: 'BSC USDT',
        status: 'pending',
        created_at: nowISO()
      }]
    });
  }
}
