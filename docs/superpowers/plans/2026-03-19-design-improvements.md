# Pigxel Design Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the high-impact and medium-impact design recommendations from the principal product designer review, improving trust signals, onboarding clarity, navigation defaults, and interaction polish.

**Architecture:** Primarily frontend changes (Next.js dashboard) with one lightweight backend addition (Task 1: verify installation Cloud Function). Each task is independent and commits separately. Tasks are ordered by user impact: trust/confidence first, then navigation/flow, then polish.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Lucide icons, Sonner toasts, Firebase Firestore listeners

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `dashboard/components/dashboard/verify-installation.tsx` | Create | "Verify Installation" button + live check UI |
| `dashboard/app/dashboard/[siteId]/page.tsx` | Modify | Add verify button, fix duplicate Go Live CTA, add confirmation dialogs |
| `dashboard/components/dashboard/go-live-dialog.tsx` | Create | Confirmation dialog for toggling tracking on/off |
| `dashboard/components/layouts/sidebar-layout.tsx` | Modify | Fix mobile sidebar slide animation, add keyboard nav to site switcher |
| `dashboard/app/globals.css` | Modify | Add slide-in keyframe for mobile sidebar |
| `dashboard/app/dashboard/page.tsx` | Modify | Add "last activity" signal to project cards |
| `dashboard/app/dashboard/[siteId]/events/page.tsx` | Modify | Add platform brand colors to filter pills, add keyboard shortcut to search |
| `dashboard/components/dashboard/onboarding-checklist.tsx` | Create | Persistent onboarding checklist widget |
| `dashboard/app/login/page.tsx` | Modify | Add trust copy below login card |

---

## Task 1: Verify Installation Button

The single highest-value UX improvement. Users need real-time confirmation that the script is working after installation.

**Files:**
- Create: `dashboard/components/dashboard/verify-installation.tsx`
- Modify: `dashboard/app/dashboard/[siteId]/page.tsx`

- [ ] **Step 1: Create the VerifyInstallation component**

Create `dashboard/components/dashboard/verify-installation.tsx`:

```tsx
"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, Search } from "lucide-react";

interface VerifyResult {
  scriptDetected: boolean;
  detectedPixels: string[];
  pageUrl: string;
}

interface VerifyInstallationProps {
  siteId: string;
  siteUrl: string;
}

export function VerifyInstallation({ siteId, siteUrl }: VerifyInstallationProps) {
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "failed">("idle");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setStatus("checking");
    setError(null);
    setResult(null);

    try {
      const verify = httpsCallable<
        { siteId: string; url: string },
        { success: boolean; scriptDetected: boolean; detectedPixels: string[]; pageUrl: string }
      >(functions, "verifySiteInstallation");

      const res = await verify({ siteId, url: siteUrl });

      if (res.data.success && res.data.scriptDetected) {
        setResult({
          scriptDetected: true,
          detectedPixels: res.data.detectedPixels,
          pageUrl: res.data.pageUrl,
        });
        setStatus("success");
      } else {
        setResult({
          scriptDetected: false,
          detectedPixels: [],
          pageUrl: res.data.pageUrl || siteUrl,
        });
        setStatus("failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Try again.");
      setStatus("failed");
    }
  };

  if (status === "idle") {
    return (
      <button
        onClick={handleVerify}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-500 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        Verify installation
      </button>
    );
  }

  if (status === "checking") {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Checking {new URL(siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`).hostname}...</span>
      </div>
    );
  }

  if (status === "success" && result) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 mt-3">
        <div className="flex items-center gap-2 mb-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="text-sm font-medium text-emerald-700">Script detected</span>
        </div>
        {result.detectedPixels.length > 0 && (
          <p className="text-xs text-emerald-600 ml-6">
            Found: {result.detectedPixels.join(", ")}
          </p>
        )}
        <button
          onClick={() => setStatus("idle")}
          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium ml-6 mt-1"
        >
          Check again
        </button>
      </div>
    );
  }

  // failed
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 mt-3">
      <div className="flex items-center gap-2 mb-1.5">
        <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-sm font-medium text-amber-700">
          {error || "Script not detected yet"}
        </span>
      </div>
      <p className="text-xs text-amber-600 ml-6">
        Make sure the script tag is in your site&apos;s &lt;head&gt; and the page has been deployed.
      </p>
      <button
        onClick={handleVerify}
        className="text-xs text-amber-600 hover:text-amber-700 font-medium ml-6 mt-1"
      >
        Try again
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add VerifyInstallation to the Setup page**

