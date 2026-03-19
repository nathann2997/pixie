# Pixie/Pigxel QA Report

**Date:** February 23, 2025  
**Environment:** localhost:3000, Firebase emulators (Auth: 9099, Firestore: 8080, Functions: 5001)  
**Test Method:** Playwright E2E tests + code analysis

---

## Executive Summary

All 20 QA tests **passed**. The Pixie marketing tracking SaaS app functions correctly across authentication, dashboard, add-site flow, and site setup. A few minor observations and one design deviation are noted below.

---

## 1. Authentication Page (http://localhost:3000/login)

| Test | Result | Notes |
|------|--------|-------|
| Page loads correctly | ✅ Pass | URL resolves, page renders |
| Logo/branding visible | ✅ Pass | Pigxel logo (pigxel.jpg) displayed |
| Google sign-in button | ✅ Pass | "Continue with Google" with Google icon |
| Email/password form with labels | ✅ Pass | "Email address" and "Password" labels present |
| Empty fields validation | ✅ Pass | HTML5 `required` prevents submit |
| Wrong credentials error | ✅ Pass | Shows "Incorrect email or password. Please try again." — **user-friendly, no Firebase codes** |
| Sign-up toggle | ✅ Pass | "Sign up free" switches to "Create your workspace" form |

**Visual observation:** The login page uses a **light theme** (bg-slate-50, white card). The `.cursorrules` specify "Dark mode only" and `bg-slate-950`. This is a design deviation — the auth page does not follow the dark-mode rule.

---

## 2. Sign In with Test Account

| Test | Result | Notes |
|------|--------|-------|
| Sign in test@pixie.com / test123456 | ✅ Pass | If account doesn't exist, tests fall back to sign-up and create it |

**Note:** The test user may not exist in a fresh Firebase emulator. The QA suite handles this by attempting sign-up when sign-in fails. Ensure Firebase emulators are running for auth to work.

---

## 3. Dashboard / My Sites Page (http://localhost:3000/dashboard)

| Test | Result | Notes |
|------|--------|-------|
| Redirect to /dashboard after sign-in | ✅ Pass | Auth redirect works |
| Sidebar nav: Setup, Events, Pulse, Settings, Help | ✅ Pass | All items visible when a site is selected |
| New project button | ✅ Pass | "New project" button present |
| Site switcher | ✅ Pass | Dropdown shows sites, "Add new site" option |

**Label note:** The page title is "Workspace" rather than "My Sites" as mentioned in `.cursorrules` navigation labels. The sidebar uses "Help & Setup" for the docs link.

---

## 4. Add Site Modal

| Test | Result | Notes |
|------|--------|-------|
| New project opens modal | ✅ Pass | "New project block" heading, Project name and Website URL fields |
| Create site and redirect | ✅ Pass | Submitting "QA Test Site" + "https://qa-test.example.com" creates site and redirects to setup page |

**Modal copy:** Uses "New project block" and "Project name" — slightly different from "Add Site" terminology in the rules but consistent with the rest of the UI.

---

## 5. Site Setup Page (/dashboard/[siteId])

| Test | Result | Notes |
|------|--------|-------|
| Site name, status badge, URL | ✅ Pass | Header shows name, status (Live/Setup/Paused), and hostname link |
| Script install section | ✅ Pass | "Install the Pigxel script" with code block |
| Copy button | ✅ Pass | Copy button for script tag |
| Analytics IDs form | ✅ Pass | GA4 (Google Analytics 4) and Meta Pixel (Facebook / Meta Pixel) fields |
| Status toggle | ✅ Pass | Live/Paused switch (disabled when status is "pending") |
| 3-dot menu (Edit/Delete) | ✅ Pass | "Edit project" and "Delete project" options |

---

## Test Artifacts

- **Playwright config:** `dashboard/playwright.config.ts`
- **Test file:** `dashboard/e2e/qa.spec.ts`
- **Run tests:** `cd dashboard && npm run test:e2e`

---

## Findings Summary

### Working Correctly
- Authentication flow (sign-in, sign-up, error handling)
- User-friendly error messages (no raw Firebase codes)
- Dashboard layout, site cards, sidebar navigation
- Add site modal and site creation
- Site setup page: script install, analytics form, status toggle, edit/delete menu

### Observations
1. **Light mode on login:** Auth page uses light theme; `.cursorrules` specify dark mode only.
2. **Page title:** Dashboard shows "Workspace" instead of "My Sites".
3. **Test user:** If `test@pixie.com` doesn't exist in the emulator, the suite creates it via sign-up.

### No Critical Bugs Found

---

## Recommendations

1. Consider aligning the login page with dark mode (`bg-slate-950`, `class="dark"` on `<html>`) per `.cursorrules`.
2. Optionally rename "Workspace" to "My Sites" for consistency with navigation labels.
3. Keep the Playwright suite in CI to catch regressions.
