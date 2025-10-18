# Integrated Wayang Seni Pujangga Project - User Manual

This manual provides detailed instructions for setting up, using, customizing, troubleshooting, and managing version control for the Integrated Wayang Seni Pujangga Project (neumorphic login gateway + streaming site). The project is a self-contained, static web application with Supabase backend integration for auth.

## Introduction

The project combines a neumorphic login form (gateway for authentication) with the Wayang Seni Pujangga streaming website (TMDB-powered content discovery and playback). Key features:

- **Login Gateway**: Toggleable email/password, social OAuth, guest PIN (keypad via ctaxnagomi mod, validates 150 PINs from SQL).
- **Streaming Site**: Search/filter movies/TV, watchlists/profiles (localStorage), resume playback (iframes), metadata modals.
- **Integration**: Supabase session persistence; redirect from login to streaming on success.
- **Version Control**: Git with branches for workflow (main, modifyws, debugreport, bugfix, preview, prod).

The project files are in the root (login) and subdirectory (streaming). No build tools required, but Git for management.

## Prerequisites

- **Browser**: Modern web browser supporting CSS3 (box-shadow, transforms), ES6 JS, Fetch API.
  - Recommended: Chrome 88+, Firefox 103+, Safari 15.4+, Edge 88+.
  - Tested on: Latest versions.

- **Backend Services**:
  - **Supabase**: Free account at supabase.com; run setup_guest_pins.sql for PIN table/RPC.
  - **TMDB**: API key from themoviedb.org (replace placeholder in search-player.js).

- **Development Tools** (optional):
  - VS Code with Live Server extension for local preview.
  - Git for version control (installed; repository initialized).

- **No Dependencies**: Standalone; CDNs for icons/fonts, Supabase/TMDB APIs.

## Setup Instructions

1. **Download/Clone the Project**:
   - The workspace is c:/Users/wanmo/WSP-maindev-v.2.18.0.
   - Files: Root (index.html, style.css, script.js, setup_guest_pins.sql, netlify.toml, docs); subdirectory wsp-assets/ (streaming).

2. **Backend Setup**:

   - **Supabase**:
     - Create project at supabase.com.
     - In SQL Editor, run setup_guest_pins.sql: Creates guest_pins table (150 PINs), validate_pin RPC function.
     - Grant anon/authenticated: USAGE on schema, SELECT on table, EXECUTE on function.
     - Update JS (script.js, search-player.js) with Supabase URL/anon key.

   - **TMDB**:
     - Get API key; replace in search-player.js (prod: proxy to hide).

   - Test: Use Supabase dashboard to query PINs; verify RPC.

3. **Local Development**:
   - Open folder in VS Code.
   - Right-click index.html → "Open with Live Server" (localhost:5500).
   - For streaming: Navigate to main.html after login.
   - Git: See Version Control section.

4. **Production Deployment**:
   - Use netlify.toml for Netlify (redirects, headers).
   - Drag folder to netlify.com/drop or git connect.
   - Env vars: Add Supabase/TMDB keys in Netlify settings.
   - Minify: Manual or Vite for JS/CSS.

5. **Verification**:
   - Load index.html: Neumorphic card; test login/PIN (e.g., 48291 from SQL).
   - Success: Redirects to main.html (streaming); session persists.
   - Search/playback: Test TMDB fetch, iframe load, resume.

## Usage Guide

### Basic Navigation

- **Login Gateway** (index.html): Default login view; toggle to guest PIN keypad (ctaxnagomi mod replaces signup).
- **Streaming Site** (main.html): Navbar, profiles, search bar, carousels (top-rated, upcoming).
- **View Switching**: Auth success auto-redirects; unauth on streaming → login.

### Form Submission (Login)

1. **Email/Password**: Enter valid email/password; validates real-time.
2. **Guest PIN**: Switch to keypad; enter 5-digit (from SQL); RPC validates.
3. **Social**: Click button; simulates OAuth (prod: real redirect).

- Success: 2s spinner + pulse; creates Supabase session, redirects to streaming.

### Streaming Usage

1. **Profile Selection**: Choose/add profile (localStorage); loads watchlist.
2. **Search/Filter**: Type query; filter genres; results in carousels (infinite scroll).
3. **Details/Playback**: Click item → modal (TMDB metadata); play → iframe (vidnest.fun).
4. **Watchlist**: Add/remove; progress saves on timeupdate (>30s); resume on reload.
5. **Interactions**: Hover for modals; keyboard nav; error alerts for failures.

### Mobile Usage

- Responsive: Stacks on <480px; touch for taps.
- Test: DevTools device mode; ensure carousels swipe.

## Customization

### Styling (CSS)

- Colors/Shadows: Edit in style.css (variables for neumorphic palette).
- Animations: @keyframes for plasma/shake.

### Functionality (JS)

- Validation: Tweak regex/thresholds in script.js/search-player.js.
- APIs: Update endpoints/keys; extend TMDB fetches.
- Profiles/Watchlist: Modify localStorage keys in profile-watchlist.js.

### Backend

