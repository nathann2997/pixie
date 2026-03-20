"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NeonButton } from "@/components/ui/neon-button";
import {
  GlassModal,
  GlassModalContent,
  GlassModalTitle,
  GlassModalCard,
  GlassModalClose,
} from "@/components/ui/glass-modal";
import { toast } from "sonner";
import {
  ShoppingCart,
  CalendarCheck,
  UserPlus,
  Mail,
  MessageSquare,
  Zap,
  Download,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuggestedEvent {
  selector: string;
  text: string;
  type: "button" | "submit" | "link";
}

export interface TrackingEventRule {
  selector: string;
  trigger: string;
  platform: string;
  event_name: string;
}

export interface CurrentTrackingConfig {
  pixels: { ga4?: string; meta?: string; tiktok?: string; linkedin?: string; google_ads?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: any[];
}

export interface SuggestedRulesListProps {
  siteId: string;
  suggested: SuggestedEvent[];
  currentTrackingConfig: CurrentTrackingConfig;
  onUpdate: () => void;
}

// ─── Intent engine ────────────────────────────────────────────────────────────

type Intent = "purchase" | "lead" | "signup" | "newsletter" | "contact" | "download" | "engagement";

interface IntentMeta {
  label: string;
  why: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}

const INTENT_META: Record<Intent, IntentMeta> = {
  purchase:   {
    label: "Purchase intent",
    why:   "High-value action — signals a visitor is ready to buy. Essential for ROAS optimisation.",
    icon: ShoppingCart,
    color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-200",
  },
  lead:       {
    label: "Lead capture",
    why:   "Booking or demo requests are your warmest leads. Track these to measure pipeline value.",
    icon: CalendarCheck,
    color: "text-blue-600",   bg: "bg-blue-50",    border: "border-blue-200",
  },
  signup:     {
    label: "New signup",
    why:   "Tracks when someone starts a trial or creates an account — your top-of-funnel win.",
    icon: UserPlus,
    color: "text-violet-600", bg: "bg-violet-50",  border: "border-violet-200",
  },
  newsletter: {
    label: "Email signup",
    why:   "Newsletter captures grow your owned audience. Track to measure list-building performance.",
    icon: Mail,
    color: "text-amber-600",  bg: "bg-amber-50",   border: "border-amber-200",
  },
  contact:    {
    label: "Contact request",
    why:   "Someone reaching out is a warm lead signal. Track these to understand what drives enquiries.",
    icon: MessageSquare,
    color: "text-rose-600",   bg: "bg-rose-50",    border: "border-rose-200",
  },
  download:   {
    label: "Content download",
    why:   "Asset downloads show research intent — great for lead scoring and nurture campaigns.",
    icon: Download,
    color: "text-slate-600",  bg: "bg-slate-100",  border: "border-slate-200",
  },
  engagement: {
    label: "Engagement",
    why:   "Tracks clicks on key calls-to-action. Use this to see which CTAs drive the most interest.",
    icon: Zap,
    color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-200",
  },
};

function inferIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/buy|purchase|add to cart|order|checkout|pay/.test(t))              return "purchase";
  if (/book|schedule|reserve|appointment|demo|call/.test(t))              return "lead";
  if (/sign[\s-]?up|register|create account|get started|start free|try/.test(t)) return "signup";
  if (/subscribe|newsletter|email/.test(t))                               return "newsletter";
  if (/contact|get in touch|talk to|reach out|enquire/.test(t))          return "contact";
  if (/download|get the|grab/.test(t))                                    return "download";
  return "engagement";
}

function toEventName(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .substring(0, 40) || "conversion";
}

// ─── Platform pill ────────────────────────────────────────────────────────────

