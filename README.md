# AIMS
A full suite of agentic employees to power your business.

## Run (web app)
```bash
PORT=3131 npm start
```

## Project structure
- `aims.js`: thin entrypoint.
- `src/app.js`: app bootstrap and route registration.
- `src/lib/*`: reusable helpers (auth/session, rendering, Supabase client, utility functions).
- `src/routes/*`: route groups split by concern (public, auth, member, admin CMS).
- Admin CMS staffing detail content is stored per role (`staffing/:id`) with a role-specific record in `staffing_role_page_content`.
- `public/`: static files.

## Supabase activation
This project uses Supabase as persistent storage.

1. Set credentials (optional; defaults are prefilled for this demo):
```bash
export SUPABASE_URL="https://uxxfyiukhlsahcyszutt.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
```
2. Run the activation script:
```bash
npm run activate
```

If APIs are unavailable for your project tier/config, open Supabase SQL Editor and run `./activate.sql` manually.
