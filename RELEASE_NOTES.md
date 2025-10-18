# Release Notes

This document tracks changes, new features, bug fixes, and known issues for the Integrated Wayang Seni Pujangga Project (neumorphic login gateway + streaming site). Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

## Versioning Scheme

The project uses a custom semantic versioning for the workspace name and tags: WSP-maindev-v.MAJOR.MINOR.PATCH

- **MAJOR.MINOR.PATCH Increments**:
  - **.0 for Main/Prod/Preview/Modifyws Commits**: Stable or feature commits keep PATCH at .0 (e.g., v2.18.0 for integration updates).
  - **Patch Increment for Bug Fixes**: Use bugfix branch for fixes, merge to debugreport. Each commit to debugreport increments PATCH by 1 (e.g., v2.18.0 → v2.18.1 after one fix).
  - **Daily Bug Fixes**: If multiple fixes (e.g., 3 commits to debugreport in a day), increment accordingly (base 1 + daily count, e.g., v2.18.4 for 1 base + 3 daily).
- **Tagging & Naming**: After merge to prod, tag with new version (git tag v2.18.1); update workspace/docs names (e.g., WSP-maindev-v.2.18.1).
- **Example Flow**: Bug → bugfix → fix → merge debugreport (increment patch) → preview → prod → tag v2.18.1; update RELEASE_NOTES/PROGRESS_TRACKER/MANUAL.
- **MAJOR/MINOR**: Increment for major features/releases (manual).

## [2.18.0] - 2025-10-18 - Integrated Release with Git Setup

### Added (v2.18.0)

- **Git Version Control**: Initialized repository in workspace (c:/Users/wanmo/WSP-maindev-v.2.18.0). Created branches: main (base), modifyws (workspace modifications), debugreport (debugging), bugfix (fixes), preview (staging), prod (production). Committed updates to prod branch.
- **Git Workflow Documentation**: Added instructions in MANUAL.md for branch usage (e.g., develop on modifyws, test on preview, merge to prod).
- **Project Diagram Enhancements**: Mermaid diagram in README.md now includes Git branch flow (simple flowchart for development workflow).
- **Supabase Integration**: Full auth (email/password, OAuth, guest PIN via RPC) with session persistence across login and streaming.
- **Streaming Features**: TMDB API for search/metadata, vidnest.fun iframes for playback, localStorage watchlists/profiles, resume functionality (postMessage seek).
- **Modular Code**: JS modules (carousel.js, profile-watchlist.js, search-player.js); consolidated CSS; removed inline from main.html.
- **Security & Performance**: API key placeholders, error handling (try-catch), ARIA accessibility, lazy loading, netlify.toml for deployment.

### Changed (v2.18.0)

- **Project Scope**: Expanded from standalone login form to integrated login + Wayang Seni Pujangga streaming site (v2.0.0 base).
- **Documentation**: README.md unified for full project (features, structure, Mermaid diagram with auth/search/playback/watchlist flow). PROGRESS_TRACKER.txt updated with phases for integration/Git (95% complete).
- **ctaxnagomi Modification**: Guest PIN keypad replaces signup; validates 150 PINs from setup_guest_pins.sql (table/RPC).
- **RELEASE_NOTES.md**: Updated for integrated project; added Git setup and custom versioning details.
- **MANUAL.md**: Enhanced for streaming usage, Supabase/TMDB setup, Git workflow with versioning scheme.

### Fixed (v2.18.0)

- **Session Flow**: Streaming (main.html) now checks Supabase session; redirects to login if unauthenticated.
- **Resume Playback**: localStorage saves progress (>30s); auto-seek on reload via iframe postMessage.
- **Error Handling**: User-friendly alerts for API failures/offline; shake/red shadows for forms.
- **Modularity**: Consolidated duplicates (style.css, script.js); standardized "Wayang Seni Pujangga" branding.
- **Markdown Linting**: Resolved blanks, headings, lists in README.md for clean formatting.

### Removed (v2.18.0)

- Inline styles/scripts from main.html (modularized to JS/CSS files).
- Outdated login-only references in docs.

### Known Issues

- **Plasma Animation**: Basic implementation; enhance keyframes for full hue/glow in future.
- **API Security**: TMDB/Supabase keys exposed in JS—rotate and proxy in prod.
- **PIN Validation**: Anon-accessible RPC; add RLS or one-time PINs for security.
- **Iframes**: External vidnest.fun dependency; add fallbacks for downtime.
- **localStorage**: Client-side only; not synced across devices (use Supabase for prod).
- **Git Remote**: Local branches created; push to remote (e.g., GitHub) and set upstream for collaboration.
- **Testing**: Manual only; add Jest/Cypress for unit/E2E.
- **Dark Mode**: Not implemented; neumorphic shadows need inversion.
- **Versioning**: Ensure patch increments only on bugfix/debugreport; manual MAJOR/MINOR.

### Migration (v2.18.0)

- From v2.0.0 streaming base: Update paths to top-level login; integrate Supabase keys in JS.
- For Git: Switch branches with `git checkout <branch>`; merge via PRs (modifyws -> preview -> prod).
- Review validation in script.js; extend for real backend. For versioning, follow scheme in docs.

## [1.0.0] - 2025-10-16 - Initial Login Form Release

### Added (v1.0.0)

- Complete dual-view login and signup forms with seamless toggling.
- Neumorphic design system: embossed elements, multi-layered shadows, soft press/hover effects.
- Real-time client-side validation: email regex, password length (≥6 chars), full name (≥2 chars), password confirmation, terms checkbox.
- Interactive features: password visibility toggles, ambient lighting (mouse-responsive shadows), loading spinners, success pulse animation.
- Social authentication buttons: Google, GitHub, Twitter with SVG icons and provider detection (simulated OAuth flow).
- Responsive design: Mobile adaptations (<480px) for layout, padding, and fonts.
- Accessibility enhancements: ARIA labels, focus states, semantic HTML.
- Self-contained implementation: No external dependencies; all CSS/JS inline.
- Documentation: Updated README.md with Mermaid diagram, features, usage, and customization guides.

### Changed (v1.0.0)

- Enhanced original Colorlib design (by Aigars Silkalns, adjusted by ctaxnagomi) with modern ES6 class-based JS (`NeumorphismForm`).
- Removed outdated dependency reference (`../../shared/js/form-utils.js`)—project is fully standalone.
- Improved error handling: Visible messages with shake animations; terms validation now console-logged (future: add UI element).

### Fixed (v1.0.0)

- Form resets on view toggle to prevent data carryover.
- Error clearing on input to provide immediate feedback.
- Social button loading states (opacity/pointer-events during simulation).

### Removed (v1.0.0)

- No removals in initial release.

### Known Issues (Legacy)

- Client-side only: Validation/auth simulated; integrate backend.
- Low contrast: May not meet WCAG AAA.
- Plasma incomplete: Add full CSS.

### Migration (v1.0.0)

- N/A for initial; for v2.18.0, see above.

## Future Releases

- **2.18.1+**: Bug fixes via bugfix/debugreport (patch increments per commit).
- **2.19.0**: Full testing suite, dark mode, API proxy backend.
- **3.0.0**: Server-side auth, synced watchlists, real streaming integration.

For issues or contributions, see [README.md](README.md#contributing).
