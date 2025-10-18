# GitHub Status Checks for WSP Project

This document provides a comprehensive list of recommended status checks to add to your GitHub ruleset for the Wayang Seni Pujangga (WSP) project.

## Project Context

- **Type**: Static web application with Supabase backend
- **Tech Stack**: HTML5, CSS3, JavaScript (ES6+), TypeScript (Supabase Functions)
- **Deployment**: Netlify
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **APIs**: TMDB API

---

## Recommended Status Checks

### 1. Deployment & Build Checks

#### **Netlify Deploy Preview**
- **Check Name**: `netlify/deploy-preview`
- **Purpose**: Ensures deployment preview builds successfully before merging
- **Required**: Yes
- **Why**: Validates that changes won't break production deployment

#### **Netlify Build**
- **Check Name**: `netlify/build`
- **Purpose**: Verifies build process completes without errors
- **Required**: Yes
- **Why**: Catches configuration issues in [`netlify.toml`](netlify.toml)

---

### 2. Code Quality Checks

#### **HTML Validation**
- **Check Name**: `html-validation`
- **Tool**: HTML5 Validator (W3C Validator or html-validate)
- **Purpose**: Validates HTML syntax and semantic correctness
- **Required**: Yes
- **Files to Check**: 
  - [`index.html`](index.html)
  - [`wsp-assets/main.html`](wsp-assets/main.html)
  - [`wsp-assets/frontend/*.html`](wsp-assets/frontend/)
- **Setup**: GitHub Action with `html-validate` or W3C validator API

#### **CSS Linting**
- **Check Name**: `stylelint`
- **Tool**: Stylelint
- **Purpose**: Ensures CSS follows best practices and conventions
- **Required**: Yes
- **Files to Check**:
  - [`style.css`](style.css)
  - [`wsp-assets/css/*.css`](wsp-assets/css/)
- **Setup**: GitHub Action with Stylelint configuration

#### **JavaScript Linting**
- **Check Name**: `eslint`
- **Tool**: ESLint
- **Purpose**: Validates JavaScript code quality and catches errors
- **Required**: Yes
- **Files to Check**:
  - [`script.js`](script.js)
  - [`wsp-assets/js/*.js`](wsp-assets/js/)
- **Setup**: GitHub Action with ESLint + ES6 parser

#### **TypeScript Compilation**
- **Check Name**: `typescript-check`
- **Tool**: TypeScript Compiler (tsc)
- **Purpose**: Validates Supabase Edge Function TypeScript code
- **Required**: Yes
- **Files to Check**:
  - [`supabase/functions/create-session/index.ts`](supabase/functions/create-session/index.ts)
- **Setup**: GitHub Action with `deno check` or `tsc --noEmit`

---

### 3. Security Checks

#### **Secret Scanning**
- **Check Name**: `secret-scanning`
- **Tool**: GitHub Secret Scanning (built-in) or TruffleHog
- **Purpose**: Detects accidentally committed API keys, tokens, passwords
- **Required**: Yes
- **What to Scan For**:
  - Supabase API keys
  - TMDB API keys
  - OAuth credentials
- **Setup**: Enable in GitHub repository settings > Security > Secret scanning

#### **Dependency Security Audit**
- **Check Name**: `dependency-audit`
- **Tool**: npm audit (if package.json added) or OWASP Dependency-Check
- **Purpose**: Identifies vulnerabilities in dependencies
- **Required**: Recommended
- **Note**: Currently no package.json, but add if npm dependencies introduced
- **Setup**: GitHub Action with `npm audit` or Dependabot alerts

#### **SAST (Static Application Security Testing)**
- **Check Name**: `codeql-analysis`
- **Tool**: GitHub CodeQL or SonarCloud
- **Purpose**: Detects security vulnerabilities in JavaScript/TypeScript code
- **Required**: Recommended
- **Files to Scan**: All `.js` and `.ts` files
- **Setup**: GitHub Code Scanning in Security tab

#### **SQL Injection Prevention**
- **Check Name**: `sql-security-check`
- **Tool**: Custom script or Semgrep
- **Purpose**: Reviews SQL files for injection vulnerabilities
- **Required**: Recommended
- **Files to Check**:
  - [`setup_sessions.sql`](setup_sessions.sql)
  - [`setup_guest_pins.sql`](setup_guest_pins.sql)
