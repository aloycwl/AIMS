import { page } from '../lib/render.js';
import { nowISO } from '../lib/utils.js';

export function registerAuthRoutes(app, ctx) {
  const { one, sb, login, logout } = ctx;

  app.get('/register', async (req, res) => {
    res.send(page('Register', `<section class='panel'><h2>Create Account</h2><p>Use any email for test onboarding; verification is intentionally disabled.</p><form method='post'><label>Email</label><input name='email' required/><label>Password</label><input type='password' name='password' required/><label>Referral Code (optional)</label><input name='ref' value='${req.query.ref || ''}'/><button>Create account</button></form></section>`));
  });

  app.post('/register', async (req, res) => {
    try {
      const { email, password, ref } = req.body;
      const exists = await one(`users?email=eq.${encodeURIComponent(email)}&select=id`);
      if (exists) return res.send(page('Register', `<section class='panel'><h2>Email already exists</h2><a class='btn' href='/register'>Try another</a></section>`));

      const referralCode = `${email.split('@')[0].slice(0, 6).toUpperCase()}${Math.floor(Math.random() * 9999)}`;
      await sb('users', {
        method: 'POST',
        body: [{
          email,
          password,
          referral_code: referralCode,
          referred_by: ref || null,
          is_admin: false,
          total_subscribed: 0,
          total_earned: 0,
          share_balance: 0,
          wallet_usdt: 0,
          openclaw_ends_at: nowISO()
        }]
      });
      res.redirect('/login');
    } catch (e) {
      res.status(500).send(e.message);
    }
  });

  app.get('/login', async (req, res) => {
    res.send(page('Login', `<section class='panel narrow'><h2>Sign in</h2><form method='post'><label>Email</label><input name='email' required/><label>Password</label><input type='password' name='password' required/><button>Login</button></form></section>`));
  });

  app.post('/login', async (req, res) => {
    try {
      const user = await one(`users?email=eq.${encodeURIComponent(req.body.email)}&password=eq.${encodeURIComponent(req.body.password)}&select=*`);
      if (!user) return res.send(page('Login', `<section class='panel'><h2>Invalid credentials</h2><a class='btn' href='/login'>Try again</a></section>`));

      login(res, user);
      res.redirect('/dashboard');
    } catch (e) {
      res.status(500).send(e.message);
    }
  });

  app.get('/logout', (req, res) => {
    logout(res);
    res.redirect('/');
  });
}
