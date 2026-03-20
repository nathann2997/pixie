"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SidebarLayout } from "@/components/layouts/sidebar-layout";
import { AddEventModal } from "@/components/dashboard/add-event-modal";
import { ConversionCard, type ConversionEvent } from "@/components/dashboard/conversion-card";
import { SuggestedRulesList } from "@/components/dashboard/suggested-rules-list";
import { EventChat } from "@/components/dashboard/event-chat";
import { NeonButton } from "@/components/ui/neon-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizeEvents, type EventRule } from "@/lib/normalize-event";
import { type Platform, PLATFORMS } from "@/lib/platform-events";
import {
  Plus,
  Search,
  Target,
  BarChart2,
  Share2,
  Layers,
  X,
  Sparkles,
  Library,
  Hammer,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuggestedEvent {
  selector: string;
  text: string;
  type: "button" | "submit" | "link";
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

interface SiteAnalysis {
  businessType: string;
  businessDescription: string;
  primaryProducts: string[];
  targetAudience: string;
  keyConversionActions: Array<{
    action: string;
    intent: "purchase" | "lead_generation" | "signup" | "contact" | "engagement" | "download";
    urgency: "high" | "medium" | "low";
  }>;
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

interface TrackingConfig {
  pixels: { ga4?: string; meta?: string; tiktok?: string; linkedin?: string; google_ads?: string };
  events: EventRule[];
}

interface SiteData {
  id: string;
  name?: string;
  url: string;
  trackingConfig: TrackingConfig;
  suggested_events?: SuggestedEvent[];
  ai_plan_status?: "none" | "analysed" | "draft_ready" | "applied";
  ai_analysis?: SiteAnalysis;
  ai_draft_plan?: TrackingDraft;
}

// ─── Platform tabs ────────────────────────────────────────────────────────────

const ALL_PLATFORM_TABS = [
  { key: "all",        label: "All",        icon: Layers    },
  { key: "ga4",        label: "GA4",        icon: BarChart2 },
  { key: "meta",       label: "Meta",       icon: Share2    },
  { key: "tiktok",     label: "TikTok",     icon: null      },
  { key: "linkedin",   label: "LinkedIn",   icon: null      },
  { key: "google_ads", label: "Google Ads",  icon: null      },
];

const PLATFORM_COLORS: Record<string, { active: string; count: string }> = {
  all:        { active: "bg-rose-50 border-rose-200 text-rose-600",      count: "bg-rose-100 text-rose-600" },
  ga4:        { active: "bg-blue-50 border-blue-200 text-blue-600",      count: "bg-blue-100 text-blue-600" },
  meta:       { active: "bg-indigo-50 border-indigo-200 text-indigo-600", count: "bg-indigo-100 text-indigo-600" },
  tiktok:     { active: "bg-slate-100 border-slate-400 text-slate-800",  count: "bg-slate-200 text-slate-700" },
  linkedin:   { active: "bg-sky-50 border-sky-200 text-sky-600",         count: "bg-sky-100 text-sky-600" },
  google_ads: { active: "bg-amber-50 border-amber-200 text-amber-600",  count: "bg-amber-100 text-amber-600" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const params  = useParams();
  const siteId  = params.siteId as string;
  const router  = useRouter();

  const [site,            setSite]           = useState<SiteData | null>(null);
  const [loading,         setLoading]        = useState(true);
  const [searchQuery,     setSearchQuery]    = useState("");
  const [activePlatform,  setActivePlatform] = useState("all");
  const [addEventOpen,    setAddEventOpen]   = useState(false);
  const [deletingId,      setDeletingId]     = useState<string | null>(null);
  const [scanLoading,     setScanLoading]    = useState(false);
  const [scanError,       setScanError]      = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Real-time listener ───────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    const unsub = onSnapshot(
      doc(db, "sites", siteId),
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data();
          const events = normalizeEvents(raw.trackingConfig?.events ?? []);
          setSite({
            id: snap.id,
            ...raw,
            trackingConfig: { ...raw.trackingConfig, events },
          } as SiteData);
        } else {
          setSite(null);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [siteId]);

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

  // ── Derived ──────────────────────────────────────────────────────────────
  const allEvents: EventRule[] = site?.trackingConfig?.events ?? [];
  const suggested: SuggestedEvent[]  = site?.suggested_events ?? [];
  const config = site?.trackingConfig ?? { pixels: {}, events: [] };

  const visiblePlatforms = useMemo(() => {
    const used = new Set(allEvents.flatMap((e) => e.platforms));
    return ALL_PLATFORM_TABS.filter((p) => p.key === "all" || used.has(p.key as Platform));
  }, [allEvents]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allEvents.length };
    allEvents.forEach((e) => {
      for (const p of e.platforms) {
        counts[p] = (counts[p] ?? 0) + 1;
      }
    });
    return counts;
  }, [allEvents]);

  const filteredEvents = useMemo(() => {
    let evs = allEvents;
    if (activePlatform !== "all") evs = evs.filter((e) => e.platforms.includes(activePlatform as Platform));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      evs = evs.filter(
        (e) =>
          e.displayName.toLowerCase().includes(q) ||
          e.selector.toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q)
      );
    }
    return evs;
  }, [allEvents, activePlatform, searchQuery]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDelete = async (eventId: string) => {
    if (!site) return;
    setDeletingId(eventId);
    try {
      const updated = allEvents.filter((e) => e.id !== eventId);
      await updateDoc(doc(db, "sites", siteId), {
        trackingConfig: { ...site.trackingConfig, events: updated },
      });
      toast.success("Event removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove event");
    } finally {
      setDeletingId(null);
    }
  };

  const handleScan = async () => {
    if (!site) return;
    setScanError(null);
    setScanLoading(true);
    try {
      const scan = httpsCallable<{ siteId: string; url: string }, { success: boolean; count: number }>(
        functions, "scanSite"
      );
      await scan({ siteId, url: site.url });
      toast.success("Scan complete — review your suggestions below.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed. Please try again.";
      setScanError(msg);
      toast.error(msg);
    } finally {
      setScanLoading(false);
    }
  };

  // ── Loading / not-found ───────────────────────────────────────────────────
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


  return (
    <AuthGuard>
      <SidebarLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-10 animate-fade-in">

          <AddEventModal
            open={addEventOpen}
            onOpenChange={setAddEventOpen}
            siteId={siteId}
            currentTrackingConfig={config}
          />

          {/* ── Page header ───────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Events</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {allEvents.length === 0
                  ? "Define what Pigxel tracks for you"
                  : `${allEvents.length} event${allEvents.length !== 1 ? "s" : ""} · ${visiblePlatforms.length - 1} platform${visiblePlatforms.length - 1 !== 1 ? "s" : ""}`}
              </p>
            </div>
            <NeonButton onClick={() => setAddEventOpen(true)} className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              Add event
            </NeonButton>
          </div>

          {/* ── Two tabs ──────────────────────────────────────────── */}
          <Tabs defaultValue="library" className="w-full">
            <TabsList className="w-full sm:w-auto bg-slate-100 border border-slate-200 p-0.5 h-auto mb-6">
              <TabsTrigger
                value="library"
                className="gap-2 text-sm data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-500 rounded-md px-4 py-2"
              >
                <Library className="h-3.5 w-3.5" />
                Library
                {allEvents.length > 0 && (
                  <span className="ml-0.5 text-xs font-medium text-slate-400 data-[state=active]:text-slate-600">
                    {allEvents.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="builder"
                className="gap-2 text-sm data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-500 rounded-md px-4 py-2"
              >
                <Hammer className="h-3.5 w-3.5" />
                Builder
                {suggested.length > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">
                    {suggested.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ══════════════════════════════════════════ */}
            {/* TAB 1: LIBRARY                            */}
            {/* ══════════════════════════════════════════ */}
            <TabsContent value="library" className="mt-0">
              {allEvents.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 mx-auto mb-5">
                    <Sparkles className="h-6 w-6 text-rose-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">No events yet</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
                    Events are the actions you care about — button clicks, form submissions, and page visits.
                    Switch to the <span className="font-medium text-slate-700">Builder</span> tab to let AI suggest what to track, or add events manually.
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      onClick={() => setAddEventOpen(true)}
                      className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add manually
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="Search events…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-9 h-10 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition-colors"
                    />
                    {!searchQuery && (
                      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                        /
                      </kbd>
                    )}
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Platform tabs */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {visiblePlatforms.map((p) => {
                      const count   = platformCounts[p.key] ?? 0;
                      const isActive = activePlatform === p.key;
                      const Icon    = p.icon;
                      return (
                        <button
                          key={p.key}
                          onClick={() => setActivePlatform(p.key)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                            isActive
                              ? (PLATFORM_COLORS[p.key]?.active ?? "bg-rose-50 border-rose-200 text-rose-600")
                              : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300"
                          )}
                        >
                          {Icon && <Icon className="h-3.5 w-3.5" />}
                          {p.label}
                          <span className={cn(
                            "inline-flex items-center justify-center min-w-[1.25rem] px-1.5 rounded-full text-xs font-semibold",
                            isActive ? (PLATFORM_COLORS[p.key]?.count ?? "bg-rose-100 text-rose-600") : "bg-slate-100 text-slate-500"
                          )}>
                            {p.key === "all" ? allEvents.length : count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Events */}
                  {filteredEvents.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 mx-auto mb-3">
                        {searchQuery ? <Search className="h-4 w-4 text-slate-400" /> : <Target className="h-4 w-4 text-slate-400" />}
                      </div>
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        {searchQuery
                          ? `No results for "${searchQuery}"`
                          : `No events for ${ALL_PLATFORM_TABS.find((p) => p.key === activePlatform)?.label ?? activePlatform}`}
                      </p>
                      <p className="text-xs text-slate-400">
                        {searchQuery ? "Try a different search term." : "Add an event and assign it to this platform."}
                      </p>
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="mt-3 text-xs text-rose-500 hover:text-rose-600 font-medium">
                          Clear search
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredEvents.map((event) => (
                        <ConversionCard
                          key={event.id}
                          event={{
                            selector: event.selector,
                            trigger: event.trigger,
                            platform: event.platforms[0] ?? 'ga4',
                            event_name: event.displayName,
                            description: event.description,
                            google_ads_conversion_label: event.platformFields?.google_ads_conversion_label,
                            linkedin_conversion_id: event.platformFields?.linkedin_conversion_id,
                          }}
                          index={0}
                          onDelete={() => handleDelete(event.id)}
                          deleting={deletingId === event.id}
                          siteUrl={site.url}
                        />
                      ))}
                      {searchQuery && filteredEvents.length > 0 && (
                        <p className="text-xs text-slate-400 text-center pt-2">
                          {filteredEvents.length} result{filteredEvents.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ══════════════════════════════════════════ */}
            {/* TAB 2: BUILDER                            */}
            {/* ══════════════════════════════════════════ */}
            <TabsContent value="builder" className="mt-0 space-y-5">

              {/* ── AI Chat ───────────────────────────────────────── */}
              <EventChat
                siteId={siteId}
                siteUrl={site.url}
                trackingConfig={config}
              />

              {/* ── AI scan suggestions ───────────────────────────── */}
              {(suggested.length > 0 || scanError) && (
                <div className="bg-white border border-rose-100 rounded-xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-rose-50/40">
                    <Sparkles className="h-4 w-4 text-rose-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">Opportunities found</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {suggested.length > 1
                          ? `${suggested.length} things on your site worth tracking — review and pick what matters.`
                          : "1 thing on your site worth tracking — review and pick what matters."}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-rose-600 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full shrink-0">
                      {suggested.length} new
                    </span>
                  </div>
                  <div className="p-5">
                    <SuggestedRulesList
                      siteId={siteId}
                      suggested={suggested}
                      currentTrackingConfig={config}
                      onUpdate={() => {}}
                    />
                  </div>
                </div>
              )}

              {/* ── Scan my site CTA (if no suggestions yet) ─────── */}
              {suggested.length === 0 && !scanError && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-1">Scan your site for events</p>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                      Pigxel can scan your website and automatically find buttons, forms, and links that could be tracked as conversion events.
                    </p>
                  </div>
                  <button
                    onClick={handleScan}
                    disabled={scanLoading}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {scanLoading ? (
                      <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />Scanning…</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5" />Scan my site</>
                    )}
                  </button>
                </div>
              )}

              {scanError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                  {scanError}
                </div>
              )}

            </TabsContent>
          </Tabs>

        </div>
      </SidebarLayout>
    </AuthGuard>
  );
}
