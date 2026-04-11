import { page } from '../lib/render.js';
import { nowISO } from '../lib/utils.js';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import nodemailer from 'nodemailer';


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI || '/auth/google/callback');


export class AuthController {
  constructor(sb, one, login, logout) {
    this.sb = sb;
    this.one = one;
    this.login = login;
    this.logout = logout;
  }

  async getRegister(req, res) {
    res.send(page('Register', `<section class='panel narrow'><h2>Create Account</h2><p class='muted'>Use any email for test onboarding; verification is intentionally disabled.</p><form method='post'><label for='email'>Email</label><input id='email' name='email' type='email' placeholder='alex@example.com' required/><label for='password'>Password</label><input id='password' type='password' name='password' placeholder='••••••••' required/><label for='ref'>Referral Code (optional)</label><input id='ref' name='ref' value='${req.query.ref || ''}' placeholder='OPTIONAL'/><button>Create account</button>
<div style="text-align: center; margin: 20px 0;">
  <div style="border-bottom: 1px solid var(--line); margin-bottom: -10px;"><span style="background: var(--panel); padding: 0 10px; color: var(--muted); font-size: 13px;">OR</span></div>
</div>
<a class="btn ghost" href="/auth/google" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 10px;">
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
  Sign in with Google
</a>

<div style="text-align: center; margin: 20px 0;">
  <div style="border-bottom: 1px solid var(--line); margin-bottom: -10px;"><span style="background: var(--panel); padding: 0 10px; color: var(--muted); font-size: 13px;">OR</span></div>
</div>
<a class="btn ghost" href="/auth/google" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 10px;">
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
  Sign in with Google
</a>
</form><p style='margin-top:20px;text-align:center' class='muted'>Already have an account? <a href='/login'>Sign in</a></p></section>`, null, req.path));
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


  async getForgotPassword(req, res) {
    res.send(page('Forgot Password', `<section class='panel narrow'><h2>Reset Password</h2><p class='muted'>Enter your email and we'll send you a link to reset your password.</p><form method='post'><label for='email'>Email</label><input id='email' name='email' type='email' placeholder='alex@example.com' required/><button>Send Reset Link</button></form><p style='margin-top:20px;text-align:center' class='muted'><a href='/login'>Back to Login</a></p></section>`, null, req.path));
  }

  async postForgotPassword(req, res) {
    try {
      const email = req.body.email;
      const user = await this.one(`users?email=eq.${encodeURIComponent(email)}&select=*`);

      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

        await this.sb(`users?id=eq.${user.id}`, {
          method: 'PATCH',
          body: {
            reset_token: resetToken,
            reset_token_expires: resetTokenExpires
          }
        });

        // Send Email
        const transporter = nodemailer.createTransport({
          host: "localhost",
          port: 25,
          secure: false,
          tls: { rejectUnauthorized: false }
        });

        const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;

        try {
          await transporter.sendMail({
            from: '"AIMS" <no-reply@aims.test>',
            to: email,
            subject: 'Password Reset',
            text: `Click the following link to reset your password: ${resetLink}`,
            html: `<p>Click the following link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`
          });
        } catch (mailErr) {
          console.error("Mail sending failed, likely no local SMTP server. Token is:", resetToken);
        }
      }

      res.send(page('Forgot Password', `<section class='panel narrow'><h2>Check your email</h2><p>If an account with that email exists, we have sent a password reset link.</p><a class='btn' href='/login'>Return to Login</a></section>`, null, req.path));
    } catch (e) {
      res.status(500).send(e.message);
    }
  }

  async getResetPassword(req, res) {
    const token = req.query.token;
    if (!token) return res.redirect('/login');

    res.send(page('Reset Password', `<section class='panel narrow'><h2>Set New Password</h2><form method='post'><input type='hidden' name='token' value='${token}'/><label for='password'>New Password</label><input id='password' type='password' name='password' placeholder='••••••••' minlength='8' required/><button>Reset Password</button></form></section>`, null, req.path));
  }

