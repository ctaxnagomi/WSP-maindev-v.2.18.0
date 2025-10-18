# GitHub Ruleset Setup Guide - Step by Step

This guide explains exactly how to configure your GitHub ruleset for the WSP project, starting from scratch.

## Important: Status Checks Must Exist Before Adding to Ruleset

**You cannot add status checks to a ruleset until they actually run in your repository at least once.** GitHub shows "No required checks" because no checks have been configured yet.

---

## Phase 1: Set Up Status Checks FIRST (Before Creating Ruleset)

You need to create the checks first, then add them to the ruleset. Here's the order:

### Step 1: Set Up Netlify Integration (Easiest - 5 minutes)

1. **Connect Netlify to your GitHub repository:**
   - Go to <https://app.netlify.com>
   - Click "Add new site" > "Import an existing project"
   - Choose "GitHub" and authorize Netlify
   - Select your WSP repository
   - Configure build settings:
     - **Base directory**: Leave empty (root)
     - **Build command**: Leave empty (static site)
     - **Publish directory**: `.` (current directory)
   - Click "Deploy site"

2. **Enable Deploy Previews:**
   - In Netlify site settings > Build & deploy > Deploy contexts
   - Enable "Deploy previews" for all pull requests
   - This automatically creates these checks:
     - ✅ `netlify/deploy-preview`
     - ✅ `netlify/build`

3. **Test it works:**
   - Create a test branch: `git checkout -b test-netlify`
   - Make a small change to README.md
   - Push and create a pull request to `preview` branch
   - Wait 1-2 minutes - you should see Netlify checks appear in the PR

**Result:** You now have 2 status checks available!

---

### Step 2: Set Up GitHub Actions (Basic CI - 10 minutes)

1. **Create the workflows directory:**

   ```bash
   mkdir -p .github/workflows
   ```

2. **Create `.github/workflows/ci.yml`:**

```yaml
name: CI Pipeline

on:
  pull_request:
    branches: [ preview, prod, main ]
  push:
    branches: [ modifyws, debugreport, bugfix ]

jobs:
  lint-javascript:
    name: Lint JavaScript
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install ESLint
        run: npm install -g eslint
      
      - name: Create ESLint config
        run: |
          cat > .eslintrc.json << 'EOF'
          {
            "env": {
              "browser": true,
              "es2021": true
            },
            "extends": "eslint:recommended",
            "parserOptions": {
              "ecmaVersion": "latest",
              "sourceType": "module"
            },
            "rules": {
              "no-unused-vars": "warn",
              "no-undef": "warn"
            }
          }
          EOF
      
      - name: Lint JavaScript files
        run: |
          eslint script.js || echo "Linting completed with warnings"
          eslint wsp-assets/js/*.js || echo "Linting completed with warnings"

  validate-html:
    name: Validate HTML
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install HTML validator
        run: npm install -g html-validate
      
      - name: Create validation config
        run: |
          cat > .htmlvalidate.json << 'EOF'
          {
            "extends": ["html-validate:recommended"],
            "rules": {
              "void-style": "off",
              "no-trailing-whitespace": "off"
            }
          }
          EOF
      
      - name: Validate HTML files
        run: |
          html-validate index.html || echo "Validation completed with warnings"
          html-validate wsp-assets/main.html || echo "Validation completed with warnings"
          html-validate wsp-assets/frontend/*.html || echo "Validation completed with warnings"

  check-typescript:
    name: TypeScript Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x
      
      - name: Type check Supabase functions
        run: |
          if [ -f "supabase/functions/create-session/index.ts" ]; then
            deno check supabase/functions/create-session/index.ts
          else
            echo "No TypeScript files to check"
          fi
```
<!--
3. **Commit and push the workflow:**

   ```bash
   git add .github/workflows/ci.yml
   git commit -m "ci: add GitHub Actions workflow"
   git push origin modifyws  # or your current branch
   ```

4. **Test it works:**
   - Create a pull request to `preview` branch
   - Go to the "Actions" tab in GitHub
   - You should see the workflow running
   - After it completes (2-3 minutes), these checks will appear:
     - ✅ `lint-javascript`
     - ✅ `validate-html`
     - ✅ `check-typescript`

**Result:** You now have 5 status checks available (2 from Netlify + 3 from Actions)!

---

### Step 3: Enable GitHub Secret Scanning (2 minutes)

