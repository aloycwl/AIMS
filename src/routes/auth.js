import { AuthController } from '../controllers/authController.js';

export function registerAuthRoutes(app, ctx) {
  const { one, sb, login, logout, requireAuth } = ctx;
  const authController = new AuthController(sb, one, login, logout);

  app.get('/register', (req, res) => authController.getRegister(req, res));
  app.post('/register', (req, res) => authController.postRegister(req, res));

  app.get('/forgot-password', (req, res) => authController.getForgotPassword(req, res));
  app.post('/forgot-password', (req, res) => authController.postForgotPassword(req, res));
  app.get('/reset-password', (req, res) => authController.getResetPassword(req, res));
  app.post('/reset-password', (req, res) => authController.postResetPassword(req, res));
  app.get('/login', (req, res) => authController.getLogin(req, res));
  app.post('/login', (req, res) => authController.postLogin(req, res));

  app.get('/auth/google', (req, res) => authController.getGoogleAuth(req, res));
  app.get('/auth/google/callback', (req, res) => authController.getGoogleAuthCallback(req, res));
  app.get('/logout', (req, res) => authController.getLogout(req, res));
  app.get('/profile', requireAuth, (req, res) => authController.getProfile(req, res));
  app.post('/profile/password', requireAuth, (req, res) => authController.postProfilePassword(req, res));
}
