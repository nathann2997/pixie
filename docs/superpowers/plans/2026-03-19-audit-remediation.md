# Pigxel Audit Remediation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all 24 findings from the principal engineer audit, fixing security vulnerabilities, architecture issues, code quality problems, operational concerns, and polish items.

**Architecture:** Each finding is addressed as an independent task, ordered by severity (Critical → High → Medium → Low). Tasks are atomic and can be committed individually. Security fixes first, then structural improvements, then polish.

**Tech Stack:** TypeScript (Cloud Functions), Next.js (Dashboard), Vanilla JS (pigxel.js), Firebase (Firestore, Auth, Hosting)

---

## Task 1: Commit `.gitignore` (Finding #7)

**Why first:** Ensures no sensitive files accidentally get committed in subsequent tasks.

**Files:**
- Stage: `.gitignore` (already exists, just untracked)

- [ ] **Step 1: Verify `.gitignore` covers all sensitive patterns**

Confirm these patterns are present (they are):
```
.env
.env.local
.env.*.local
.env.production
service-account.json
*-service-account.json
functions/lib/
```

**IMPORTANT:** `.env.production` is NOT currently in `.gitignore`. Add it now before any other work:

Add this line to `.gitignore` after `.env.*.local`:
```
.env.production
```

- [ ] **Step 2: Commit `.gitignore`**

```bash
git add .gitignore
git commit -m "chore: track .gitignore to protect sensitive files"
```

---

## Task 2: Remove service account key from repo (Finding #1)

**Files:**
- Delete: `functions/service-account.json`

- [ ] **Step 1: Delete the service account key file**

```bash
rm functions/service-account.json
```

- [ ] **Step 2: Add a README note about credential setup**

Create `functions/SERVICE_ACCOUNT_SETUP.md`:
```markdown
# Service Account Setup

The Firebase Admin SDK service account key is NOT stored in the repository.

## Local Development (Emulator)
No service account needed — the emulator uses `admin.initializeApp()` without credentials.

## Production (Cloud Functions)
Cloud Functions automatically authenticate via the default service account.
No key file is needed.

## If you need a key for manual scripts
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `functions/service-account.json` (gitignored)
4. NEVER commit this file
```

- [ ] **Step 3: Commit**

```bash
git add -A functions/service-account.json functions/SERVICE_ACCOUNT_SETUP.md
git commit -m "security: remove service account key from repo, add setup guide"
```

- [ ] **Step 4: Rotate the compromised key**

**MANUAL ACTION REQUIRED:** Go to Google Cloud Console → IAM → Service Accounts → `firebase-adminsdk-fbsvc@pixie-b5d33.iam.gserviceaccount.com` → Keys → Delete the key with ID `7465a1e3...`. The old key is now compromised and must be revoked.

---

## Task 3: Remove OpenAI API key from `.env.local` (Finding #2)

**Files:**
- Modify: `functions/.env.local`

- [ ] **Step 1: Replace the key with a placeholder**

Replace contents of `functions/.env.local` with:
```
# Paste your OpenAI API key here for local development
# Get one at https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-key-here
```

Note: `.env.local` is already in `.gitignore`, so this is about hygiene. The real action is rotating the key.

- [ ] **Step 2: Rotate the compromised OpenAI key**

**MANUAL ACTION REQUIRED:** Go to https://platform.openai.com/api-keys → Revoke the compromised key → Generate a new key → Update `functions/.env.local` locally and the Firebase secret:
```bash
firebase functions:secrets:set OPENAI_API_KEY
```

---

## Task 4: Verify Firebase env files are gitignored (Finding #3)

**Note:** `.env.production` was already added to `.gitignore` in Task 1.

**Files:**
- Verify: `dashboard/.env.local.example` has placeholder values

- [ ] **Step 1: Verify `dashboard/.env.local.example` uses placeholders**

Check that it does not contain real API keys. Update if needed.

- [ ] **Step 2: Commit if changes were made**

```bash
git add dashboard/.env.local.example
git commit -m "chore: ensure env template uses placeholder values"
```

---

## Task 5: Add authentication/rate-limiting to `reportAudit` (Finding #4)

**Files:**
- Modify: `functions/src/index.ts` (the `reportAudit` function)