export type Platform = "ga4" | "meta" | "tiktok" | "linkedin" | "google_ads";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "ga4",        label: "GA4"          },
  { id: "meta",       label: "Meta"         },
  { id: "tiktok",     label: "TikTok"       },
  { id: "linkedin",   label: "LinkedIn"     },
  { id: "google_ads", label: "Google Ads"   },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const SuggestedRulesList = ({
  siteId,
  suggested,
  currentTrackingConfig,
  onUpdate,
}: SuggestedRulesListProps) => {
  const [addingIndex,       setAddingIndex]       = useState<number | null>(null);
  const [eventName,         setEventName]         = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(new Set(["ga4"]));
  const [dismissed,         setDismissed]         = useState<Set<number>>(new Set());
  const [saving,            setSaving]            = useState(false);

  const togglePlatform = (id: Platform) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      if (next.size === 0) next.add(id);
      return next;
    });
  };

  const handleAdd = (index: number) => {
    setAddingIndex(index);
    setEventName(toEventName(suggested[index].text));
    setSelectedPlatforms(new Set(["ga4"]));
  };

  const handleDismiss = (index: number) => {
    setDismissed((prev) => new Set(prev).add(index));
  };

  const handleConfirm = async () => {
    if (addingIndex == null || saving) return;
    const item = suggested[addingIndex];
    const name = eventName.trim() || "conversion";
    setSaving(true);
    try {
      const newEvents: TrackingEventRule[] = Array.from(selectedPlatforms).map((p) => ({
        selector:   item.selector,
        trigger:    item.type === "submit" ? "submit" : "click",
        platform:   p,
        event_name: p === "google_ads" ? "conversion" : name,
      }));
      const updatedEvents    = [...(currentTrackingConfig.events ?? []), ...newEvents];
      const updatedSuggested = suggested.filter((_, i) => i !== addingIndex);
      await updateDoc(doc(db, "sites", siteId), {
        trackingConfig:   { ...currentTrackingConfig, events: updatedEvents },
        suggested_events: updatedSuggested,
      });
      onUpdate();
      setAddingIndex(null);
      const platformList = PLATFORMS
        .filter((p) => selectedPlatforms.has(p.id))
        .map((p) => p.label)
        .join(", ");
      toast.success(`Now tracking "${name}"`, {
        description: `Firing on ${platformList}`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start tracking");
    } finally {
      setSaving(false);
    }
  };

  const visible = suggested.filter((_, i) => !dismissed.has(i));

  if (visible.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        All caught up — no suggestions remaining.
      </p>
    );
  }

  const activeItem  = addingIndex != null ? suggested[addingIndex] : null;
  const activeMeta  = activeItem ? INTENT_META[inferIntent(activeItem.text)] : null;

  return (
    <>
      <div className="space-y-3">
        {suggested.map((item, index) => {
          if (dismissed.has(index)) return null;
          const intent = inferIntent(item.text);
          const meta   = INTENT_META[intent];
          const Icon   = meta.icon;

          return (
            <div
              key={`${item.selector}-${index}`}
              className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all duration-150"
            >
              {/* Intent icon */}
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border mt-0.5",
                meta.bg, meta.border
              )}>
                <Icon className={cn("h-5 w-5", meta.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 leading-snug">
                  {item.text || "Unnamed element"}
                </p>
                <span className={cn(
                  "inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full border",
                  meta.bg, meta.border, meta.color
                )}>
                  {meta.label}
                </span>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {meta.why}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <NeonButton
                  className="h-8 px-3 text-xs gap-1 whitespace-nowrap"
                  onClick={() => handleAdd(index)}
                >
                  Track this
                  <ChevronRight className="h-3 w-3" />
                </NeonButton>
                <button
                  onClick={() => handleDismiss(index)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Not relevant
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Confirmation modal ───────────────────────────────── */}
      <GlassModal
        open={addingIndex !== null}
        onOpenChange={(open) => !open && setAddingIndex(null)}
      >
        <GlassModalContent>
          <GlassModalCard className="p-6">

            {/* Intent banner */}
            {activeMeta && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border mb-5",
                activeMeta.bg, activeMeta.border
              )}>
                <activeMeta.icon className={cn("h-4 w-4 shrink-0", activeMeta.color)} />
                <span className={cn("text-xs font-semibold", activeMeta.color)}>
                  {activeMeta.label}
                </span>
              </div>
            )}

            <GlassModalTitle className="text-base font-semibold text-slate-900 mb-1">
              Start tracking &ldquo;{activeItem?.text}&rdquo;
            </GlassModalTitle>
            <p className="text-sm text-slate-500 mb-5">
              Give this event a name and choose where it should fire. You can always change this later.
            </p>

            {/* Event name */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Event name
              </label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. book_styling_session"
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 font-mono text-sm"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                This is the name shown in your GA4 or Meta dashboard.
              </p>
            </div>

            {/* Platform multi-select */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-600 mb-2">
                Fire on
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => {
                  const selected = selectedPlatforms.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-left",
                        selected
                          ? "bg-rose-50 border-rose-300 text-rose-700"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <span className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                        selected ? "bg-rose-400 border-rose-400" : "border-slate-300 bg-white"
                      )}>
                        {selected && <Check className="h-2.5 w-2.5 text-white" />}
                      </span>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <GlassModalClose asChild>
                <Button
                  variant="secondary"
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                >
                  Cancel
                </Button>
              </GlassModalClose>
              <NeonButton
                className="flex-1 gap-2"
                disabled={saving || !eventName.trim()}
                onClick={handleConfirm}
              >
                {saving
                  ? "Setting up…"
                  : <><Check className="h-3.5 w-3.5" />Start tracking</>
                }
              </NeonButton>
            </div>

          </GlassModalCard>
        </GlassModalContent>
      </GlassModal>
    </>
  );
};