In `dashboard/app/dashboard/[siteId]/page.tsx`, add the import at the top with other imports:

```typescript
import { VerifyInstallation } from "@/components/dashboard/verify-installation";
```

Then add the component inside the "Install the Pigxel script" card, after the closing `</div>` of the code block section (after the `!isScriptInstalled &&` paragraph around line 340), before the card's closing `</div>`:

```tsx
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <VerifyInstallation siteId={siteId} siteUrl={site.url} />
                </div>
```

- [ ] **Step 3: Create the backend Cloud Function stub**

Create the callable function `verifySiteInstallation` in `functions/src/index.ts`. This checks the site's latest audit report from Firestore rather than doing a live scrape (keeps it fast):

No new imports needed — the file already imports `* as functions from 'firebase-functions/v2'`, `HttpsError`, and `const db = admin.firestore()`.

Add the function (follows existing `scanSite` pattern):
```typescript
export const verifySiteInstallation = functions.https.onCall(
  { region: "us-central1", timeoutSeconds: 10 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");

    const { siteId } = request.data;
    if (typeof siteId !== "string" || !siteId.trim()) {
      throw new HttpsError("invalid-argument", "siteId is required.");
    }

    const siteDoc = await db.collection("sites").doc(siteId).get();
    if (!siteDoc.exists) {
      throw new HttpsError("not-found", "Site not found.");
    }

    const siteData = siteDoc.data()!;

    // Check ownership
    if (siteData.owner_id !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Not your site.");
    }

    const audit = siteData.pixel_audit;
    if (!audit || !audit.script_installed) {
      return {
        success: true,
        scriptDetected: false,
        detectedPixels: [],
        pageUrl: siteData.url || "",
      };
    }

    return {
      success: true,
      scriptDetected: true,
      detectedPixels: audit.detected_pixels || [],
      pageUrl: audit.page_url || siteData.url || "",
    };
  }
);
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/components/dashboard/verify-installation.tsx dashboard/app/dashboard/[siteId]/page.tsx functions/src/index.ts
git commit -m "feat: add Verify Installation button for real-time script detection feedback"
```

---

## Task 2: Go Live Confirmation Dialogs

The master switch needs ceremony — going live starts collecting real data, pausing means lost conversions.

**Files:**
- Create: `dashboard/components/dashboard/go-live-dialog.tsx`
- Modify: `dashboard/app/dashboard/[siteId]/page.tsx`

- [ ] **Step 1: Create the GoLiveDialog component**

Create `dashboard/components/dashboard/go-live-dialog.tsx`:

```tsx
"use client";

import {
  GlassModal,
  GlassModalContent,
  GlassModalCard,
  GlassModalTitle,
  GlassModalDescription,
} from "@/components/ui/glass-modal";
import { NeonButton } from "@/components/ui/neon-button";
import { Button } from "@/components/ui/button";
import { Zap, Pause, BarChart2, Share2 } from "lucide-react";

interface GoLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "activate" | "pause";
  onConfirm: () => void;
  loading: boolean;
  pixelConfig: {
    ga4?: string;
    meta?: string;
    tiktok?: string;
    linkedin?: string;
    google_ads?: string;
  };
  eventCount: number;
}

export function GoLiveDialog({
  open,
  onOpenChange,
  action,
  onConfirm,
  loading,
  pixelConfig,
  eventCount,
}: GoLiveDialogProps) {
  const connectedPlatforms = [
    pixelConfig.ga4 && `GA4 (${pixelConfig.ga4})`,
    pixelConfig.meta && `Meta Pixel (${pixelConfig.meta})`,
    pixelConfig.tiktok && `TikTok (${pixelConfig.tiktok})`,
    pixelConfig.linkedin && `LinkedIn (${pixelConfig.linkedin})`,
    pixelConfig.google_ads && `Google Ads (${pixelConfig.google_ads})`,
  ].filter(Boolean);

  if (action === "activate") {
    return (
      <GlassModal open={open} onOpenChange={onOpenChange}>
        <GlassModalContent>
          <GlassModalCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200">
                <Zap className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <GlassModalTitle className="text-base font-semibold text-slate-900">
                  Go live with tracking?
                </GlassModalTitle>
                <GlassModalDescription className="text-xs text-slate-500 mt-0.5">
                  Pigxel will start forwarding events to your connected platforms.
                </GlassModalDescription>
              </div>
            </div>

            {connectedPlatforms.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Connected platforms</p>
                <div className="space-y-1.5">
                  {connectedPlatforms.map((p) => (
                    <div key={p} className="flex items-center gap-2 text-sm text-slate-700">
                      <BarChart2 className="h-3.5 w-3.5 text-slate-400" />
                      {p}
                    </div>
                  ))}
                </div>
                {eventCount > 0 && (
                  <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                    {eventCount} tracking rule{eventCount !== 1 ? "s" : ""} configured
                  </p>
                )}
              </div>
            )}

            {connectedPlatforms.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
                <p className="text-xs text-amber-700">
                  No platforms connected yet. Events will be tracked but not forwarded anywhere.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
              >
                Cancel
              </Button>
              <NeonButton
                onClick={onConfirm}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {loading ? "Activating..." : "Go live"}
              </NeonButton>
            </div>
          </GlassModalCard>
        </GlassModalContent>
      </GlassModal>
    );
  }

  // Pause dialog
  return (
    <GlassModal open={open} onOpenChange={onOpenChange}>
      <GlassModalContent>
        <GlassModalCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
              <Pause className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <GlassModalTitle className="text-base font-semibold text-slate-900">
                Pause tracking?
              </GlassModalTitle>
              <GlassModalDescription className="text-xs text-slate-500 mt-0.5">
                Event forwarding will stop immediately.
              </GlassModalDescription>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
            <p className="text-xs text-amber-700">
              Events that happen while paused will not be captured. You can resume tracking at any time.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
            >
              Keep live
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-white border-0"
            >
              {loading ? "Pausing..." : "Pause tracking"}
            </Button>
          </div>
        </GlassModalCard>
      </GlassModalContent>
    </GlassModal>
  );
}
```