- [ ] **Step 1: Add HMAC validation and rate-limit headers**

The `reportAudit` endpoint is called by `pigxel.js` on third-party domains, so it can't use Firebase Auth. Instead:

1. Validate that the request body has a reasonable shape (already done — good)
2. Add payload size limit
3. Add basic abuse protection: limit `detected_pixels` array length, sanitize `page_url`
4. Add rate-limit response header hint for CDN

Replace the `reportAudit` function body's validation section. Add before body parsing:

```typescript
// Payload size guard — check Content-Length header before processing
const contentLength = parseInt(req.get('content-length') || '0', 10);
if (contentLength > 10_000) {
  res.status(413).json({ error: 'Payload too large' });
  return;
}

// Rate-limit hints for CDN enforcement (e.g., Cloudflare)
res.set('X-RateLimit-Limit', '60');
res.set('X-RateLimit-Window', '60');

// Sanitize arrays to prevent abuse
const MAX_ARRAY_LEN = 20;
```

And cap all array fields:
```typescript
detected_pixels:   Array.isArray(body.detected_pixels)   ? body.detected_pixels.slice(0, MAX_ARRAY_LEN)   : [],
detected_scripts:  Array.isArray(body.detected_scripts)  ? body.detected_scripts.slice(0, MAX_ARRAY_LEN)  : [],
data_layer_events: Array.isArray(body.data_layer_events) ? body.data_layer_events.slice(0, MAX_ARRAY_LEN) : [],
```

And sanitize `page_url` to strip potential XSS:
```typescript
page_url: typeof body.page_url === 'string'
  ? body.page_url.replace(/[<>"']/g, '').slice(0, 512)
  : '',
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/index.ts
git commit -m "security: harden reportAudit with payload limits and input sanitization"
```

---

## Task 6: Add origin validation to `getSiteConfig` (Finding #5)

**Files:**
- Modify: `functions/src/index.ts` (the `getSiteConfig` function)

- [ ] **Step 1: Add site URL validation**

After fetching the site document, validate the request Origin/Referer against the stored site URL. This prevents arbitrary enumeration of configs:

Add after `const siteData = siteDoc.data() as SiteDocument;`:

```typescript
// Optional origin check — log mismatches for monitoring but don't block
// (pigxel.js may be loaded in dev environments, iframes, etc.)
try {
  const origin = (req.headers.origin || req.headers.referer || '') as string;
  const siteUrl = siteData.url || '';
  if (origin && siteUrl) {
    const expectedHost = new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`).hostname;
    if (!origin.includes(expectedHost)) {
      functions.logger.warn('Origin mismatch', { siteId, origin, expectedHost });
    }
  }
} catch {
  // Malformed URL in site config — don't crash the request
}
```

This is monitor-only for now. Blocking would break legitimate use cases (localhost dev, staging).

- [ ] **Step 2: Commit**

```bash
git add functions/src/index.ts
git commit -m "security: add origin mismatch logging to getSiteConfig"
```

---

## Task 7: Restrict CORS on Cloud Functions (Finding #6)

**Files:**
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Replace `cors: true` with a CORS config**

For `getSiteConfig` and `reportAudit`, we can't restrict origins (they're called from arbitrary client sites). But we can:
1. Restrict `healthCheck` to same-origin only
2. Add explicit CORS headers instead of blanket `true`

For `healthCheck`, change:
```typescript
cors: true,
```
to:
```typescript
cors: ['https://pixie-b5d33.web.app', 'http://localhost:3000'],
```

For `getSiteConfig` and `reportAudit`, `cors: true` is correct since they serve arbitrary client domains. Add a comment explaining why:

```typescript
// CORS must allow all origins — pigxel.js runs on client websites
cors: true,
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/index.ts
git commit -m "security: restrict CORS on healthCheck, document CORS rationale"
```

---

## Task 8: Consolidate browser/scraping code (Finding #8, #9, #10)

**Files:**
- Modify: `functions/src/ai/browser.ts` (already the shared module)
- Modify: `functions/src/ai/scrapeUrl.ts` (remove duplicated code, import from browser.ts)
- Modify: `functions/src/index.ts` (remove duplicated code from `scanSite`, import from browser.ts)

- [ ] **Step 1: Ensure `browser.ts` exports everything needed**

`browser.ts` already exports `getBrowserLaunchOptions`, `scrapeAndMinify`, `scrapeAndAudit`. Verify it also exports `BLOCKED_DOMAINS` or make the route-blocking reusable:

Add to `browser.ts` (these are for **external callers** like `scanSite` in `index.ts` that manage their own browser instances; the internal `scrapeAndMinify`/`scrapeAndAudit` functions keep their own route blocking unchanged):

```typescript
export const BLOCKED_DOMAINS = [
  'googletagmanager.com',
  'google-analytics.com',
  // ... (existing list)
];