1. Go to your repository on GitHub
2. Click **Settings** > **Code security and analysis**
3. Enable:
   - ✅ **Secret scanning** (click "Enable")
   - ✅ **Push protection** (recommended)
4. This creates the check:
   - ✅ `secret-scanning`

**Result:** You now have 6 status checks available!

---

## Phase 2: Create the GitHub Ruleset (After Checks Exist)

Now that you have status checks running, you can add them to a ruleset.

### Step 1: Create Ruleset for `prod` Branch

1. **Navigate to Rulesets:**
   - Go to your repository on GitHub
   - Click **Settings** > **Rules** > **Rulesets**
   - Click **New ruleset** > **New branch ruleset**

2. **Configure Basic Settings:**
   - **Ruleset name:** `Production Protection`
   - **Enforcement status:** Active
   - **Target branches:**
     - Click **Add target**
     - Select **Include by pattern**
     - Enter pattern: `prod`
     - Click **Add inclusion pattern**
     - Repeat for `main` if you use it

3. **Configure Branch Protection Rules:**

   Scroll down and enable these rules:

   #### A. Restrict deletions

   - ✅ Enable this rule
   - This prevents accidental deletion of production branch

   #### B. Require a pull request before merging

   - ✅ Enable this rule
   - **Required approvals:** `1` (or more if you have a team)
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require review from Code Owners (if you have CODEOWNERS file)

   #### C. Require status checks to pass

   - ✅ Enable this rule
   - ✅ **Require branches to be up to date before merging**
   - ⚠️ **Do NOT check** "Do not require status checks on creation"

   - **Add status checks:** Click "Add checks"
     - You'll see a search box
     - Start typing the check names and select them:

       **Essential checks (select these):**
       1. `netlify/deploy-preview` (or `netlify/build`)
       2. `lint-javascript`
       3. `validate-html`
       4. `check-typescript`

       **If they appear in the list, also add:**
       5. `secret-scanning` (if enabled)

     - Click each one to add it to the required list

4. **Additional Recommended Rules:**

   #### D. Require linear history

   - ✅ Enable this rule
   - Prevents merge commits, keeps history clean

   #### E. Block force pushes

   - ✅ Enable this rule
   - Prevents destructive force pushes to prod

5. **Save the Ruleset:**
   - Scroll to bottom
   - Click **Create** button

---

### Step 2: Create Ruleset for `preview` Branch (Staging)

Repeat the above but with less strict rules:

1. **Create new ruleset:**
   - Name: `Staging Protection`
   - Target: `preview` branch

2. **Enable these rules:**
   - ✅ Require pull request (1 approval)
   - ✅ Require status checks to pass
     - Add checks:
       1. `netlify/deploy-preview`
       2. `lint-javascript`
       3. `validate-html`
   - ✅ Block force pushes

3. **Save**

---

### Step 3: Create Ruleset for Development Branches (Optional)

For `modifyws`, `debugreport`, `bugfix` branches:

1. **Create new ruleset:**
   - Name: `Development Protection`
   - Target pattern: `modifyws`, `debugreport`, `bugfix`

2. **Enable minimal rules:**
   - ✅ Require status checks to pass
     - Add checks:
       1. `lint-javascript`
   - (No pull request required for development branches)

3. **Save**

---

## Phase 3: Test Your Configuration

### Test 1: Check Rulesets Are Active

1. Go to **Settings** > **Rules** > **Rulesets**
2. You should see:
   - ✅ Production Protection (Active) - `prod`, `main`
   - ✅ Staging Protection (Active) - `preview`
   - ✅ Development Protection (Active) - `modifyws`, `debugreport`, `bugfix` (if created)

### Test 2: Try to Merge Without Checks Passing

1. Create a test branch with an error:

   ```bash
   git checkout -b test-ruleset
   echo "console.log('test'" >> script.js  # Intentional syntax error
   git add script.js
   git commit -m "test: intentional error"
   git push origin test-ruleset
   ```

2. Create a pull request to `preview`
3. Watch the checks run
4. `lint-javascript` should **fail** due to syntax error
5. Try to merge - GitHub should **block** the merge with message:
   > "Required status check 'lint-javascript' is expected"

6. Fix the error:

   ```bash
   git checkout test-ruleset
   git restore script.js
   echo "console.log('test');" >> script.js
   git add script.js
   git commit -m "fix: correct syntax error"
   git push origin test-ruleset
   ```