- **Setup**: GitHub Action with Semgrep rules for SQL

---

### 4. Testing Checks

#### **Unit Tests**
- **Check Name**: `unit-tests`
- **Tool**: Jest or Vitest (if implemented)
- **Purpose**: Validates individual function/module correctness
- **Required**: If tests exist
- **Status**: Not currently implemented (see Limitations in README)
- **Future Setup**: GitHub Action with `npm test`

#### **Integration Tests**
- **Check Name**: `integration-tests`
- **Tool**: Cypress or Playwright
- **Purpose**: Validates end-to-end user flows
- **Required**: If tests exist
- **Test Scenarios**:
  - Login flow (email/password, guest PIN, OAuth)
  - Search and playback
  - Watchlist operations
- **Future Setup**: GitHub Action with browser testing framework

#### **Accessibility Tests**
- **Check Name**: `accessibility-check`
- **Tool**: axe-core or Pa11y
- **Purpose**: Ensures WCAG AA compliance
- **Required**: Recommended
- **What to Test**: All HTML pages for a11y violations
- **Setup**: GitHub Action with `pa11y-ci`

---

### 5. Performance Checks

#### **Lighthouse CI**
- **Check Name**: `lighthouse-ci`
- **Tool**: Lighthouse CI
- **Purpose**: Validates performance, accessibility, SEO metrics
- **Required**: Recommended
- **Thresholds**:
  - Performance: 90+
  - Accessibility: 90+
  - Best Practices: 90+
  - SEO: 90+
- **Setup**: GitHub Action with Lighthouse CI configuration

#### **Bundle Size Check**
- **Check Name**: `bundle-size-limit`
- **Tool**: bundlesize or custom script
- **Purpose**: Prevents CSS/JS bloat
- **Required**: Optional
- **Target**: Keep total assets < 500KB
- **Setup**: GitHub Action with file size monitoring

---

### 6. Documentation Checks

#### **Markdown Linting**
- **Check Name**: `markdownlint`
- **Tool**: markdownlint-cli
- **Purpose**: Ensures consistent markdown formatting
- **Required**: Optional
- **Files to Check**:
  - [`README.md`](README.md)
  - [`MANUAL.md`](MANUAL.md)
  - [`RELEASE_NOTES.md`](RELEASE_NOTES.md)
  - [`deployment.md`](deployment.md)
- **Setup**: GitHub Action with `markdownlint-cli`

#### **Link Validation**
- **Check Name**: `link-check`
- **Tool**: markdown-link-check
- **Purpose**: Validates internal and external links in documentation
- **Required**: Optional
- **Setup**: GitHub Action with `markdown-link-check`

---

### 7. Git Workflow Checks

#### **Commit Message Validation**
- **Check Name**: `commitlint`
- **Tool**: commitlint
- **Purpose**: Enforces conventional commit message format
- **Required**: Optional
- **Format**: `type(scope): subject` (e.g., `feat(login): add guest PIN`)
- **Setup**: GitHub Action with `commitlint`

#### **Branch Naming Convention**
- **Check Name**: `branch-naming`
- **Tool**: Custom GitHub Action
- **Purpose**: Enforces branch naming per Git Workflow (modifyws, debugreport, preview, prod)
- **Required**: Optional
- **Pattern**: `(modifyws|debugreport|bugfix|preview|prod)/.*`
- **Setup**: GitHub Action with branch name validation

---

## Priority Recommendations by Branch

### For `prod` Branch (Production)
**REQUIRED** - Block merge if failed:
1. ✅ `netlify/deploy-preview`
2. ✅ `netlify/build`
3. ✅ `secret-scanning`
4. ✅ `html-validation`
5. ✅ `eslint`
6. ✅ `typescript-check`

**RECOMMENDED**:
- `lighthouse-ci` (performance)
- `codeql-analysis` (security)
- `accessibility-check`

### For `preview` Branch (Staging)
**REQUIRED**:
1. ✅ `netlify/deploy-preview`
2. ✅ `html-validation`
3. ✅ `eslint`
4. ✅ `typescript-check`

**RECOMMENDED**:
- `stylelint`
- `secret-scanning`
- `integration-tests` (if implemented)

### For `modifyws` / `debugreport` / `bugfix` Branches (Development)
**REQUIRED**:
1. ✅ `eslint`
2. ✅ `typescript-check`