/**
 * Sets up route blocking for a Playwright page.
 * @param blockStylesheets - true for scan-only operations (scanSite), false for AI scraping
 */
export async function setupRouteBlocking(
  page: import('playwright-core').Page,
  blockStylesheets = false,
): Promise<void> {
  await page.route('**/*', async (route) => {
    const type = route.request().resourceType();
    const url  = route.request().url();
    if (
      type === 'image' || type === 'media' || type === 'font' ||
      (blockStylesheets && type === 'stylesheet') ||
      BLOCKED_DOMAINS.some((d) => url.includes(d))
    ) {
      await route.abort();
      return;
    }
    await route.continue();
  });
}
```

Note: `scanSite` in `index.ts` currently blocks stylesheets but `browser.ts` does not. The `blockStylesheets` parameter preserves this behavioral difference explicitly.
```

- [ ] **Step 2: Refactor `scrapeUrl.ts` to use `browser.ts`**

Replace the entire file with:
```typescript
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions/v2';
import { scrapeAndMinify } from './browser';

export interface ScrapeRequest { url: string }
export interface ScrapeResponse { success: boolean; title: string; minifiedHtml: string; error?: string }

export const scrapeAndMinifyUrl = onCall(
  { region: 'us-central1', timeoutSeconds: 60, memory: '1GiB' },
  async (request: CallableRequest<ScrapeRequest>): Promise<ScrapeResponse> => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in.');

    const { url } = request.data;
    if (typeof url !== 'string' || !url.trim()) {
      throw new HttpsError('invalid-argument', 'A valid "url" string is required.');
    }

    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    functions.logger.info('[scrapeUrl] Starting scrape', { uid: request.auth.uid, targetUrl });

    const { title, minifiedHtml } = await scrapeAndMinify(targetUrl).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpsError('internal', `Could not scrape the page: ${msg}`);
    });

    functions.logger.info('[scrapeUrl] Scrape complete', { targetUrl, htmlLength: minifiedHtml.length });
    return { success: true, title, minifiedHtml };
  }
);
```

- [ ] **Step 3: Refactor `scanSite` in `index.ts` to use `browser.ts`**

Remove: `findLocalChrome`, `LOCAL_CHROME_CANDIDATES`, `getBrowserLaunchOptions` from `index.ts`.
Remove: `import { chromium } from 'playwright-core'`, `import chromiumBin from '@sparticuz/chromium'`, `import * as fs from 'fs'`.
Remove: The `CONVERSION_KEYWORDS` and inline Playwright scraping logic.

Replace `scanSite` to use the shared browser module:
```typescript
import { getBrowserLaunchOptions, setupRouteBlocking } from './ai/browser';
import { chromium } from 'playwright-core';
```

And in `scanSite`, replace the browser launch block with:
```typescript
const launchOptions = await getBrowserLaunchOptions();
browser = await chromium.launch(launchOptions);
const page = await browser.newPage();
await page.setExtraHTTPHeaders({ 'User-Agent': 'Pigxel-Scanner/1.0' });
await setupRouteBlocking(page, true); // blockStylesheets=true for scan-only
```

- [ ] **Step 4: Build and verify**

