import { SubscriptionService } from '../services/subscriptionService.js';
import { UserService } from '../services/userService.js';
import { StripeService } from '../services/stripeService.js';
import { MemberController } from '../controllers/memberController.js';

export function registerMemberRoutes(app, ctx) {
  const { sb, one, requireAuth } = ctx;

  const subscriptionService = new SubscriptionService(sb, one);
  const userService = new UserService(sb, one);
  const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY);

  const memberController = new MemberController(subscriptionService, userService, stripeService);

  app.get('/pay/:price', requireAuth, (req, res) => memberController.getPay(req, res));
  app.get('/payment-success', requireAuth, (req, res) => memberController.paymentSuccess(req, res));
  app.get('/dashboard', requireAuth, (req, res) => memberController.getDashboard(req, res));
  app.post('/subscription/:id/telegram', requireAuth, (req, res) => memberController.postTelegram(req, res));
  app.post('/withdraw', requireAuth, (req, res) => memberController.postWithdraw(req, res));
}