- Add PINs: SQL INSERT into guest_pins.
- Extend Supabase: User tables for synced watchlists.

### Dark Mode

- Add media query in CSS: Invert shadows/base.

## Version Control (Git Workflow)

The repository uses a multi-branch strategy for organized development:

- **main**: Base branch; stable core (initial streaming v2.0.0 + login).
- **modifyws**: For workspace modifications (e.g., file edits, local changes).
- **debugreport**: For debugging and logging issues (add console/reports).
- **bugfix**: For hotfixes (e.g., validation bugs, API errors).
- **preview**: Staging for testing (merge from modifyws/bugfix; deploy preview).
- **prod**: Production releases (merge from preview; tag v2.18.0+).

### Git Commands

1. **Switch Branches**: `git checkout <branch>` (e.g., `git checkout modifyws` for edits).
2. **Create/Merge**: Develop on feature branch; `git checkout preview` → `git merge modifyws`.
3. **Commit/Push**: `git add .` → `git commit -m "Message"` → `git push origin <branch>`.
4. **PR Process**: Edit on modifyws → test on preview → merge to prod.
5. **Status**: `git status` (changes); `git log --oneline` (history); `git branch -a` (all branches).
6. **gitignore**: Add for temp files (e.g., .env for keys, node_modules if added).

### Custom Versioning Scheme

- **Base Format**: WSP-maindev-v.MAJOR.MINOR.PATCH (e.g., v2.18.0)
- **Increments**:
  - **.0 for Main/Prod/Preview/Modifyws Commits**: No patch increment; keeps .0 for stable/feature commits.
  - **Patch Increment for Bug Fixes**: Use bugfix branch for fixes, then commit to debugreport. Each such commit increments PATCH by 1 (e.g., v2.18.0 → v2.18.1 after one fix).
  - **Daily Bug Fixes**: If 3 fixes committed to debugreport in a day, increment to v2.18.4 (base 1 + 3 daily).
- **Tagging**: After merge to prod, tag with new version (e.g., git tag v2.18.1); update docs (RELEASE_NOTES, PROGRESS_TRACKER).
- **Example Flow**: Bug found → bugfix branch → fix → merge to debugreport → commit increments patch → merge preview → prod → tag v2.18.1.
- Update workspace name/docs on tag (e.g., WSP-maindev-v.2.18.1).

For collaboration: Push to remote (GitHub); use PRs. See PROGRESS_TRACKER.txt for status.

## Troubleshooting

### Common Issues

1. **Auth Fails**:
   - Cause: Invalid Supabase keys/SQL.
   - Fix: Check console; verify setup_guest_pins.sql ran; test RPC in dashboard.

2. **Streaming No Content**:
   - Cause: TMDB key invalid.
   - Fix: Replace placeholder; check network tab for 401.

3. **Session Not Persisting**:
   - Cause: localStorage cleared or Supabase config.
   - Fix: Inspect session in console; ensure URL/anon key correct.

4. **Git Errors**:
   - **"Not a Git repo"**: Run `git init` (already done).
   - **Branch not found**: `git checkout -b <branch>` to create.
   - **Merge conflicts**: Resolve in VS Code; `git add` → commit.
   - **Versioning**: Ensure patch increments on bugfix/debugreport commits; tag after prod merge.
   - Fix: `git status` for guidance; `git log` for history.

5. **Iframes Blocked**:
   - Cause: CSP or ad-blocker.
   - Fix: Allow in browser; add fallback message in JS.

6. **Mobile Carousels Lag**:
   - Cause: Infinite scroll on touch.
   - Fix: Test; optimize images (lazy loading already).

7. **PIN Validation Fails**:
   - Cause: SQL not run or PIN inactive.
   - Fix: Query table in Supabase; use valid PIN (e.g., 48291).

### Debugging Tips

- **Console**: F12; check errors (e.g., "Supabase auth failed"), logs (e.g., "PIN valid").
- **Elements/Network**: Inspect classes (e.g., .loading), API calls (200 OK for TMDB).
- **Supabase Logs**: Dashboard > Logs for auth/RPC.
- **Git**: `git diff` for changes; `git stash` to save uncommitted; `git tag -l` for versions.
- **Test Flows**: Login → streaming → search → play → resume; unauth redirect.

### FAQ

- **Is this secure?** Client-side auth; proxy APIs in prod; rotate keys.
- **Git for Teams?** Yes; PRs from feature branches to prod.
- **Add More PINs?** SQL INSERT; re-run ON CONFLICT DO NOTHING.
- **Versioning for Bugs?** Increment patch on bugfix/debugreport commits; tag on prod.
- **Real Streaming?** Iframes external; for prod, use licensed API (e.g., Vimeo).

For further help, check RELEASE_NOTES.md or file an issue on GitHub.

## Support

- **Repository**: Local Git (push to remote for sharing).
- **Contact**: Open issues on remote repo.
- **Version**: v2.18.0; see PROGRESS_TRACKER.txt for status.

Last Updated: 2025-10-18
Last Updated: 2025-10-18