- [ ] **Step 2: Wire the dialog into the Setup page**

In `dashboard/app/dashboard/[siteId]/page.tsx`:

Add import:
```typescript
import { GoLiveDialog } from "@/components/dashboard/go-live-dialog";
```

Add state (near other useState declarations around line 68):
```typescript
const [goLiveOpen, setGoLiveOpen] = useState(false);
const [goLiveAction, setGoLiveAction] = useState<"activate" | "pause">("activate");
```

Replace the `handleStatusToggle` function (lines 96-107) with:
```typescript
  const handleStatusToggle = (checked: boolean) => {
    setGoLiveAction(checked ? "activate" : "pause");
    setGoLiveOpen(true);
  };

  const confirmStatusToggle = async () => {
    if (!site || updating) return;
    setUpdating(true);
    try {
      const newStatus = goLiveAction === "activate" ? "active" : "paused";
      await updateDoc(doc(db, "sites", siteId), { status: newStatus });
      toast.success(goLiveAction === "activate" ? "Tracking is now live" : "Tracking paused");
      setGoLiveOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };
```

Add the dialog component right after `<EditSiteModal .../>` (around line 179):
```tsx
          <GoLiveDialog
            open={goLiveOpen}
            onOpenChange={setGoLiveOpen}
            action={goLiveAction}
            onConfirm={confirmStatusToggle}
            loading={updating}
            pixelConfig={config.pixels ?? {}}
            eventCount={config.events?.length ?? 0}
          />
```

- [ ] **Step 3: Remove the duplicate inline "Go Live" button**

In the same file, remove the `readyToGoLive` conditional block (lines 218-234) — the entire block starting with `{readyToGoLive && (` and ending with its closing `)}`. Replace it with a simpler notice without a button:

```tsx
                {readyToGoLive && (
                  <div className="flex items-center gap-2 mt-3">
                    <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">
                      {isScriptInstalled
                        ? "Script detected — flip the switch to go live."
                        : "Install the script on your site, then go live. Pigxel will auto-detect your analytics."}
                    </p>
                  </div>
                )}
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/components/dashboard/go-live-dialog.tsx dashboard/app/dashboard/[siteId]/page.tsx
git commit -m "feat: add confirmation dialogs for Go Live / Pause tracking toggle"
```

---

## Task 3: Mobile Sidebar Slide Animation

The sidebar should slide in from the left, not fade in.

**Files:**
- Modify: `dashboard/app/globals.css`
- Modify: `dashboard/components/layouts/sidebar-layout.tsx`

- [ ] **Step 1: Add slide-in-left keyframe to globals.css**

In `dashboard/app/globals.css`, inside the `@theme` block (after the `fade-in` keyframe around line 11), add:

