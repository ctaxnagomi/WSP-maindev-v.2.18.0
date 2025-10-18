# Deployment Instructions for WSP Session Tracking System

## Prerequisites
- Supabase project set up (URL: https://uxcxnidgebtrgggmvyph.supabase.co, Anon Key: [your anon key], Service Role Key: [your service role key]).
- Supabase CLI for Edge Function deployment (optional for SQL via dashboard). On Windows, install via Scoop: Install Scoop from https://scoop.sh/, then `scoop bucket add supabase https://github.com/supabase/scoop-bucket` and `scoop install supabase`. (Avoid npm global install, as it's not supported.)
- Existing guest_pins setup from setup_guest_pins.sql executed.

## 1. Database Setup (Recommended: Supabase Dashboard Editor)
1. Log in to Supabase Dashboard > SQL Editor > New Query (simplest method, no CLI needed).
2. Copy and paste the content of [`setup_sessions.sql`](setup_sessions.sql) (lines 1-109).
3. Click "Run" to execute. This creates the `wsp_sessions` table, indexes, RLS policies, and RPCs (`create_session`, `close_session`).
4. Verify: In the same editor, run `SELECT * FROM wsp_sessions LIMIT 1;` (should be empty). Test RPC: `SELECT create_session('test', NULL, '{}');` (returns a UUID).

(Alternative: CLI - `supabase db push` after linking project, but dashboard is simpler for one-time SQL.)

## 2. Edge Function Deployment (Requires CLI)
1. Link Supabase CLI: Run `supabase login` (use access token if prompted; CLI already installed via Scoop/Chocolatey).
2. The function code is in [`supabase/functions/create-session/index.ts`](supabase/functions/create-session/index.ts) (lines 1-78).
3. From project root, run `supabase functions deploy create-session`.
4. Set secrets in Dashboard > Settings > API > Secrets (or CLI: `supabase secrets set SUPABASE_URL=https://uxcxnidgebtrgggmvyph.supabase.co` and `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[your service role key]`).
5. Test: POST to `https://uxcxnidgebtrgggmvyph.supabase.co/functions/v1/create-session` with Authorization Bearer ([your anon key]) and body `{ "login_type": "guest_pin", "guest_pin": "48291" }`. Expect `{ "session_id": "uuid", "success": true }`.

## 3. Frontend Integration
1. Updates to [`script.js`](script.js) are applied (session creation on auth success, close on beforeunload).
2. Deploy the site (e.g., via Netlify from netlify.toml).
3. Test login flows:
   - Email: Enter valid credentials → Console shows "Session created" → Close tab → Query Supabase for updated session (status 'closed', duration >0).
   - Guest PIN: Enter valid PIN (e.g., 48291) → Same.
   - OAuth: Click social button → On redirect, session created.
4. Verify data: Supabase > Table Editor > wsp_sessions; check access_data for ip_address, device_type, geolocation.

## 4. Testing and Troubleshooting
- Local testing: `supabase start` for local Supabase, `supabase functions serve create-session` for function.
- Logs: Dashboard > Functions > Logs.
- Errors: RPC fails? Check RLS. Edge Function? Verify Deno imports (valid on deployment).
- Rate Limits: ipapi.co (1k/day free); monitor geo lookups.
- Security: Service role key server-side only.

## 5. Monitoring
- Totals: `SELECT user_id, SUM(total_visits), SUM(total_duration) FROM wsp_sessions GROUP BY user_id;`.
- Logs: Filter by login_type or access_data->>'ip_address'.

This completes implementation. Use dashboard editor for SQL simplicity; CLI for functions. Enable full RLS for production.
