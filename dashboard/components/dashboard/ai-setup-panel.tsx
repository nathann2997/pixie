"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { NeonButton } from "@/components/ui/neon-button";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Brain,
  Target,
  CheckCircle2,
  Circle,
  ChevronRight,
  RotateCcw,
  Zap,
  BarChart2,
  Share2,
  TrendingUp,
  Users,
  ShoppingCart,
  Loader2,
} from "lucide-react";

// ─── Types (must mirror functions/src/ai/*.ts) ────────────────────────────────

interface ConversionAction {
  action: string;
  intent: "purchase" | "lead_generation" | "signup" | "contact" | "engagement" | "download";
  urgency: "high" | "medium" | "low";
}

interface SiteAnalysis {
  businessType: string;
  businessDescription: string;
  primaryProducts: string[];
  targetAudience: string;
  keyConversionActions: ConversionAction[];
  pageFeatures: {
    hasEcommerce: boolean;
    hasPricing: boolean;
    hasContactForm: boolean;
    hasNewsletterSignup: boolean;
    hasCTA: boolean;
  };
  suggestedTrackingGoals: string[];
  analyzedAt: string;
}

interface DraftEvent {
  event_name: string;
  selector: string;
  trigger: string;
  platform: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: string;
  included: boolean;
}

interface TrackingDraft {
  recommendedPixels: {
    ga4: boolean;
    meta: boolean;
    tiktok: boolean;
    linkedin: boolean;
  };
  recommendedEvents: DraftEvent[];
  conversionFunnelSteps: string[];
  implementationNotes: string;
  estimatedSetupTime: string;
  generatedAt: string;
}

interface AiSetupPanelProps {
  siteId: string;
  aiPlanStatus?: "none" | "analysed" | "draft_ready" | "applied";
  analysis?: SiteAnalysis;
  draftPlan?: TrackingDraft;
  onApplied: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BUSINESS_TYPE_ICONS: Record<string, React.ElementType> = {
  ecommerce:   ShoppingCart,
  saas:        TrendingUp,
  services:    Users,
  blog:        BarChart2,
  default:     Brain,
};

const PRIORITY_COLOURS = {
  high:   "bg-rose-50 border-rose-200 text-rose-700",
  medium: "bg-amber-50 border-amber-200 text-amber-700",
  low:    "bg-slate-100 border-slate-200 text-slate-500",
};

const PLATFORM_BADGE: Record<string, string> = {
  ga4:  "bg-blue-50 border-blue-200 text-blue-700",
  meta: "bg-indigo-50 border-indigo-200 text-indigo-700",
  both: "bg-violet-50 border-violet-200 text-violet-700",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepBadge({ step, active, done }: { step: number; active: boolean; done: boolean }) {
  return (
    <div
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold shrink-0",
        done  ? "bg-emerald-100 border border-emerald-200 text-emerald-700" :
        active ? "bg-rose-100 border border-rose-200 text-rose-600" :
                 "bg-slate-100 border border-slate-200 text-slate-400"
      )}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : step}
    </div>
  );
}

// ─── Step 1: Analyse ─────────────────────────────────────────────────────────

