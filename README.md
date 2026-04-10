# AIMS
A full suite of agentic employees to power your business.

## Run (web app)
```bash
cd wa_server
npm start
```

## Supabase activation
This project now uses Supabase as persistent storage.

1. Set credentials (optional; defaults are prefilled for this demo):
```bash
export SUPABASE_URL="https://uxxfyiukhlsahcyszutt.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
```
2. Run the activation script:
```bash
cd wa_server
npm run activate
```
If SQL API is disabled in your project, copy `wa_server/activate.sql` into the Supabase SQL Editor and run it manually.