```css
  @keyframes slide-in-left {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
```

And in the `@layer utilities` section (after `animate-fade-in` around line 93), add:

```css
  .animate-slide-in-left {
    animation: slide-in-left 0.2s ease-out both;
  }
```

- [ ] **Step 2: Replace animation class on mobile sidebar**

In `dashboard/components/layouts/sidebar-layout.tsx`, line 453, change:

```tsx
<aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 lg:hidden flex flex-col animate-fade-in relative">
```

to:

```tsx
<aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 lg:hidden flex flex-col animate-slide-in-left relative">
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/app/globals.css dashboard/components/layouts/sidebar-layout.tsx
git commit -m "fix: mobile sidebar slides in from left instead of fade"
```

---

## Task 4: Last Activity Signal on Project Cards

Users managing multiple sites need to see at a glance if a site is collecting data or silently broken.

**Files:**
- Modify: `dashboard/app/dashboard/page.tsx`

- [ ] **Step 1: Extend the Site interface with last_event_at**

In `dashboard/app/dashboard/page.tsx`, update the `Site` interface (around line 15) to add:

```typescript
  last_event_at?: { seconds: number; nanoseconds: number } | null;
```

- [ ] **Step 2: Add a relative time helper**

Add this helper function after the `getConnectedPlatforms` function (around line 34):

```typescript
function timeAgo(timestamp: { seconds: number } | null | undefined): string | null {
  if (!timestamp) return null;
  const now = Date.now();
  const then = timestamp.seconds * 1000;
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
```

- [ ] **Step 3: Show last activity in the ProjectCard**

In the `ProjectCard` component, after the platforms/event count section (around line 85, right before the closing `</>` of the `platforms.length > 0` branch), add:

Replace the existing platforms display block. Find this section in the card (the `flex items-center justify-between gap-3` div, around lines 69-92). After the platforms `<div>` and before `<ArrowRight`, add a last-activity line.

Specifically, replace the entire bottom section of ProjectCard (lines 69-93) with:

```tsx
      {/* Connected data sources + last activity + arrow */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {platforms.length > 0 ? (
            <>
              {platforms.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-600"
                >
                  {p}
                </span>
              ))}
              {eventCount > 0 && (
                <span className="text-xs text-slate-400">
                  · {eventCount} tracked
                </span>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400">No data sources yet</p>
          )}
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>

      {/* Last activity */}
      {site.status === "active" && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            {timeAgo(site.last_event_at)
              ? <>Last event <span className="text-slate-500 font-medium">{timeAgo(site.last_event_at)}</span></>
              : "No events received yet"}
          </p>
        </div>
      )}
    </button>
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/app/dashboard/page.tsx
git commit -m "feat: show last activity timestamp on project cards"
```

---

## Task 5: Platform Brand Colors on Event Filter Pills

Create instant visual association for multi-platform management.

**Files:**
- Modify: `dashboard/app/dashboard/[siteId]/events/page.tsx`

- [ ] **Step 1: Add platform color map**

In `dashboard/app/dashboard/[siteId]/events/page.tsx`, after the `ALL_PLATFORMS` array (around line 105), add:

```typescript
const PLATFORM_COLORS: Record<string, { active: string; count: string }> = {
  all:      { active: "bg-rose-50 border-rose-200 text-rose-600",      count: "bg-rose-100 text-rose-600" },
  ga4:      { active: "bg-blue-50 border-blue-200 text-blue-600",      count: "bg-blue-100 text-blue-600" },
  meta:     { active: "bg-indigo-50 border-indigo-200 text-indigo-600", count: "bg-indigo-100 text-indigo-600" },
  both:     { active: "bg-violet-50 border-violet-200 text-violet-600", count: "bg-violet-100 text-violet-600" },
  tiktok:   { active: "bg-slate-100 border-slate-400 text-slate-800",  count: "bg-slate-200 text-slate-700" },
  linkedin: { active: "bg-sky-50 border-sky-200 text-sky-600",         count: "bg-sky-100 text-sky-600" },
};
```

- [ ] **Step 2: Use platform colors in filter pills**

In the platform filter pills section (around lines 338-365), replace the `className` on the button:

Change:
```tsx
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                            isActive
                              ? "bg-rose-50 border-rose-200 text-rose-600"
                              : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300"
                          )}
```

To:
```tsx
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                            isActive
                              ? (PLATFORM_COLORS[p.key]?.active ?? "bg-rose-50 border-rose-200 text-rose-600")
                              : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300"
                          )}
```

