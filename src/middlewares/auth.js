import { createAuth } from '../lib/auth.js';

export function createAuthMiddleware({ one }) {
  const { currentUser, requireAuth, login, logout } = createAuth({ one });

  return { currentUser, requireAuth, login, logout };
}