function AnalyseStep({
  siteId,
  analysis,
  onDone,
}: {
  siteId: string;
  analysis?: SiteAnalysis;
  onDone: (a: SiteAnalysis) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleAnalyse = async () => {
    setLoading(true);
    try {
      const fn = httpsCallable<{ siteId: string }, { success: boolean; analysis: SiteAnalysis }>(
        functions, "analyzeWebsiteWithAI"
      );
      const res = await fn({ siteId });
      onDone(res.data.analysis);
      toast.success("Site analysis complete!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const BusinessIcon = BUSINESS_TYPE_ICONS[analysis?.businessType ?? "default"] ?? Brain;

  return (
    <div className="space-y-4">
      {analysis ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 shrink-0">
              <BusinessIcon className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 capitalize">{analysis.businessType}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{analysis.businessDescription}</p>
            </div>
          </div>

          {analysis.keyConversionActions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Key conversion actions identified:</p>
              <div className="space-y-1.5">
                {analysis.keyConversionActions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full font-medium border text-xs shrink-0",
                      action.urgency === "high"   ? "bg-rose-50 border-rose-200 text-rose-600" :
                      action.urgency === "medium" ? "bg-amber-50 border-amber-200 text-amber-600" :
                                                   "bg-slate-100 border-slate-200 text-slate-500"
                    )}>
                      {action.urgency}
                    </span>
                    <span className="text-slate-600">{action.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyse}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-500 transition-colors disabled:pointer-events-none"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Re-analyse site
          </button>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
            <Brain className="h-5 w-5 text-rose-400" />
          </div>
          <p className="text-sm text-slate-600 mb-1 font-medium">Understand your site</p>
          <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto leading-relaxed">
            Pigxel will visit your website and use AI to identify what you sell,
            who your customers are, and what you need to track.
          </p>
          <NeonButton onClick={handleAnalyse} disabled={loading} className="gap-2">
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Analysing…</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5" />Analyse my site</>
            )}
          </NeonButton>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Generate Plan ────────────────────────────────────────────────────

function GeneratePlanStep({
  siteId,
  plan,
  onDone,
}: {
  siteId: string;
  plan?: TrackingDraft;
  onDone: (p: TrackingDraft) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const fn = httpsCallable<{ siteId: string }, { success: boolean; plan: TrackingDraft }>(
        functions, "generateTrackingPlan"
      );
      const res = await fn({ siteId });
      onDone(res.data.plan);
      toast.success("Tracking plan generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Plan generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!plan) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
          <Target className="h-5 w-5 text-rose-400" />
        </div>
        <p className="text-sm text-slate-600 mb-1 font-medium">Build your tracking plan</p>
        <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto leading-relaxed">
          Based on your site analysis, Pigxel will recommend exactly which events
          and pixels to set up, ordered by business impact.
        </p>
        <NeonButton onClick={handleGenerate} disabled={loading} className="gap-2">
          {loading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Building plan…</>
          ) : (
            <><Target className="h-3.5 w-3.5" />Generate tracking plan</>
          )}
        </NeonButton>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Zap className="h-3.5 w-3.5 text-rose-400" />
        Est. setup time: <span className="font-medium text-slate-700">{plan.estimatedSetupTime}</span>
      </div>

      {/* Recommended pixels */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-2">Recommended data sources:</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(plan.recommendedPixels) as [string, boolean][])
            .filter(([, v]) => v)
            .map(([key]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium bg-emerald-50 border-emerald-200 text-emerald-700"
              >
                <CheckCircle2 className="h-3 w-3" />
                {key === "ga4" ? "Google Analytics 4" : key === "meta" ? "Meta Pixel" : key.toUpperCase()}
              </span>
            ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-500 transition-colors disabled:pointer-events-none"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        Regenerate plan
      </button>
    </div>
  );
}

// ─── Step 3: Review & Apply ───────────────────────────────────────────────────

function ReviewApplyStep({
  siteId,
  plan,
  applied,
  onEventsChange,
  onApplied,
}: {
  siteId: string;
  plan: TrackingDraft;
  applied: boolean;
  onEventsChange: (events: DraftEvent[]) => void;
  onApplied: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  const events = plan.recommendedEvents;
  const includedCount = events.filter((e) => e.included).length;

  const handleToggle = async (index: number, included: boolean) => {
    setToggling(index);
    try {
      const fn = httpsCallable<
        { siteId: string; toggleIndex: number; toggleIncluded: boolean },
        { success: boolean; updatedEvents: DraftEvent[] }
      >(functions, "updateDraftPlan");
      const res = await fn({ siteId, toggleIndex: index, toggleIncluded: included });
      onEventsChange(res.data.updatedEvents);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update plan.");
    } finally {
      setToggling(null);
    }
  };

  const handleApply = async () => {
    if (includedCount === 0) {
      toast.error("Select at least one event before applying.");
      return;
    }
    setApplying(true);
    try {
      const fn = httpsCallable<
        { siteId: string; applyPixelRecommendations: boolean },
        { success: boolean; appliedEventsCount: number }
      >(functions, "applyTrackingConfig");
      const res = await fn({ siteId, applyPixelRecommendations: false });
      toast.success(`${res.data.appliedEventsCount} tracking events applied!`);
      onApplied();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply config.");
    } finally {
      setApplying(false);
    }
  };

  if (applied) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-sm font-semibold text-slate-900 mb-1">Tracking config applied!</p>
        <p className="text-xs text-slate-500">Your AI-generated tracking plan is now active.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 leading-relaxed">
        Toggle the events you want to track. Un-check anything that doesn&apos;t apply.
      </p>

      <div className="space-y-2">
        {events.map((event, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3.5 transition-colors",
              event.included
                ? "bg-white border-slate-200"
                : "bg-slate-50 border-slate-200 opacity-60"
            )}
          >
            {/* Toggle */}
            <button
              onClick={() => handleToggle(i, !event.included)}
              disabled={toggling === i}
              className="mt-0.5 shrink-0 text-slate-400 hover:text-rose-500 transition-colors disabled:pointer-events-none"
              aria-label={event.included ? "Exclude event" : "Include event"}
            >
              {toggling === i ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : event.included ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <code className="text-xs font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                  {event.event_name}
                </code>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full border font-medium",
                  PRIORITY_COLOURS[event.priority]
                )}>
                  {event.priority}
                </span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full border font-medium",
                  PLATFORM_BADGE[event.platform] ?? PLATFORM_BADGE.ga4
                )}>
                  {event.platform === "both" ? "GA4 + Meta" : event.platform.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
              {event.estimatedImpact && (
                <p className="text-xs text-slate-400 mt-1 leading-relaxed italic">
                  {event.estimatedImpact}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {plan.implementationNotes && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-medium">Note: </span>{plan.implementationNotes}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-slate-400">
          {includedCount} of {events.length} events selected
        </p>
        <NeonButton
          onClick={handleApply}
          disabled={applying || includedCount === 0}
          className="gap-2"
        >
          {applying ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Applying…</>
          ) : (
            <><Zap className="h-3.5 w-3.5" />Apply {includedCount} event{includedCount !== 1 ? "s" : ""}</>
          )}
        </NeonButton>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function AiSetupPanel({
  siteId,
  aiPlanStatus,
  analysis: initialAnalysis,
  draftPlan: initialDraft,
  onApplied,
}: AiSetupPanelProps) {
  const [analysis, setAnalysis] = useState<SiteAnalysis | undefined>(initialAnalysis);
  const [draft, setDraft] = useState<TrackingDraft | undefined>(initialDraft);
  const [planApplied, setPlanApplied] = useState(aiPlanStatus === "applied");

  const hasAnalysis  = !!analysis;
  const hasDraft     = !!draft;
  const step1Done    = hasAnalysis;
  const step2Done    = hasDraft;
  const step3Active  = step1Done && step2Done;

  return (
    <div className="space-y-4">
      {/* Intro banner */}
      <div className="flex items-start gap-3 rounded-xl bg-gradient-to-br from-rose-50 to-slate-50 border border-rose-100 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 border border-rose-200 shrink-0">
          <Sparkles className="h-4 w-4 text-rose-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">AI tracking setup</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-md">
            Answer three questions with one click each. Pigxel will analyse your site,
            recommend the right tracking, and apply it for you.
          </p>
        </div>
      </div>

      {/* Step 1 — Analyse */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
          <StepBadge step={1} active={!step1Done} done={step1Done} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Analyse your site</p>
            <p className="text-xs text-slate-400">Pigxel reads your pages with AI to understand your business</p>
          </div>
          {step1Done && (
            <ChevronRight className="h-4 w-4 text-slate-300" />
          )}
        </div>
        <div className="p-5">
          <AnalyseStep siteId={siteId} analysis={analysis} onDone={setAnalysis} />
        </div>
      </div>

      {/* Step 2 — Generate plan */}
      <div className={cn(
        "bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-opacity",
        !step1Done && "opacity-40 pointer-events-none"
      )}>
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
          <StepBadge step={2} active={step1Done && !step2Done} done={step2Done} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Generate tracking plan</p>
            <p className="text-xs text-slate-400">Get a recommended list of events and pixels to set up</p>
          </div>
          {step2Done && (
            <ChevronRight className="h-4 w-4 text-slate-300" />
          )}
        </div>
        <div className="p-5">
          <GeneratePlanStep
            siteId={siteId}
            plan={draft}
            onDone={setDraft}
          />
        </div>
      </div>

      {/* Step 3 — Review & apply */}
      <div className={cn(
        "bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-opacity",
        !step3Active && "opacity-40 pointer-events-none"
      )}>
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
          <StepBadge step={3} active={step3Active && !planApplied} done={planApplied} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Review and apply</p>
            <p className="text-xs text-slate-400">Choose which events to track, then activate with one click</p>
          </div>
          {draft && (
            <span className="text-xs text-slate-400">
              {draft.recommendedEvents.filter((e) => e.included).length} selected
            </span>
          )}
        </div>
        <div className="p-5">
          {draft ? (
            <ReviewApplyStep
              siteId={siteId}
              plan={draft}
              applied={planApplied}
              onEventsChange={(events) =>
                setDraft((prev) => prev ? { ...prev, recommendedEvents: events } : prev)
              }
              onApplied={() => {
                setPlanApplied(true);
                onApplied();
              }}
            />
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              Complete steps 1 and 2 first.
            </p>
          )}
        </div>
      </div>

      {/* Pixel platform badges */}
      {draft && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {draft.recommendedPixels.ga4 && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium">
              <BarChart2 className="h-3 w-3" /> Google Analytics 4
            </span>
          )}
          {draft.recommendedPixels.meta && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium">
              <Share2 className="h-3 w-3" /> Meta Pixel
            </span>
          )}
          {draft.recommendedPixels.tiktok && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-medium">
              TikTok Pixel
            </span>
          )}
          {draft.recommendedPixels.linkedin && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-medium">
              LinkedIn Insight
            </span>
          )}
        </div>
      )}
    </div>
  );
}
