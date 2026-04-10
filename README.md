# AIMS
A full suite of agentic employees to power your business.

## Run (web app)
```bash
PORT=3131 npm start
```

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