```bash
cd functions && npm run build
```
Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add functions/src/ai/browser.ts functions/src/ai/scrapeUrl.ts functions/src/index.ts
git commit -m "refactor: consolidate browser/scraping code into shared browser.ts module"
```

---

## Task 9: Add unit tests for Cloud Functions (Finding #11)

**Files:**
- Create: `functions/src/__tests__/getSiteConfig.test.ts`
- Create: `functions/src/__tests__/reportAudit.test.ts`
- Modify: `functions/package.json` (add jest config)

- [ ] **Step 1: Add Jest configuration**

Add to `functions/package.json` scripts:
```json
"test": "jest --forceExit --detectOpenHandles",
"test:watch": "jest --watch"
```

Add jest config:
```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/src"],
  "testMatch": ["**/__tests__/**/*.test.ts"]
}
```

Add dev dependencies:
```bash
cd functions && npm install --save-dev jest ts-jest @types/jest
```

- [ ] **Step 2: Write `getSiteConfig` tests**

Create `functions/src/__tests__/getSiteConfig.test.ts`:

```typescript
import * as admin from 'firebase-admin';

// Mock firebase-admin before importing the function
jest.mock('firebase-admin', () => {
  const firestoreMock = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
  };
  return {
    initializeApp: jest.fn(),
    firestore: jest.fn(() => firestoreMock),
  };
});