And update the count badge similarly:
Change:
```tsx
                            isActive ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"
```

To:
```tsx
                            isActive ? (PLATFORM_COLORS[p.key]?.count ?? "bg-rose-100 text-rose-600") : "bg-slate-100 text-slate-500"
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/app/dashboard/[siteId]/events/page.tsx
git commit -m "feat: use platform brand colors for event filter pills"
```

---

## Task 6: Search Keyboard Shortcut on Events Page

For power users managing dozens of events, `/` to focus search is expected.

**Files:**
- Modify: `dashboard/app/dashboard/[siteId]/events/page.tsx`

- [ ] **Step 1: Add useRef and keyboard listener**

In `dashboard/app/dashboard/[siteId]/events/page.tsx`, add `useRef` to the React import (line 3):

```typescript
import { useEffect, useState, useMemo, useRef } from "react";
```

Add a ref for the search input after the state declarations (around line 121):

```typescript
  const searchRef = useRef<HTMLInputElement>(null);
```

Add a keyboard shortcut effect after the Firestore listener effect (around line 135):

```typescript
  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const active = document.activeElement;
        if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA" || active?.getAttribute("contenteditable")) return;
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
```

- [ ] **Step 2: Wire the ref to the input and add hint**

Find the search input element (around line 323). Add the ref and a keyboard hint:

Change:
```tsx
                    <input
                      type="text"
                      placeholder="Search events…"
```

To:
```tsx
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="Search events…"
```

After the search input's closing `/>` and before the clear button conditional, add:

```tsx
                    {!searchQuery && (
                      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                        /
                      </kbd>
                    )}
```

And update the clear button's conditional to also hide the kbd hint — change `{searchQuery && (` to remain as-is (the kbd shows when no query, clear shows when there is a query — they naturally alternate).

- [ ] **Step 3: Commit**

```bash
git add dashboard/app/dashboard/[siteId]/events/page.tsx
git commit -m "feat: add '/' keyboard shortcut to focus event search"
```

---

## Task 7: Onboarding Checklist

Connect the dots between Setup, Events, and Go Live into one coherent flow for new users.

**Files:**
- Create: `dashboard/components/dashboard/onboarding-checklist.tsx`
- Modify: `dashboard/app/dashboard/[siteId]/page.tsx`

- [ ] **Step 1: Create the OnboardingChecklist component**

