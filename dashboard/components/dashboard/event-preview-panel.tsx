"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, Copy, Check, Info } from "lucide-react";
import {
  GlassModal,
  GlassModalContent,
  GlassModalCard,
  GlassModalTitle,
  GlassModalClose,
} from "@/components/ui/glass-modal";
import { getPlatform, PLATFORMS } from "@/lib/platform-events";
import type { Platform } from "@/lib/platform-events";
import type { EventRule } from "@/lib/normalize-event";
import { getStandardEvent } from "@/lib/platform-events";

// ── Types ──────────────────────────────────────────────────────────────────

interface EventPreviewPanelProps {
  event: EventRule;
  pixels: {
    ga4?: string;
    meta?: string;
    tiktok?: string;
    linkedin?: string;
    google_ads?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Script generation ──────────────────────────────────────────────────────

function generateScript(event: EventRule, platform: Platform): string {
  const name = event.platformNames[platform] || event.displayName;
  const params: Record<string, unknown> = {};

  // Add static params
  for (const p of event.params) {
    if (p.platforms && !p.platforms.includes(platform)) continue;
    if (p.valueSource === "static" || !p.valueSource) {
      params[p.key] = p.value;
    }
  }

  // Add platform fields
  if (platform === "linkedin" && event.platformFields.linkedin_conversion_id) {
    params.conversion_id = parseInt(event.platformFields.linkedin_conversion_id, 10);
  }
  if (
    platform === "google_ads" &&
    event.platformFields.google_ads_conversion_id &&
    event.platformFields.google_ads_conversion_label
  ) {
    params.send_to = `AW-${event.platformFields.google_ads_conversion_id}/${event.platformFields.google_ads_conversion_label}`;
  }

  const paramStr =
    Object.keys(params).length > 0 ? ", " + JSON.stringify(params, null, 2) : "";

  switch (platform) {
    case "ga4":
      return `gtag('event', '${name}'${paramStr});`;
    case "meta":
      return `fbq('track', '${name}'${paramStr});`;
    case "tiktok":
      return `ttq.track('${name}'${paramStr});`;
    case "linkedin":
      return `lintrk('track', ${JSON.stringify(params, null, 2)});`;
    case "google_ads":
      return `gtag('event', 'conversion', ${JSON.stringify(params, null, 2)});`;
  }
}

// ── Validation helpers ─────────────────────────────────────────────────────

type CheckStatus = "ok" | "warn" | "info";

interface ValidationItem {
  status: CheckStatus;
  label: string;
  detail?: string;
}

function buildValidationItems(
  event: EventRule,
  pixels: EventPreviewPanelProps["pixels"]
): ValidationItem[] {
  const items: ValidationItem[] = [];

  // Required params filled
  const stdEvent = event.standardEventId ? getStandardEvent(event.standardEventId) : undefined;
  if (stdEvent && stdEvent.requiredParams.length > 0) {
    const filledKeys = new Set(event.params.map((p) => p.key));
    const missing = stdEvent.requiredParams
      .filter((rp) => {
        // Only check params relevant to at least one of the event's platforms
        const relevant =
          !rp.platforms || rp.platforms.some((pl) => event.platforms.includes(pl));
        return relevant && !filledKeys.has(rp.key);
      })
      .map((rp) => rp.label);

    if (missing.length > 0) {
      items.push({
        status: "warn",
        label: "Required params missing",
        detail: missing.join(", "),
      });
    } else {
      items.push({
        status: "ok",
        label: "Required params filled",
      });
    }
  } else {
    items.push({
      status: "ok",
      label: "Required params filled",
      detail: stdEvent ? "No required params for this event" : "Custom event",
    });
  }

  // Platform IDs present
  if (event.platforms.includes("linkedin")) {
    if (event.platformFields.linkedin_conversion_id) {
      items.push({ status: "ok", label: "LinkedIn Conversion ID present" });
    } else {
      items.push({
        status: "warn",
        label: "LinkedIn Conversion ID missing",
        detail: "Set it in the event settings",
      });
    }
  }

  if (event.platforms.includes("google_ads")) {
    const hasId = !!event.platformFields.google_ads_conversion_id;
    const hasLabel = !!event.platformFields.google_ads_conversion_label;
    if (hasId && hasLabel) {
      items.push({ status: "ok", label: "Google Ads conversion fields present" });
    } else {
      const missing = [
        !hasId && "Conversion ID",
        !hasLabel && "Conversion Label",
      ]
        .filter(Boolean)
        .join(", ");
      items.push({
        status: "warn",
        label: "Google Ads fields incomplete",
        detail: `Missing: ${missing}`,
      });
    }
  }

  // Pixels connected
  const pixelKeyMap: Partial<Record<Platform, keyof typeof pixels>> = {
    ga4: "ga4",
    meta: "meta",
    tiktok: "tiktok",
    linkedin: "linkedin",
    google_ads: "google_ads",
  };

  for (const platform of event.platforms) {
    const key = pixelKeyMap[platform];
    if (!key) continue;
    const label = getPlatform(platform).label;
    if (pixels[key]) {
      items.push({ status: "ok", label: `${label} pixel connected` });
    } else {
      items.push({
        status: "warn",
        label: `${label} pixel not connected`,
        detail: "Add the pixel ID in site settings",
      });
    }
  }

  // Dynamic values
  const dynamicParams = event.params.filter(
    (p) => p.valueSource && p.valueSource !== "static"
  );
  for (const p of dynamicParams) {
    const selectorStr = p.dynamicConfig?.selector
      ? `\`${p.dynamicConfig.selector}\``
      : "a configured selector";
    items.push({
      status: "info",
      label: `Dynamic value: ${p.key}`,
      detail: `Reads from ${selectorStr} at runtime (${p.valueSource})`,
    });
  }

  // Selector configured
  if (event.trigger !== "pageview") {
    if (event.selector) {
      items.push({ status: "ok", label: "Trigger selector configured" });
    } else {
      items.push({
        status: "warn",
        label: "Trigger selector not configured",
        detail: `Event trigger is "${event.trigger}" but no selector is set`,
      });
    }
  } else {
    items.push({
      status: "ok",
      label: "Trigger type: pageview",
      detail: "No selector needed",
    });
  }

  return items;
}

// ── Status icon ────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "ok") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />;
  }
  if (status === "warn") {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />;
  }
  return <Info className="h-4 w-4 shrink-0 text-sky-400" />;
}

