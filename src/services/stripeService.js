import Stripe from 'stripe';

export class StripeService {
  constructor(secretKey) {
    this.stripe = new Stripe(secretKey);
  }

  async createCheckoutSession(plan, userId, successUrl, cancelUrl) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paynow', 'wechat_pay', 'alipay'],
      payment_method_options: {
        wechat_pay: {
          client: 'web',
        },
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.label} Subscription`,
              description: `AIMS ${plan.label} plan for ${plan.duration_days} days.`,
            },
            unit_amount: Math.round(plan.price * 100), // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        planPrice: plan.price.toString(),
      },
    });

    return session;
  }

  async retrieveSession(sessionId) {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }
}