Create `dashboard/components/dashboard/onboarding-checklist.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  href?: string;
}

interface OnboardingChecklistProps {
  siteId: string;
  scriptInstalled: boolean;
  hasPixels: boolean;
  hasEvents: boolean;
  isLive: boolean;
}

export function OnboardingChecklist({
  siteId,
  scriptInstalled,
  hasPixels,
  hasEvents,
  isLive,
}: OnboardingChecklistProps) {
  const router = useRouter();

  const steps: OnboardingStep[] = [
    {
      key: "script",
      label: "Install the Pigxel script",
      description: "Add the tracking snippet to your website.",
      completed: scriptInstalled,
    },
    {
      key: "pixels",
      label: "Connect your analytics",
      description: "Add your GA4 or Meta Pixel ID.",
      completed: hasPixels,
    },
    {
      key: "events",
      label: "Set up tracking rules",
      description: "Define what actions to track.",
      completed: hasEvents,
      href: `/dashboard/${siteId}/events`,
    },
    {
      key: "live",
      label: "Go live",
      description: "Start collecting data.",
      completed: isLive,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allDone = completedCount === steps.length;

  // Don't show if all steps are complete
  if (allDone) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Getting started</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {completedCount} of {steps.length} complete
          </p>
        </div>
        <div className="flex gap-1">
          {steps.map((s) => (
            <div
              key={s.key}
              className={cn(
                "h-1.5 w-6 rounded-full",
                s.completed ? "bg-emerald-400" : "bg-slate-200"
              )}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {steps.map((step) => (
          <button
            key={step.key}
            onClick={() => step.href && !step.completed && router.push(step.href)}
            disabled={step.completed || !step.href}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
              step.completed
                ? "opacity-60"
                : step.href
                  ? "hover:bg-slate-50 cursor-pointer"
                  : "cursor-default"
            )}
          >
            {step.completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-slate-300 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                step.completed ? "text-slate-400 line-through" : "text-slate-700"
              )}>
                {step.label}
              </p>
              {!step.completed && (
                <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
              )}
            </div>
            {!step.completed && step.href && (
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add OnboardingChecklist to the Setup page**

In `dashboard/app/dashboard/[siteId]/page.tsx`, add the import:

```typescript
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
```

Add the component right after the page header card's closing `</div>` (around line 285) and before the `{/* ── Step 1 — Install script ──` comment:

```tsx
          <OnboardingChecklist
            siteId={siteId}
            scriptInstalled={isScriptInstalled}
            hasPixels={hasAnalytics}
            hasEvents={(config.events?.length ?? 0) > 0}
            isLive={site.status === "active"}
          />
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/components/dashboard/onboarding-checklist.tsx dashboard/app/dashboard/[siteId]/page.tsx
git commit -m "feat: add onboarding checklist to guide new users through setup"
```

---

## Task 8: Login Page Trust Copy

Add a simple trust signal below the login card.

**Files:**
- Modify: `dashboard/app/login/page.tsx`

- [ ] **Step 1: Add trust copy below the toggle link**

In `dashboard/app/login/page.tsx`, after the sign-up/sign-in toggle paragraph (around line 198), before the final closing `</div>`, add:

```tsx
        <p className="text-center text-xs text-slate-400 mt-6">
          Free to start · No credit card required
        </p>
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/app/login/page.tsx
git commit -m "feat: add trust copy to login page"
```

---

## Task 9: Skeleton Loading Consistency

Replace spinner-only loading states with proper skeletons on Setup and Events pages.

**Files:**
- Modify: `dashboard/app/dashboard/[siteId]/page.tsx`
- Modify: `dashboard/app/dashboard/[siteId]/events/page.tsx`

- [ ] **Step 1: Replace Setup page loading spinner with skeleton**

In `dashboard/app/dashboard/[siteId]/page.tsx`, replace the loading state return (lines 127-140):

```tsx
  if (loading) {
    return (
      <AuthGuard>
        <SidebarLayout>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
            {/* Header skeleton */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                  <div className="flex gap-3 mt-3">
                    <div className="h-3 bg-slate-100 rounded w-12" />
                    <div className="h-3 bg-slate-100 rounded w-10" />
                    <div className="h-3 bg-slate-100 rounded w-10" />
                  </div>
                </div>
                <div className="h-9 w-24 bg-slate-100 rounded-lg" />
              </div>
            </div>
            {/* Step cards skeleton */}
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm mb-4 animate-pulse">
                <div className="flex items-center gap-3 p-5 border-b border-slate-100">
                  <div className="h-8 w-8 rounded-lg bg-slate-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-slate-100 rounded w-2/5" />
                    <div className="h-3 bg-slate-100 rounded w-3/5" />
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-16 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </SidebarLayout>
      </AuthGuard>
    );
  }
```

- [ ] **Step 2: Replace Events page loading spinner with skeleton**

In `dashboard/app/dashboard/[siteId]/events/page.tsx`, replace the loading state return (lines 210-220):

```tsx
  if (loading) {
    return (
      <AuthGuard>
        <SidebarLayout>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
            <div className="flex items-center justify-between mb-6 animate-pulse">
              <div className="space-y-2">
                <div className="h-6 bg-slate-100 rounded w-24" />
                <div className="h-3 bg-slate-100 rounded w-40" />
              </div>
              <div className="h-9 w-28 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-10 bg-slate-100 rounded-lg mb-6 animate-pulse" />
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 bg-slate-100 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                    <div className="h-6 w-16 bg-slate-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SidebarLayout>
      </AuthGuard>
    );
  }
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/app/dashboard/[siteId]/page.tsx dashboard/app/dashboard/[siteId]/events/page.tsx
git commit -m "feat: replace loading spinners with skeleton screens on Setup and Events pages"
```

---

## Summary of Manual Actions

After all tasks are complete:

1. **Task 1** requires the `verifySiteInstallation` Cloud Function to be deployed (`firebase deploy --only functions`)
2. **Task 4** requires the `last_event_at` field to be populated by the backend when events are reported — this is a backend enhancement that should be scoped separately
3. **Logo SVG conversion** (recommendation #7) is excluded from this plan — it requires a designer to export the logo as SVG from the source file

## Dependency Notes

- Tasks 1-9 are all independent and can be built in any order
- Task 2 modifies the same file as Task 1 and Task 7 — if using parallel agents, assign them to the same agent or execute sequentially
- Tasks 5 and 6 both modify the events page but touch different sections — can be done in parallel if careful