  async postResetPassword(req, res) {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.redirect('/login');

      // Due to the nature of PostgREST, finding by token and checking expiry in one step might be tricky with standard operators without complex queries.
      // Fetching by token first, then checking JS-side is simpler.
      const users = await this.sb(`users?reset_token=eq.${encodeURIComponent(token)}&select=*`);
      const user = users[0];

      if (!user || new Date(user.reset_token_expires) < new Date()) {
        return res.send(page('Reset Password', `<section class='panel narrow'><h2>Invalid or expired token</h2><p>Please request a new password reset link.</p><a class='btn' href='/forgot-password'>Try again</a></section>`, null, req.path));
      }

      await this.sb(`users?id=eq.${user.id}`, {
        method: 'PATCH',
        body: {
          password: password,
          reset_token: null,
          reset_token_expires: null
        }
      });

      res.send(page('Reset Password', `<section class='panel narrow'><h2>Password Reset Successful</h2><p>You can now log in with your new password.</p><a class='btn' href='/login'>Go to Login</a></section>`, null, req.path));
    } catch (e) {
      res.status(500).send(e.message);
    }
  }

  async getLogin(req, res) {
    res.send(page('Login', `<section class='panel narrow'><h2>Sign in</h2><form method='post'><label for='email'>Email</label><input id='email' name='email' type='email' placeholder='alex@example.com' required/><label for='password'>Password</label><input id='password' type='password' name='password' placeholder='••••••••' required/><button>Login</button>
<div style="text-align: center; margin: 20px 0;">
  <div style="border-bottom: 1px solid var(--line); margin-bottom: -10px;"><span style="background: var(--panel); padding: 0 10px; color: var(--muted); font-size: 13px;">OR</span></div>
</div>
<a class="btn ghost" href="/auth/google" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 10px;">
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
  Sign in with Google
</a>
<div style='text-align:center; margin-top:10px;'><a href='/forgot-password' style='font-size:13px; color:var(--muted);'>Forgot Password?</a></div></form><p style='margin-top:20px;text-align:center' class='muted'>Don't have an account? <a href='/register'>Register</a></p></section>`, null, req.path));
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


  async getGoogleAuth(req, res) {
    const protocol = req.protocol;
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/auth/google/callback`;
    const authorizeUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      redirect_uri: redirectUri
    });
    res.redirect(authorizeUrl);
  }

  async getGoogleAuthCallback(req, res) {
    try {
      const code = req.query.code;
      if (!code) throw new Error('No code provided');

      const protocol = req.protocol;
      const host = req.get('host');
      const redirectUri = `${protocol}://${host}/auth/google/callback`;

      const { tokens } = await googleClient.getToken({ code, redirect_uri: redirectUri });
      googleClient.setCredentials(tokens);

      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const email = payload.email;

      let user = await this.one(`users?email=eq.${encodeURIComponent(email)}&select=*`);

      if (!user) {
        // Create new user
        const referralCode = `${email.split('@')[0].slice(0, 6).toUpperCase()}${Math.floor(Math.random() * 9999)}`;
        const password = crypto.randomBytes(16).toString('hex'); // Random password

        await this.sb('users', {
          method: 'POST',
          body: [{
            email,
            password,
            referral_code: referralCode,
            referred_by: req.query.state || null, // Optional if we pass ref via state
            is_admin: false,
            total_subscribed: 0,
            total_earned: 0,
            share_balance: 0,
            wallet_usdt: 0,
            openclaw_ends_at: nowISO()
          }]
        });

        user = await this.one(`users?email=eq.${encodeURIComponent(email)}&select=*`);
      }

      this.login(res, user);
      res.redirect('/dashboard');
    } catch (e) {
      console.error('Google Auth Error:', e);
      res.send(page('Login Failed', `<section class='panel narrow'><h2>Authentication failed</h2><p>${e.message}</p><a class='btn' href='/login'>Try again</a></section>`, null, req.path));
    }
  }

  getLogout(req, res) {
    this.logout(res);
    res.redirect('/');
  }

  async getProfile(req, res) {
    const user = await this.one(`users?id=eq.${req.user.id}&select=*`);
    res.send(page('Profile', `<section class='panel narrow'><h2>Profile</h2><p><b>Email:</b> ${user.email}</p><p><b>Referral code:</b> ${user.referral_code}</p><p><b>Joined:</b> ${new Date(user.created_at).toLocaleDateString()}</p></section><section class='panel narrow' id='change-password'><h3>Change Password</h3><form method='post' action='/profile/password'><label for='current_password'>Current Password</label><input id='current_password' type='password' name='current_password' required/><label for='new_password'>New Password</label><input id='new_password' type='password' name='new_password' minlength='8' required/><label for='confirm_password'>Confirm New Password</label><input id='confirm_password' type='password' name='confirm_password' minlength='8' required/><button>Update Password</button></form></section>`, user, req.path));
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
