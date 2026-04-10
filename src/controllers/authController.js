import { page } from '../lib/render.js';
import { nowISO } from '../lib/utils.js';

export class AuthController {
  constructor(sb, one, login, logout) {
    this.sb = sb;
    this.one = one;
    this.login = login;
    this.logout = logout;
  }

  async getRegister(req, res) {
    res.send(page('Register', `<section class='panel'><h2>Create Account</h2><p>Use any email for test onboarding; verification is intentionally disabled.</p><form method='post'><label>Email</label><input name='email' required/><label>Password</label><input type='password' name='password' required/><label>Referral Code (optional)</label><input name='ref' value='${req.query.ref || ''}'/><button>Create account</button></form></section>`));
  }

  async postRegister(req, res) {
    try {
      const { email, password, ref } = req.body;
      const exists = await this.one(`users?email=eq.${encodeURIComponent(email)}&select=id`);
      if (exists) return res.send(page('Register', `<section class='panel'><h2>Email already exists</h2><a class='btn' href='/register'>Try another</a></section>`));

      const referralCode = `${email.split('@')[0].slice(0, 6).toUpperCase()}${Math.floor(Math.random() * 9999)}`;
      await this.sb('users', {
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
  }

  async getLogin(req, res) {
    res.send(page('Login', `<section class='panel narrow'><h2>Sign in</h2><form method='post'><label>Email</label><input name='email' required/><label>Password</label><input type='password' name='password' required/><button>Login</button></form></section>`));
  }

  async postLogin(req, res) {
    try {
      const user = await this.one(`users?email=eq.${encodeURIComponent(req.body.email)}&password=eq.${encodeURIComponent(req.body.password)}&select=*`);
      if (!user) return res.send(page('Login', `<section class='panel'><h2>Invalid credentials</h2><a class='btn' href='/login'>Try again</a></section>`));

      this.login(res, user);
      res.redirect('/dashboard');
    } catch (e) {
      res.status(500).send(e.message);
    }
  }

  getLogout(req, res) {
    this.logout(res);
    res.redirect('/');
  }

  async getProfile(req, res) {
    const user = await this.one(`users?id=eq.${req.user.id}&select=*`);
    res.send(page('Profile', `<section class='panel narrow'><h2>Profile</h2><p><b>Email:</b> ${user.email}</p><p><b>Referral code:</b> ${user.referral_code}</p><p><b>Joined:</b> ${new Date(user.created_at).toLocaleDateString()}</p></section><section class='panel narrow' id='change-password'><h3>Change Password</h3><form method='post' action='/profile/password'><label>Current Password</label><input type='password' name='current_password' required/><label>New Password</label><input type='password' name='new_password' minlength='8' required/><label>Confirm New Password</label><input type='password' name='confirm_password' minlength='8' required/><button>Update Password</button></form></section>`, user));
  }

  async postProfilePassword(req, res) {
    const user = await this.one(`users?id=eq.${req.user.id}&select=*`);
    const { current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.send(page('Change Password', `<section class='panel narrow'><h2>Missing fields</h2><a class='btn' href='/profile#change-password'>Back</a></section>`, user));
    }
    if (user.password !== currentPassword) {
      return res.send(page('Change Password', `<section class='panel narrow'><h2>Current password is incorrect</h2><a class='btn' href='/profile#change-password'>Try again</a></section>`, user));
    }
    if (newPassword.length < 8) {
      return res.send(page('Change Password', `<section class='panel narrow'><h2>New password must be at least 8 characters</h2><a class='btn' href='/profile#change-password'>Try again</a></section>`, user));
    }
    if (newPassword !== confirmPassword) {
      return res.send(page('Change Password', `<section class='panel narrow'><h2>New password confirmation does not match</h2><a class='btn' href='/profile#change-password'>Try again</a></section>`, user));
    }
    await this.sb(`users?id=eq.${user.id}`, { method: 'PATCH', body: { password: newPassword } });
    res.send(page('Change Password', `<section class='panel narrow'><h2>Password updated successfully</h2><a class='btn' href='/profile'>Back to profile</a></section>`, user));
  }
}
