import { test, describe } from 'node:test';
import assert from 'node:assert';
import { StripeService } from '../src/services/stripeService.js';
import Stripe from 'stripe';

describe('StripeService', () => {
  test('should throw an error when accessing stripe getter without a secret key', () => {
    const stripeService = new StripeService(null);
    assert.throws(() => {
      stripeService.stripe;
    }, {
      name: 'Error',
      message: 'STRIPE_SECRET_KEY is not configured.'
    });
  });

  test('should return a Stripe instance when a secret key is provided', () => {
    const stripeService = new StripeService('sk_test_mock_key');
    const stripeInstance = stripeService.stripe;
    assert.ok(stripeInstance instanceof Stripe);
  });
});