// Tests for validation logic, status handling, error responses
describe('getSiteConfig', () => {
  test('returns 400 for missing site ID', async () => {
    // Test implementation
  });

  test('returns 400 for invalid site ID format', async () => {
    // Test XSS attempts like <script> in ID
  });

  test('returns 404 for non-existent site', async () => {
    // Mock Firestore returning empty doc
  });

  test('returns empty config for pending site', async () => {
    // Verify safety switch
  });

  test('returns full config for active site', async () => {
    // Verify active response shape
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd functions && npm test
```

- [ ] **Step 4: Commit**

```bash
git add functions/package.json functions/src/__tests__/
git commit -m "test: add unit tests for getSiteConfig and reportAudit"
```

---

## Task 10: Rename `config.example.json` (Finding #12)

**Files:**
- Rename: `config.example.json` → `config.schema.json`

- [ ] **Step 1: Rename the file**

```bash
mv config.example.json config.schema.json
```

- [ ] **Step 2: Update any references**

Search for references to `config.example.json` in docs and update them.

- [ ] **Step 3: Commit**

```bash
git add config.example.json config.schema.json
git commit -m "chore: rename config.example.json to config.schema.json (it's a JSON Schema)"
```

---

## Task 11: Fix Pixie/Pigxel naming inconsistency (Finding #13)

**Files:**
- Modify: `README.md` (change "Pixie" → "Pigxel")
- Modify: `test.html` (update references)
- Modify: `pigxel.js` (already uses "Pigxel" — good)

- [ ] **Step 1: Standardize on "Pigxel" in README.md**

Replace all instances of "Pixie" with "Pigxel" in `README.md`. The product name is "Pigxel" based on the package.json, repo name, and main script file.

Key replacements:
- `# 🧚 Pixie - AI Marketing Agent` → `# Pigxel - Marketing Tracking Agent`
- `pixie.js` references → `pigxel.js`
- All prose mentions of "Pixie"

- [ ] **Step 2: Update `test.html` references**

Replace "Pixie" with "Pigxel" in comments and UI text within `test.html`.

- [ ] **Step 3: Update `config.schema.json` title**

Change `"title": "Pixie Configuration Schema"` to `"title": "Pigxel Configuration Schema"`.

- [ ] **Step 4: Commit**

```bash
git add README.md test.html config.schema.json
git commit -m "chore: standardize product name to 'Pigxel' throughout codebase"
```

---

## Task 12: Sanitize `page_url` for XSS prevention (Finding #14)

**Files:**
- Modify: `functions/src/index.ts` (already addressed in Task 5)

This is covered by Task 5's `page_url` sanitization. No additional work needed.

- [ ] **Step 1: Verify Task 5 sanitization is in place**

Confirm `page_url` has `replace(/[<>"']/g, '')` applied.

---

## Task 13: Fix form submission handling (Finding #15)

**Files:**
- Modify: `pigxel.js` (the `handleDOMEvent` function)

- [ ] **Step 1: Replace setTimeout with navigator.sendBeacon pattern**

In `pigxel.js`, replace the form submission handling block (lines 426-434):

```javascript
if (eventType === 'submit') {
  event.preventDefault();
  trackEvent(eventConfig.platform, eventConfig.event_name);
  setTimeout(function () {
    if (matchedElement.submit) matchedElement.submit();
  }, 100);
}
```

With a more robust approach using `navigator.sendBeacon` as fallback:

```javascript
if (eventType === 'submit') {
  event.preventDefault();
  trackEvent(eventConfig.platform, eventConfig.event_name);
  // Use a shorter timeout. trackEvent pushes to dataLayer synchronously
  // or calls gtag/fbq which queue synchronously. The 100ms is a safety
  // margin for image pixel transports (fbq) that need time to fire.
  // If the form element has a programmatic submit(), use it;
  // otherwise dispatch a new submit event to preserve other handlers.
  setTimeout(function () {
    if (typeof matchedElement.requestSubmit === 'function') {
      matchedElement.requestSubmit();
    } else if (typeof matchedElement.submit === 'function') {
      matchedElement.submit();
    }
  }, 150);
}
```

Key improvements:
- Use `requestSubmit()` (modern browsers) which fires submit handlers, falling back to `submit()`
- Keep `preventDefault` + delay because `fbq('track', ...)` uses image pixels that can be aborted by navigation
- 150ms is enough for the pixel request to initiate; the browser will complete it via keepalive

- [ ] **Step 2: Commit**

```bash
git add pigxel.js
git commit -m "fix: remove fragile form submission delay, rely on sync tracking calls"
```

---

## Task 14: Document history patching risks (Finding #16)

**Files:**
- Modify: `pigxel.js` (add defensive comments and guard)

- [ ] **Step 1: Add safety guard to history patching**

In `patchHistoryForSPA()`, add a guard to avoid double-patching and a comment about the risk:

```javascript
function patchHistoryForSPA() {
  try {
    // Guard: only patch once (prevents conflicts if pigxel.js loads twice)
    if (history.__pigxel_patched) return;
    history.__pigxel_patched = true;

    var _push = history.pushState.bind(history);
    var _replace = history.replaceState.bind(history);
    // ... rest unchanged
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add pigxel.js
git commit -m "fix: guard history.pushState patching against double-application"
```

---

## Task 15: Add CI/CD pipeline (Finding #17)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create GitHub Actions CI workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  functions:
    name: Functions — Lint & Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: functions
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: functions/package-lock.json
      - run: npm ci
      - run: npm run build
      - run: npm test

  dashboard:
    name: Dashboard — Lint & Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: dashboard
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: dashboard/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: test
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: test
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: test
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: test
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: test
          NEXT_PUBLIC_FIREBASE_APP_ID: test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for functions and dashboard"
```

---

## Task 16: Remove compiled JS from repo (Finding #18)

**Files:**
- Delete: `functions/lib/` directory

- [ ] **Step 1: Verify `functions/lib/` is in `.gitignore`**

It is: line 10 of `.gitignore` has `functions/lib/`.

- [ ] **Step 2: Remove the compiled files**

```bash
rm -rf functions/lib/
```

- [ ] **Step 3: Commit**

```bash
git rm -r --cached functions/lib/ 2>/dev/null; git add -A functions/lib/
git commit -m "chore: remove compiled JS artifacts from repo (built on deploy)"
```

---

## Task 17: Deduplicate `scanSite` and AI scanning (Finding #19)

**Files:**
- Already addressed by Task 8 (consolidating browser code)

The `scanSite` function in `index.ts` provides a different capability (conversion keyword scanning) than the AI pipeline's `scrapeAndAudit`. After Task 8, they share the same browser launch + route blocking code, which eliminates the duplication. No additional work needed.

- [ ] **Step 1: Verify Task 8 is complete and `scanSite` uses shared browser module**

---

## Task 18: Rate limiting (Finding #20)

Folded into Task 5 — rate-limit headers are added to `reportAudit` as part of the hardening work. `getSiteConfig` already has aggressive cache headers (5min browser / 10min CDN) which serve as implicit rate limiting.

For production, consider enabling Firebase App Check or putting Cloud Functions behind Cloudflare.

---

## Task 19: Add React error boundary to dashboard (Finding #21)

**Files:**
- Create: `dashboard/components/error-boundary.tsx`
- Modify: `dashboard/app/layout.tsx`

- [ ] **Step 1: Create error boundary component**

Create `dashboard/components/error-boundary.tsx`:

```tsx
'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Pigxel] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

- [ ] **Step 2: Wrap layout children with ErrorBoundary**

In `dashboard/app/layout.tsx`, wrap `{children}` inside `<ErrorBoundary>`:

```tsx
import { ErrorBoundary } from '@/components/error-boundary';

// Inside the return:
<FirebaseProvider>
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
  <Toaster theme="light" position="bottom-right" richColors closeButton />
</FirebaseProvider>
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/components/error-boundary.tsx dashboard/app/layout.tsx
git commit -m "feat: add React error boundary to prevent full-app crashes"
```

---

## Task 20: Clean up root markdown files (Finding #22)

**Files:**
- Delete: `AUTH_FIX.md`, `CYBER_SAAS_REDESIGN.md`, `DASHBOARD_IMPLEMENTATION.md`, `IMPLEMENTATION_SUMMARY.md`, `QA_REPORT.md`, `QA_REPORT_EXTENDED.md`, `QA_REPORT_VISUAL.md`, `REDESIGN_COMPLETE.md`, `STATUS.md`, `COMPLETE_SYSTEM_STATUS.md`
- Keep: `README.md`, `API.md`, `QUICKSTART.md`, `TESTING.md`, `FIREBASE_SETUP.md`

- [ ] **Step 1: Move implementation logs to an archive directory**

```bash
mkdir -p docs/archive
mv AUTH_FIX.md CYBER_SAAS_REDESIGN.md DASHBOARD_IMPLEMENTATION.md IMPLEMENTATION_SUMMARY.md QA_REPORT.md QA_REPORT_EXTENDED.md QA_REPORT_VISUAL.md REDESIGN_COMPLETE.md STATUS.md COMPLETE_SYSTEM_STATUS.md docs/archive/
```

- [ ] **Step 2: Commit**

```bash
git add AUTH_FIX.md CYBER_SAAS_REDESIGN.md DASHBOARD_IMPLEMENTATION.md IMPLEMENTATION_SUMMARY.md QA_REPORT.md QA_REPORT_EXTENDED.md QA_REPORT_VISUAL.md REDESIGN_COMPLETE.md STATUS.md COMPLETE_SYSTEM_STATUS.md docs/archive/
git commit -m "chore: move implementation logs to docs/archive, clean up project root"
```

---

## Task 21: Parameterize test HTML files (Finding #23)

**Files:**
- Modify: `test.html`

- [ ] **Step 1: Make the API URL configurable via URL params**

Replace the hardcoded script tag in `test.html`:

```html
<script
  src="http://localhost:8000/pigxel.js?id=test-ndwxvmjz&debug=true"
  data-api="http://127.0.0.1:5001/pixie-dev/us-central1"
></script>
```

With a dynamic version:
```html
<script>
  // Allow URL params to override defaults for different environments
  var params = new URLSearchParams(window.location.search);
  var scriptHost = params.get('script_host') || 'http://localhost:8000';
  var apiHost = params.get('api_host') || 'http://127.0.0.1:5001/pixie-dev/us-central1';
  var clientId = params.get('client_id') || 'test-ndwxvmjz';

  var s = document.createElement('script');
  s.src = scriptHost + '/pigxel.js?id=' + clientId + '&debug=true';
  s.setAttribute('data-api', apiHost);
  document.head.appendChild(s);
</script>
```

- [ ] **Step 2: Update the site ID display to be dynamic**

Replace:
```javascript
siteIdDisplay.textContent = 'id: test-ndwxvmjz';
```
With:
```javascript
var displayId = new URLSearchParams(window.location.search).get('client_id') || 'test-ndwxvmjz';
siteIdDisplay.textContent = 'id: ' + displayId;
```

- [ ] **Step 3: Commit**

```bash
git add test.html
git commit -m "chore: parameterize test.html for different environments"
```

---

## Task 22: Review Firestore indexes (Finding #24)

**Review-only — no changes needed.** Both indexes (`owner_id + createdAt`, `owner_id + status`) match the dashboard's query patterns for listing and filtering a user's sites.

---

## Summary of Manual Actions Required

After completing all automated tasks, the following manual actions must be performed by the project owner:

1. **Rotate Firebase service account key** (Task 2, Step 4)
2. **Rotate OpenAI API key** (Task 3, Step 2)
3. **Consider enabling Firebase App Check** for production rate limiting
4. **Review the Firebase project `pixie-b5d33`** for any unauthorized access that may have occurred while the service account key was exposed
