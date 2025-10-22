GUEST PIN SETUP & TESTING
=========================

This README describes how to install and test the guest PIN system used by the keypad in this project. It explains the SQL to run in Supabase, how the client (`script.js`) calls the RPC, how to test from the browser, and recommended next steps and security notes.

1) What this change does
------------------------
- Adds a `guest_pins` table (id, pin, nickname, active, created_at, expires_at, last_used_at).
- Adds a `validate_pin(pin_input, nickname_input)` RPC that:
  - Validates 5-character PIN format
  - Checks `active = true` and `expires_at` (if set)
  - Updates `last_used_at` and optionally stores `nickname`
  - Returns `(valid boolean, message text)`
- Inserts three test PINs (12345, 54321, 11111) that expire in 24 hours.

Files changed/created in the repo
--------------------------------
- `setup_guest_pins.sql` — the SQL script you should paste and run in Supabase.
- `script.js` — client-side JS (we added better RPC handling, debug logs, and nickname input handling).
- `index.html` / `style.css` — small additions for the nickname input UI.
- `GUEST_PIN_SETUP.md` — this README (created now).

2) How to apply the SQL in Supabase
-----------------------------------
1. Open your Supabase project dashboard.
2. Go to SQL Editor → New Query.
3. Paste the full contents of `setup_guest_pins.sql` (the file in this repo) into the editor.
4. Run the query.

Important notes:
- The script will TRUNCATE `guest_pins` and insert 3 test rows. If you want to keep existing pins, remove the `TRUNCATE` line and instead run INSERTs selectively.
- The RPC is created with `SECURITY DEFINER` and the function signature is `validate_pin(text, text)` — ensure you `GRANT EXECUTE` to `anon` if you want anonymous client calls.

3) Test PINs (quick browser tests)
----------------------------------
After running the SQL and reloading your site (or the page served locally), test from the browser DevTools Console.

Steps:
1. Open your site and the Console (F12).
2. Create a form instance and validate a PIN directly (this uses the current client code in `script.js`):

```javascript
// Create a new form instance and validate a single PIN
const form = new NeumorphismLoginForm();
form.currentPin = '12345';
form.validatePin().then(console.log).catch(console.error);
```

Expected result: The promise resolves to an object like `{ valid: true, message: 'PIN validated successfully' }` for valid test PINs.

If you get `{ valid: false, message: 'Invalid or expired PIN' }` then continue with "Troubleshooting" below.

4) Troubleshooting
------------------
If a valid PIN returns `Invalid or expired PIN`:

- Confirm the row exists and is active & not expired. In Console (re-using the `form` above):

```javascript
await form.supabase
  .from('guest_pins')
  .select('pin, active, expires_at, nickname, last_used_at')
  .eq('pin', '12345')
  .then(console.log)
  .catch(console.error);
```

- If no rows returned, the SQL hasn't been applied or was truncated in the wrong place — re-run `setup_guest_pins.sql` or insert rows manually.
- If `expires_at` is in the past or NULL and your RPC expects a future date, update the row:

```sql
-- Run in Supabase SQL editor or via table editor
UPDATE guest_pins SET active = true, expires_at = timezone('utc', now() + interval '24 hours') WHERE pin = '12345';
```

- If the RPC returns an error, check function permissions. In Supabase SQL editor run:

```sql
GRANT EXECUTE ON FUNCTION validate_pin(text, text) TO anon, authenticated;
```

- If the client shows a Supabase auth warning ("Multiple GoTrueClient instances"), reload the page and avoid creating multiple form instances in the console; the code now reuses a single `window._supabaseClient` instance.

5) Deploying front-end changes to Netlify (if you edited files)
-------------------------------------------------------------
If you made changes to the frontend files (JS/HTML/CSS), Netlify needs a repo push to rebuild and re-deploy.

PowerShell commands (run from repository root):

```powershell
git add .
git commit -m "Guest PIN: expiry & nickname support; client RPC handling and UI"
git push origin main
```

- Verify in Netlify dashboard the deploy triggered and completed successfully.

If Netlify is configured to a different branch, push to that branch instead.

6) Prevent automatic login during testing
-----------------------------------------
If you’re still logged in (Supabase session persisted), clear session and local storage in the browser Console before testing:

```javascript
localStorage.clear();
if (window._supabaseClient) await window._supabaseClient.auth.signOut();
window.location.reload();
```

7) Recommended next steps & security improvements
-------------------------------------------------
- Hash PINs server-side: store salted hashes instead of plaintext, and compare server-side (change RPC accordingly).
- Add rate-limiting and lockouts for repeated invalid attempts (server-side policy or edge function).
- Consider single-use, time-limited PINs for guests; rotate/expire them more frequently.
- Record failed attempts and optionally block offending IPs.
- Do not commit production secrets into the repository; use Netlify environment variables for private keys.

8) If you want me to do the commit + push for you
------------------------------------------------
I can run the git commands from your workspace if you want (I have access to the workspace). Tell me to proceed and which commit message & branch to push to.

9) What I can do next for you
----------------------------
- Run the SQL changes in your Supabase (I cannot access your Supabase instance without credentials — you must paste/run the SQL there).
- Create a short test harness page or add in-app debug UI to exercise PIN validations without opening DevTools.
- Implement server-side hashed PIN migration SQL and RPC.


If you'd like, I can now:
- Guide you step-by-step running the SQL in Supabase and verifying records; or
- Run the git commit/push in your repository for the frontend changes (tell me the branch and commit message).

Which would you like me to do next?