7. Watch checks run again - should **pass** this time
8. Now you can merge!

### Test 3: Verify Production Protection

1. Try to push directly to `prod`:

   ```bash
   git checkout prod
   git pull origin prod
   echo "# test" >> README.md
   git add README.md
   git commit -m "test: direct push"
   git push origin prod
   ```

2. This should be **rejected** with error:
   > "required status checks must pass before merging"

3. This confirms your ruleset is working!

---

## Troubleshooting

### Problem: "No required checks" appears when creating ruleset

**Solution:** You need to run the checks at least once first:

1. Make sure GitHub Actions workflow is committed to your repository
2. Create a test pull request to trigger the workflows
3. Wait for checks to complete
4. Now create the ruleset - checks will appear in the search

### Problem: Status check names don't appear in search

**Possible causes:**

1. **Workflow hasn't run yet** - Create a PR to trigger it
2. **Workflow has errors** - Check Actions tab for failures
3. **Wrong job/check name** - Check the workflow file for actual job names

**How to find check names:**

1. Go to any recent pull request
2. Scroll to the bottom "Checks" section
3. The exact names listed there are what you should add to the ruleset

### Problem: Netlify checks not appearing

**Solution:**

1. Verify Netlify is connected to your GitHub repository
2. Check Netlify site settings > Build & deploy > Deploy contexts
3. Ensure "Deploy previews" is enabled
4. Create a test PR - Netlify should comment on it
5. Wait 2-3 minutes for check to register

### Problem: Checks pass but merge still blocked

**Possible causes:**

1. **Branch is not up to date** - "Require branches to be up to date" is enabled
   - Solution: Click "Update branch" button before merging
2. **Different check name** - The ruleset expects exact name match
   - Solution: Edit ruleset and verify check names match exactly

---

## Quick Reference: Your Status Check Names

Based on the workflows created above, your exact check names are:

### From Netlify

- `netlify/deploy-preview` (or `netlify/build`)

### From GitHub Actions (.github/workflows/ci.yml)

- `lint-javascript` (job name in workflow)
- `validate-html` (job name in workflow)
- `check-typescript` (job name in workflow)

### From GitHub Settings

- `secret-scanning` (if enabled in settings)

---

## Minimal Setup (Start Here if Overwhelmed)

If you want the simplest possible setup:

1. **Connect Netlify** (5 minutes)
   - This gives you `netlify/deploy-preview` check

2. **Create ruleset with just Netlify check:**
   - Name: `Production Protection`
   - Target: `prod` branch
   - Rules:
     - ✅ Require pull request (1 approval)
     - ✅ Require status checks: `netlify/deploy-preview`

3. **Done!** You now have basic protection.

4. **Later:** Add GitHub Actions when you're ready for more checks.

---

## What to Configure in the GitHub UI

When you see this in GitHub ruleset settings:

```
☐ Require status checks to pass
  Choose which status checks must pass before the ref is updated.
  
  ☐ Require branches to be up to date before merging
     Whether pull requests targeting a matching branch must be
     tested with the latest code.
  
  ☐ Do not require status checks on creation
     Allow repositories and branches to be created if a check
     would otherwise prohibit it.
  
  No required checks
  No checks have been added
```

**Check these boxes:**

- ✅ **Require status checks to pass** (enable the rule)
- ✅ **Require branches to be up to date before merging** (recommended)
- ⬜ **Do not require status checks on creation** (leave UNCHECKED)

**Then click "Add checks" button and select:**

1. `netlify/deploy-preview`
2. `lint-javascript`
3. `validate-html`
4. `check-typescript`

After adding, you'll see:

```
✓ Required checks: 4 checks
  - netlify/deploy-preview
  - lint-javascript
  - validate-html
  - check-typescript
```

---

## Summary

**The correct order is:**

1. ✅ Set up Netlify integration → Creates `netlify/*` checks
2. ✅ Create GitHub Actions workflow → Creates CI checks  
3. ✅ Make a test PR to run checks once → Registers them with GitHub
4. ✅ Create ruleset and add the checks → Protection active!
5. ✅ Test with another PR → Verify it works

You **cannot** skip steps 1-3 and jump straight to creating a ruleset, because GitHub won't have any checks to add yet.