**RECOMMENDED**:
- `html-validation`
- `stylelint`
- `unit-tests` (if implemented)

---

## Implementation Steps

### Step 1: Enable GitHub Built-in Checks
1. Navigate to **Repository Settings > Security**
2. Enable:
   - Secret scanning
   - Dependabot alerts
   - Code scanning (CodeQL)

### Step 2: Create GitHub Actions Workflows
Create `.github/workflows/` directory with these files:

#### `ci.yml` - Main CI Pipeline
```yaml
name: CI Pipeline

on:
  pull_request:
    branches: [ preview, prod ]
  push:
    branches: [ modifyws, debugreport, bugfix ]

jobs:
  lint-js:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install ESLint
        run: npm install -g eslint
      - name: Lint JavaScript
        run: eslint script.js wsp-assets/js/*.js

  lint-html:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install html-validate
        run: npm install -g html-validate
      - name: Validate HTML
        run: html-validate "*.html" "wsp-assets/**/*.html"

  typescript-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x
      - name: Type Check Supabase Functions
        run: deno check supabase/functions/create-session/index.ts
```

#### `security.yml` - Security Checks
```yaml
name: Security Checks

on:
  pull_request:
    branches: [ preview, prod ]
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: TruffleHog Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

#### `lighthouse.yml` - Performance Checks
```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [ preview, prod ]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://deploy-preview-${{ github.event.pull_request.number }}--your-netlify-site.netlify.app
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### Step 3: Configure Ruleset in GitHub
1. Go to **Repository Settings > Rules > Rulesets**
2. Click **New ruleset** > **New branch ruleset**
3. Name: "Production Protection"
4. Target branches: `prod`, `main`
5. Rules:
   - ✅ Require status checks to pass before merging
   - Select checks:
     - `netlify/deploy-preview`
     - `netlify/build`
     - `lint-js`
     - `lint-html`
     - `typescript-check`
     - `secret-scan`
   - ✅ Require branches to be up to date before merging
   - ✅ Require linear history
   - ✅ Require signed commits (optional but recommended)
   - ✅ Require pull request reviews (1+ approvals)

### Step 4: Netlify Integration
1. In Netlify site settings, enable:
   - **Deploy Previews** for all pull requests
   - **Build notifications** to GitHub
2. Netlify automatically creates these status checks:
   - `netlify/deploy-preview` - Preview deployment
   - `netlify/build` - Build status

---

## Minimal Setup (Quick Start)

If you want to start with essential checks only:

### Required Checks for `prod` Branch:
1. **netlify/deploy-preview** (auto-enabled with Netlify)
2. **netlify/build** (auto-enabled with Netlify)

### Add Basic CI (10 minutes setup):
1. Create `.github/workflows/ci.yml` with linting (see Step 2 above)
2. Enable Secret Scanning in GitHub settings
3. Configure branch protection with these 4 checks

This provides basic safety without overwhelming setup.

---

## Testing Your Configuration

Before enforcing checks on `prod`:
1. Create test PR from `modifyws` to `preview`
2. Verify all checks run and report correctly
3. Intentionally introduce errors to test failure handling
4. Confirm status checks block merge appropriately
5. Then apply same ruleset to `prod`

---

## Maintenance

- **Review checks monthly**: Remove unused, add new as project evolves
- **Update thresholds**: Adjust Lighthouse scores based on improvements
- **Monitor check duration**: Optimize slow checks to keep PR velocity high
- **Document exceptions**: If bypassing checks, log reason in PR

---

## Notes

- This project is **static HTML/CSS/JS**, so traditional npm-based checks aren't needed unless you add a build system
- **Supabase Edge Functions** use Deno runtime, so use `deno check` instead of `tsc`
- **API keys** are currently exposed in JS (see Security Considerations in README) - Secret scanning will catch new leaks
- **Testing framework** not yet implemented (see Limitations in README) - Add test checks when Jest/Cypress added
- **Branch workflow** follows custom pattern (modifyws → debugreport → preview → prod) - adjust ruleset targets accordingly

---

## Additional Resources

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [Netlify Deploy Previews](https://docs.netlify.com/site-deploys/deploy-previews/)
- [ESLint Getting Started](https://eslint.org/docs/latest/use/getting-started)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [GitHub Actions for Security](https://github.com/features/security)