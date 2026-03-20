"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MousePointerClick,
  Send,
  Globe,
  ShoppingCart,
  CalendarCheck,
  UserPlus,
  Mail,
  MessageSquare,
  Zap,
  Download,
  ChevronRight,
  Trash2,
  CheckCircle2,
  Database,
  FileCode2,
  Activity,
  AlertCircle,
  X,
} from "lucide-react";
import {
  GlassModal,
  GlassModalContent,
  GlassModalCard,
  GlassModalTitle,
  GlassModalClose,
} from "@/components/ui/glass-modal";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConversionEvent {
  selector: string;
  trigger: string;
  platform: string;
  google_ads_conversion_label?: string;
  linkedin_conversion_id?: string;
  event_name: string;
  description?: string;
  priority?: "high" | "medium" | "low";
  status?: "active" | "inactive" | "unverified";
  last_fired?: string;
  page_url?: string;
}

interface ConversionCardProps {
  event: ConversionEvent;
  index: number;
  onDelete: (index: number) => void;
  deleting?: boolean;
  siteUrl?: string;
}

// ─── Intent engine ─────────────────────────────────────────────────────────────

type Intent = "purchase" | "lead" | "signup" | "newsletter" | "contact" | "download" | "engagement";

interface IntentMeta {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}

const INTENT_META: Record<Intent, IntentMeta> = {
  purchase:   { label: "Purchase intent",   icon: ShoppingCart,  color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-200" },
  lead:       { label: "Lead capture",      icon: CalendarCheck, color: "text-blue-600",   bg: "bg-blue-50",    border: "border-blue-200"   },
  signup:     { label: "New signup",        icon: UserPlus,      color: "text-violet-600", bg: "bg-violet-50",  border: "border-violet-200" },
  newsletter: { label: "Email signup",      icon: Mail,          color: "text-amber-600",  bg: "bg-amber-50",   border: "border-amber-200"  },
  contact:    { label: "Contact request",   icon: MessageSquare, color: "text-rose-600",   bg: "bg-rose-50",    border: "border-rose-200"   },
  download:   { label: "Content download",  icon: Download,      color: "text-slate-600",  bg: "bg-slate-100",  border: "border-slate-200"  },
  engagement: { label: "Engagement",        icon: Zap,           color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-200" },
};

function inferIntent(name: string): Intent {
  const t = name.toLowerCase();
  if (/buy|purchase|add_to_cart|order|checkout|pay/.test(t))              return "purchase";
  if (/book|schedule|reserve|appointment|demo|call/.test(t))              return "lead";
  if (/sign_?up|register|create_account|get_started|start_free|trial/.test(t)) return "signup";
  if (/subscri|newsletter|email/.test(t))                                 return "newsletter";
  if (/contact|enquir|get_in_touch|reach_out/.test(t))                   return "contact";
  if (/download|get_the|grab/.test(t))                                    return "download";
  return "engagement";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanize(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const PLATFORM_META: Record<string, { label: string; full: string; className: string }> = {
  ga4:        { label: "GA4",         full: "Google Analytics 4",    className: "bg-blue-50 border-blue-200 text-blue-700"       },
  meta:       { label: "Meta",        full: "Meta (Facebook) Pixel", className: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  both:       { label: "Both",        full: "GA4 + Meta Pixel",      className: "bg-violet-50 border-violet-200 text-violet-700" },
  tiktok:     { label: "TikTok",      full: "TikTok Pixel",          className: "bg-slate-900 border-slate-700 text-white"       },
  linkedin:   { label: "LinkedIn",    full: "LinkedIn Insight Tag",  className: "bg-sky-50 border-sky-200 text-sky-700"          },
  google_ads: { label: "Google Ads",  full: "Google Ads Conversion", className: "bg-amber-50 border-amber-200 text-amber-700"    },
};

const TRIGGER_LABELS: Record<string, string> = {
  click:    "Button click",
  submit:   "Form submission",
  pageview: "Page view",
};

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  click:    MousePointerClick,
  submit:   Send,
  pageview: Globe,
};

function PlatformBadge({ platform }: { platform: string }) {
  const meta = PLATFORM_META[platform] ?? { label: platform.toUpperCase(), className: "bg-slate-100 border-slate-200 text-slate-600" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium", meta.className)}>
      {meta.label}
    </span>
  );
}

// ─── Detail sections ──────────────────────────────────────────────────────────

function DetailSection({ icon: Icon, label, children }: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      {children}
    </div>
  );
}

function CodeLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-slate-200 last:border-0">
      <span className="text-xs text-slate-400 shrink-0 w-28 pt-0.5">{label}</span>
      <span className="text-xs font-mono text-slate-800 break-all">{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConversionCard({ event, index, onDelete, deleting, siteUrl }: ConversionCardProps) {
  const [open,          setOpen]          = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const intent        = inferIntent(event.event_name);
  const meta          = INTENT_META[intent];
  const Icon          = meta.icon;
  const TriggerIcon   = TRIGGER_ICONS[event.trigger] ?? MousePointerClick;
  const platformMeta  = PLATFORM_META[event.platform] ?? { label: event.platform.toUpperCase(), full: event.platform, className: "" };
  const displayName   = humanize(event.event_name);
  const triggerLabel  = TRIGGER_LABELS[event.trigger] ?? event.trigger;
  const isActive      = event.status !== "inactive";
  const pageContext   = event.page_url ?? siteUrl ?? "All pages";

  const snippet = [
    `// Pigxel fires this event automatically`,
    `pigxel.track("${event.event_name}", {`,
    `  platform: "${event.platform}",`,
    `  trigger:  "${event.trigger}",`,
    `  selector: "${event.selector}"`,
    `});`,
  ].join("\n");

  return (
    <>
      {/* ── Row card ──────────────────────────────────────── */}
      <div
        onClick={() => setOpen(true)}
        className="group flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all duration-150 cursor-pointer"
      >
        {/* Intent icon */}
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
          meta.bg, meta.border
        )}>
          <Icon className={cn("h-5 w-5", meta.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-900 leading-snug">{displayName}</p>
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium", meta.bg, meta.border, meta.color)}>
              {meta.label}
            </span>
            <PlatformBadge platform={event.platform} />
          </div>
          <div className="flex items-center gap-1.5">
            <TriggerIcon className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500">{triggerLabel}</span>
            {event.description && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400 truncate">{event.description}</span>
              </>
            )}
          </div>
        </div>

        {/* Status + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "h-2 w-2 rounded-full",
              isActive ? "bg-emerald-400" : "bg-slate-300"
            )} />
            <span className={cn("text-xs font-medium", isActive ? "text-emerald-600" : "text-slate-400")}>
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>

      {/* ── Detail modal ──────────────────────────────────── */}
      <GlassModal open={open} onOpenChange={setOpen}>
        <GlassModalContent className="max-w-xl">
          <GlassModalCard className="overflow-hidden">

            {/* Header */}
            <div className="flex items-start gap-4 p-6 border-b border-slate-100">
              <div className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                meta.bg, meta.border
              )}>
                <Icon className={cn("h-5 w-5", meta.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <GlassModalTitle className="text-base font-semibold text-slate-900 leading-snug mb-1">
                  {displayName}
                </GlassModalTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium", meta.bg, meta.border, meta.color)}>
                    {meta.label}
                  </span>
                  <PlatformBadge platform={event.platform} />
                  <div className="flex items-center gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-400" : "bg-slate-300")} />
                    <span className={cn("text-xs", isActive ? "text-emerald-600" : "text-slate-400")}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
              <GlassModalClose asChild>
                <button className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </GlassModalClose>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">

              {/* What triggers it */}
              <DetailSection icon={TriggerIcon} label="What triggers this">
                <p className="text-sm text-slate-700 mb-3">
                  Fires when a visitor performs a <span className="font-medium">{triggerLabel.toLowerCase()}</span> on{" "}
                  <span className="font-medium">{pageContext}</span>.
                </p>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-400 shrink-0">Element</span>
                  <span className="text-xs font-mono text-slate-700 truncate">{event.selector}</span>
                </div>
              </DetailSection>

              {/* Data sent */}
              <DetailSection icon={Database} label={`Data sent to ${platformMeta.full}`}>
                <div className="divide-y divide-slate-200">
                  <CodeLine label="Event name"  value={event.platform === "google_ads" ? "conversion" : event.event_name} />
                  <CodeLine label="Trigger"     value={triggerLabel} />
                  <CodeLine label="Platform"    value={platformMeta.full} />
                  {event.platform === "google_ads" && event.google_ads_conversion_label && (
                    <CodeLine label="Conv. Label" value={event.google_ads_conversion_label} />
                  )}
                  {event.platform === "linkedin" && event.linkedin_conversion_id && (
                    <CodeLine label="Conv. ID"   value={event.linkedin_conversion_id} />
                  )}
                  <CodeLine label="Timestamp"   value="Auto-captured on fire" />
                  <CodeLine label="Page URL"    value="Auto-captured on fire" />
                </div>
              </DetailSection>

              {/* Tracking snippet */}
              <DetailSection icon={FileCode2} label="Tracking snippet">
                <pre className="text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre">
                  {snippet}
                </pre>
              </DetailSection>

              {/* Status */}
              <DetailSection icon={Activity} label="Status">
                {isActive ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Event is active</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {event.last_fired
                          ? `Last fired ${new Date(event.last_fired).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                          : "This event is configured and ready to fire. It will start recording once a visitor triggers it on your site."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Event is inactive</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        This event is not currently firing. Check your pixel installation.
                      </p>
                    </div>
                  </div>
                )}
              </DetailSection>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              {confirmDelete ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600">Remove this event?</span>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { onDelete(index); setOpen(false); setConfirmDelete(false); }}
                    disabled={deleting}
                    className="text-sm font-medium text-rose-500 hover:text-rose-700 transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Removing…" : "Yes, remove"}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove event
                  </button>
                  <GlassModalClose asChild>
                    <Button variant="secondary" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                      Close
                    </Button>
                  </GlassModalClose>
                </>
              )}
            </div>

          </GlassModalCard>
        </GlassModalContent>
      </GlassModal>
    </>
  );
}
