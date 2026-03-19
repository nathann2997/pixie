"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SidebarLayout } from "@/components/layouts/sidebar-layout";
import { AuditStatusCard, type PixelAudit } from "@/components/dashboard/audit-status-card";
import { AiSetupPanel } from "@/components/dashboard/ai-setup-panel";
import { NeonButton } from "@/components/ui/neon-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  Brain,
  ShoppingCart,
  TrendingUp,
  Users,
  BarChart2,
  Sparkles,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  recommendedPixels: { ga4: boolean; meta: boolean; tiktok: boolean; linkedin: boolean };
  recommendedEvents: DraftEvent[];
  conversionFunnelSteps: string[];
  implementationNotes: string;
  estimatedSetupTime: string;
  generatedAt: string;
}

interface SiteData {
  id: string;
  name?: string;
  url: string;
  pixel_audit?: PixelAudit;
  ai_analysis?: SiteAnalysis;
  ai_plan_status?: "none" | "analysed" | "draft_ready" | "applied";
  ai_draft_plan?: TrackingDraft;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BUSINESS_ICONS: Record<string, React.ElementType> = {
  ecommerce: ShoppingCart,
  saas:      TrendingUp,
  services:  Users,
  blog:      BarChart2,
};

const URGENCY_STYLES = {
  high:   "bg-rose-50 border-rose-200 text-rose-600",
  medium: "bg-amber-50 border-amber-200 text-amber-600",
  low:    "bg-slate-100 border-slate-200 text-slate-500",
};

// ─── AI Analysis card ─────────────────────────────────────────────────────────

function AiAnalysisCard({
  siteId,
  analysis: initialAnalysis,
}: {
  siteId: string;
  analysis?: SiteAnalysis;
}) {
  const [analysis, setAnalysis] = useState<SiteAnalysis | undefined>(initialAnalysis);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => { setAnalysis(initialAnalysis); }, [initialAnalysis]);

