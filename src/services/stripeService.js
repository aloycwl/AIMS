import Stripe from 'stripe';

export class StripeService {
  constructor(secretKey) {
    this._secretKey = secretKey;
    this._stripe = null;
  }

  async createCheckoutSession(plan, userId, successUrl, cancelUrl, currency = 'usd') {
    const isSgd = currency.toLowerCase() === 'sgd';
    const amount = isSgd ? Math.round(plan.price * 1.27 * 100) : Math.round(plan.price * 100);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: isSgd ? ['card', 'paynow'] : ['card', 'wechat_pay', 'alipay'],
      payment_method_options: isSgd ? {} : {
        wechat_pay: {
          client: 'web',
        },
      },
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `${plan.label} Subscription`,
              description: `AIMS ${plan.label} plan for ${plan.duration_days} days.`,
            },
            unit_amount: amount, // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        planId: plan.id.toString(),
        planPrice: plan.price.toString(),
        currency: currency.toLowerCase(),
      },
    });

    return session;
  }

  async retrieveSession(sessionId) {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }
}
