# Pixie/Pigxel Extended QA Report

**Date:** February 23, 2025  
**Environment:** localhost:3000, Firebase emulators (Auth: 9099, Firestore: 8080, Functions: 5001)  
**Test Site:** test-ndwxvmjz  
**Test Account:** test@pixie.com / test123456

---

## Executive Summary

**26/26 tests passed.** All feature groups (A–F) work correctly. One bug was found and fixed: the `/conversions` redirect was broken due to Next.js 15+ `params` being a Promise.

---

## A. Site Setup: Edit & Delete Site

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | 3-dot menu opens | ✅ Pass | Edit project and Delete project options visible |
| 2 | Edit modal opens with visible labels | ✅ Pass | "Edit site" heading, Website name, Website URL labels visible. No white-on-white issues |
| 3 | Change name to "QA Test Renamed" and save | ✅ Pass | Name updates and persists |
| 4 | Rename back to "QA Test Site" | ✅ Pass | Name reverts correctly |
| 5 | Delete modal opens with correct colors | ✅ Pass | Modal shows "Delete site", warning text, confirmation field. Text readable (not white on white) |
| 6 | Type site name → Delete button enabled | ✅ Pass | Delete button disabled until exact site name typed |
| 7 | Close modal without deleting | ✅ Pass | Modal closes, site remains |

**Visual:** Edit and Delete modals use white card background (`GlassCard`), dark text (`text-slate-900`, `text-slate-700`). Labels and content are readable.

---

## B. Events Page

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Page loads, Library and Builder tabs | ✅ Pass | Two tabs visible |
| 2 | Add event modal opens | ✅ Pass | "Event details" step visible |
| 3 | Add event: GA4, suggestion, trigger | ✅ Pass | Event name, platform (GA4 default), trigger text; event appears in Library |
| 4 | Search filter works | ✅ Pass | Typing "nonexistent123" shows "No results" |
| 5 | Builder tab: EventChat and Scan my site | ✅ Pass | Shows either "Scan your site" CTA or "Event Builder" / "Opportunities found" when scan results exist |

**Note:** When the site has existing scan suggestions, the "Scan my site" CTA is replaced by "Opportunities found". Both states are valid.

---

## C. Pulse / Health Page

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Page loads | ✅ Pass | "Pulse" heading visible |
| 2 | Audit status card appears | ✅ Pass | "Tracking audit" section with script/pixel status |
| 3 | AI Analysis and tracking plan sections | ✅ Pass | "AI Site Analysis" and "AI Tracking Plan" visible |
| 4 | Analyse button | ✅ Pass | "Analyse my site" button present and enabled |

---

## D. Settings Page

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Page loads | ✅ Pass | "Settings" heading visible |
| 2 | Profile section with display name | ✅ Pass | Display name field, email (read-only) |
| 3 | Password change section | ✅ Pass | Shown for email/password users (test@pixie.com) |
| 4 | Danger zone / Delete account | ✅ Pass | "Danger zone" section with "Delete account" button |
| 5 | Change display name and save | ✅ Pass | Name updates, "Saved!" feedback shown |

---

## E. Help & Setup Guide

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Page loads | ✅ Pass | "Help and setup guide" heading visible |
| 2 | Table of contents / navigation | ✅ Pass | "On this page" sidebar with links (Install the script, etc.) |
| 3 | Install script section | ✅ Pass | "Install the Pigxel script" section with code block |
| 4 | Platform guides | ✅ Pass | Shopify, WordPress, Webflow, Squarespace, Wix, Any website |

---

## F. /conversions Redirect

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Redirects to /events | ✅ Pass | `/dashboard/test-ndwxvmjz/conversions` → `/dashboard/test-ndwxvmjz/events` |

**Bug fixed:** The conversions page was redirecting to `/dashboard/undefined/events` because Next.js 15+ passes `params` as a Promise. The page was updated to `async` and `await params` before use.

---

## Bugs Fixed During QA

1. **Conversions redirect (F):** `params.siteId` was `undefined` because `params` is a Promise in Next.js 15+. Fixed by making the page `async` and awaiting `params`.

---

## Visual / UX Notes

- **Modals:** Edit and Delete modals use white backgrounds with dark text. No contrast issues observed.
- **Add Event modal:** Uses `text-slate-200` for some labels; on white card this may reduce contrast. Consider `text-slate-700` for better readability.
- **Docs page:** Mix of light and dark styling; "On this page" nav uses `text-slate-500` on light background.

---

## Test Artifacts

- **Tests:** `dashboard/e2e/qa-extended.spec.ts`
- **Run:** `cd dashboard && npx playwright test e2e/qa-extended.spec.ts`

---

## Recommendations

1. Consider updating Add Event modal labels from `text-slate-200` to `text-slate-700` for better contrast on white.
2. Keep the conversions redirect fix in place for Next.js 15+ compatibility.
3. Add `qa-extended` to CI alongside the base `qa.spec.ts` suite.