// ── Platform color dot ──────────────────────────────────────────────────────

function PlatformDot({ platform }: { platform: Platform }) {
  const config = getPlatform(platform);
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
      style={{ backgroundColor: config.color }}
      aria-hidden="true"
    />
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function EventPreviewPanel({
  event,
  pixels,
  open,
  onOpenChange,
}: EventPreviewPanelProps) {
  const [copied, setCopied] = React.useState(false);

  const platformLabels = React.useMemo(
    () =>
      Object.fromEntries(
        PLATFORMS.map((p) => [p.id, p.label])
      ) as Record<Platform, string>,
    []
  );

  const scripts = React.useMemo(
    () =>
      event.platforms.map((platform) => ({
        platform,
        label: platformLabels[platform],
        code: generateScript(event, platform),
      })),
    [event, platformLabels]
  );

  const validationItems = React.useMemo(
    () => buildValidationItems(event, pixels),
    [event, pixels]
  );

  const allScripts = scripts
    .map(({ label, code }) => `// ── ${label} ──\n${code}`)
    .join("\n\n");

  function handleCopy() {
    navigator.clipboard.writeText(allScripts).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <GlassModal open={open} onOpenChange={onOpenChange}>
      <GlassModalContent className="max-w-2xl">
        <GlassModalCard className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
            <div className="min-w-0">
              <GlassModalTitle className="truncate text-base font-semibold text-white">
                Event Preview: {event.displayName}
              </GlassModalTitle>
              <p className="mt-0.5 text-xs text-slate-400">
                Dry-run — no network calls are made
              </p>
            </div>
            <GlassModalClose className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="sr-only">Close</span>
            </GlassModalClose>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Per-platform script blocks */}
            <section aria-labelledby="scripts-heading">
              <h2
                id="scripts-heading"
                className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Generated Scripts
              </h2>
              <div className="space-y-3">
                {scripts.map(({ platform, label, code }) => (
                  <div key={platform}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <PlatformDot platform={platform} />
                      <span className="text-xs font-medium text-slate-300">
                        {label}
                      </span>
                    </div>
                    <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 ring-1 ring-white/5">
                      <code>{code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </section>

            {/* Divider */}
            <div className="my-5 border-t border-white/10" />

            {/* Validation checklist */}
            <section aria-labelledby="validation-heading">
              <h2
                id="validation-heading"
                className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Validation Checklist
              </h2>
              <ul className="space-y-2">
                {validationItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <StatusIcon status={item.status} />
                    <div className="min-w-0">
                      <span className="text-sm text-slate-200">{item.label}</span>
                      {item.detail && (
                        <p className="mt-0.5 text-xs text-slate-400">{item.detail}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Footer — copy button */}
          <div className="border-t border-white/10 px-6 py-4">
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:bg-white/20"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy all scripts
                </>
              )}
            </button>
          </div>
        </GlassModalCard>
      </GlassModalContent>
    </GlassModal>
  );
}
