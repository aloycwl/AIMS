import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import { createSupabaseClient } from './lib/supabase.js';
import { createAuthMiddleware } from './middlewares/auth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { registerPublicRoutes } from './routes/public.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerMemberRoutes } from './routes/member.js';
import { registerAdminRoutes } from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, '..', 'public')));

const { sb, one } = createSupabaseClient();
const { currentUser, requireAuth, login, logout } = createAuthMiddleware({ one });
const ctx = { sb, one, currentUser, requireAuth, login, logout };

registerPublicRoutes(app, ctx);
registerAuthRoutes(app, ctx);
registerMemberRoutes(app, ctx);
registerAdminRoutes(app, ctx);

app.use(errorHandler);

const port = process.env.PORT || 3131;
app.listen(port, () => console.log(`AIMS app running on http://localhost:${port}`));