  const handleAnalyse = async () => {
    setLoading(true);
    try {
      const fn = httpsCallable<{ siteId: string }, { success: boolean; analysis: SiteAnalysis }>(
        functions, "analyzeWebsiteWithAI"
      );
      const res = await fn({ siteId });
      setAnalysis(res.data.analysis);
      toast.success("Site analysis complete!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const BusinessIcon = BUSINESS_ICONS[analysis?.businessType ?? ""] ?? Brain;

  if (!analysis) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">AI Site Analysis</h3>
        </div>
        <div className="text-center py-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
            <Sparkles className="h-5 w-5 text-rose-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">Understand your tracking gaps</p>
          <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto leading-relaxed">
            Pigxel uses AI to read your website and identify what you sell, who your customers are,
            and what you should be tracking — so you can compare it against your scan results.
          </p>
          <NeonButton onClick={handleAnalyse} disabled={loading} className="gap-2">
            {loading
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Analysing…</>
              : <><Sparkles className="h-3.5 w-3.5" />Analyse my site</>
            }
          </NeonButton>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-rose-400" />
          <h3 className="text-sm font-semibold text-slate-900">AI Site Analysis</h3>
        </div>
        <button
          onClick={handleAnalyse}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-500 transition-colors disabled:pointer-events-none"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Re-analyse
        </button>
      </div>

      <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 shrink-0">
          <BusinessIcon className="h-4 w-4 text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 capitalize">{analysis.businessType}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{analysis.businessDescription}</p>
        </div>
      </div>

      {analysis.keyConversionActions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2.5">
            What you should be tracking
          </p>
          <div className="space-y-2">
            {analysis.keyConversionActions.map((action, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className={cn(
                  "shrink-0 px-2 py-0.5 rounded-full font-medium border text-xs",
                  URGENCY_STYLES[action.urgency]
                )}>
                  {action.urgency}
                </span>
                <span className="text-sm text-slate-700">{action.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.suggestedTrackingGoals.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2.5">
            Tracking goals
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.suggestedTrackingGoals.map((goal, i) => (
              <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600">
                <CheckCircle2 className="h-3 w-3 text-slate-400 shrink-0" />
                {goal}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4">
        Analysed {new Date(analysis.analyzedAt).toLocaleDateString()}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PulsePage() {
  const params  = useParams();
  const siteId  = params.siteId as string;
  const router  = useRouter();

  const [site,            setSite]           = useState<SiteData | null>(null);
  const [loading,         setLoading]        = useState(true);
  const [scanLoading,     setScanLoading]    = useState(false);
  const [scanError,       setScanError]      = useState<string | null>(null);
  const [aiPlanExpanded,  setAiPlanExpanded] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    const unsub = onSnapshot(
      doc(db, "sites", siteId),
      (snap) => {
        setSite(snap.exists() ? ({ id: snap.id, ...snap.data() } as SiteData) : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [siteId]);

  const handleScan = async () => {
    if (!site) return;
    setScanError(null);
    setScanLoading(true);
    try {
      const scan = httpsCallable<{ siteId: string; url: string }, { success: boolean; count: number }>(
        functions, "scanSite"
      );
      await scan({ siteId, url: site.url });
      toast.success("Scan complete — results updated below.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed. Please try again.";
      setScanError(msg);
      toast.error(msg);
    } finally {
      setScanLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <SidebarLayout>
          <div className="flex h-full items-center justify-center min-h-[60vh]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
          </div>
        </SidebarLayout>
      </AuthGuard>
    );
  }

  if (!site) {
    return (
      <AuthGuard>
        <SidebarLayout>
          <div className="flex h-full items-center justify-center p-8 min-h-[60vh]">
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-4">Project not found.</p>
              <button onClick={() => router.push("/dashboard")} className="text-sm text-rose-500 hover:text-rose-600 font-medium">
                Back to workspace
              </button>
            </div>
          </div>
        </SidebarLayout>
      </AuthGuard>
    );
  }

  const lastScan  = site.pixel_audit?.audit_timestamp;
  const hasAiPlan = !!site.ai_plan_status && site.ai_plan_status !== "none";

  return (
    <AuthGuard>
      <SidebarLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-10 animate-fade-in">

          {/* ── Page header ─────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Health</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {lastScan
                  ? `Last scanned ${new Date(lastScan).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                  : "No scan run yet"}
              </p>
            </div>
            <NeonButton onClick={handleScan} disabled={scanLoading} className="shrink-0 gap-2">
              {scanLoading ? (
                <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Scanning…</>
              ) : (
                <><RefreshCw className="h-3.5 w-3.5" />{site.pixel_audit ? "Re-scan" : "Run scan"}</>
              )}
            </NeonButton>
          </div>

          {scanError && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
              {scanError}
            </div>
          )}

          <div className="space-y-4">

            {/* ── Tracking scan results ─────────────────────────── */}
            <AuditStatusCard audit={site.pixel_audit} />

            {/* ── AI Site Analysis ──────────────────────────────── */}
            <AiAnalysisCard siteId={siteId} analysis={site.ai_analysis} />

            {/* ── AI Tracking Plan (accordion) ──────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setAiPlanExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 border border-rose-100 shrink-0">
                    <Sparkles className="h-4 w-4 text-rose-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900">AI Tracking Plan</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hasAiPlan && site.ai_plan_status === "applied"
                        ? "Plan applied — re-run to update"
                        : hasAiPlan
                        ? "Plan in progress — review and apply"
                        : "Analyse your site and generate a recommended tracking setup"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {site.ai_plan_status === "applied" && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Applied
                    </span>
                  )}
                  {aiPlanExpanded
                    ? <ChevronUp className="h-4 w-4 text-slate-400" />
                    : <ChevronDown className="h-4 w-4 text-slate-400" />
                  }
                </div>
              </button>
              {aiPlanExpanded && (
                <div className="border-t border-slate-100 p-5">
                  <AiSetupPanel
                    siteId={siteId}
                    aiPlanStatus={site.ai_plan_status}
                    analysis={site.ai_analysis}
                    draftPlan={site.ai_draft_plan}
                    onApplied={() => {}}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      </SidebarLayout>
    </AuthGuard>
  );
}
