import { uuid } from './utils.js';

export function createAuth({ one }) {
  const sessions = new Map();

  async function currentUser(req) {
    const sid = req.headers.cookie
      ?.split(';')
      .map((s) => s.trim())
      .find((x) => x.startsWith('sid='))
      ?.split('=')[1];

    if (!sid || !sessions.has(sid)) {
      return null;
    }

    return one(`users?id=eq.${sessions.get(sid)}&select=*`);
  }

  async function requireAuth(req, res, next) {
    try {
      const user = await currentUser(req);
      if (!user) {
        return res.redirect('/login');
      }
      req.user = user;
      next();
    } catch (e) {
      res.status(500).send(e.message);
    }
  }

  function login(res, user) {
    const sid = uuid();
    sessions.set(sid, user.id);
    res.setHeader('Set-Cookie', `sid=${sid}; Path=/; HttpOnly`);
  }

  function logout(res) {
    res.setHeader('Set-Cookie', 'sid=; Max-Age=0; Path=/');
  }

  return { currentUser, requireAuth, login, logout };
}
