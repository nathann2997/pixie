"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SidebarLayout } from "@/components/layouts/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/ui/status-badge";
import { PixelConfigForm } from "@/components/dashboard/pixel-config-form";
import { DeleteSiteModal } from "@/components/dashboard/delete-site-modal";
import { EditSiteModal } from "@/components/dashboard/edit-site-modal";
import { VerifyInstallation } from "@/components/dashboard/verify-installation";
import { GoLiveDialog } from "@/components/dashboard/go-live-dialog";
import { NeonButton } from "@/components/ui/neon-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Zap,
  BarChart2,
  Share2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PixelAudit {
  audit_timestamp: string;
  page_url: string;
  detected_pixels: string[];
  script_installed: boolean;
}

interface SiteData {
  id: string;
  name?: string;
  url: string;
  status: "pending" | "active" | "paused";
  owner_id: string;
  trackingConfig: {
    pixels: { ga4?: string; meta?: string; tiktok?: string; linkedin?: string; google_ads?: string };
    events: Array<{ selector: string; trigger: string; platform: string; event_name: string }>;
  };
  pixel_audit?: PixelAudit;
}

const defaultTrackingConfig: SiteData["trackingConfig"] = { pixels: { ga4: "", meta: "" }, events: [] };

function formatHostname(url: string) {
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname; }
  catch { return url; }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SiteSetupPage() {
  const params  = useParams();
  const siteId  = params.siteId as string;

  const [site,       setSite]      = useState<SiteData | null>(null);
  const [loading,    setLoading]   = useState(true);
  const [copied,     setCopied]    = useState(false);
  const [updating,   setUpdating]  = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen,   setEditOpen]  = useState(false);
  const [menuOpen,   setMenuOpen]  = useState(false);
  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [goLiveAction, setGoLiveAction] = useState<"activate" | "pause">("activate");

  const router = useRouter();

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

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

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

  const getScriptTag = () => {
    const scriptUrl = "https://pixie-b5d33.web.app/pigxel.js";
    const apiUrl    = "https://us-central1-pixie-b5d33.cloudfunctions.net";
    return `<script\n  src="${scriptUrl}?id=${siteId}"\n  data-api="${apiUrl}"\n></script>`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getScriptTag());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — please select and copy manually.");
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AuthGuard>
        <SidebarLayout>
          <div className="flex h-full items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-400 border-t-transparent mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading…</p>
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
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 text-center max-w-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Project not found</h2>
              <p className="text-sm text-slate-500 mb-6">
                This project doesn&apos;t exist or you don&apos;t have permission to view it.
              </p>
              <Button onClick={() => router.push("/dashboard")} className="bg-rose-400 hover:bg-rose-500 text-white">
                Back to workspace
              </Button>
            </div>
          </div>
        </SidebarLayout>
      </AuthGuard>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const config          = site.trackingConfig ?? defaultTrackingConfig;
  const hostname        = formatHostname(site.url);
  const displayName     = site.name || hostname;
  const hasGA4          = !!config.pixels?.ga4;
  const hasMeta         = !!config.pixels?.meta;
  const hasAnalytics    = hasGA4 || hasMeta;
  const isScriptInstalled = !!site.pixel_audit;
  const readyToGoLive   = site.status === "pending";

  return (
    <AuthGuard>
      <SidebarLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-10 animate-fade-in">

          <DeleteSiteModal open={deleteOpen} onOpenChange={setDeleteOpen} siteId={siteId} siteName={displayName} />
          <EditSiteModal   open={editOpen}   onOpenChange={setEditOpen}   siteId={siteId} currentName={site.name ?? ""} currentUrl={site.url} />
          <GoLiveDialog
            open={goLiveOpen}
            onOpenChange={setGoLiveOpen}
            action={goLiveAction}
            onConfirm={confirmStatusToggle}
            loading={updating}
            pixelConfig={config.pixels ?? {}}
            eventCount={config.events?.length ?? 0}
          />

          {/* ── Page header ─────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">

              {/* Site identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap mb-1">
                  <h1 className="text-lg font-semibold text-slate-900 tracking-tight truncate">
                    {displayName}
                  </h1>
                  <StatusBadge status={site.status} />
                </div>
                <a
                  href={site.url.startsWith("http") ? site.url : `https://${site.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors"
                >
                  {hostname}
                  <ExternalLink className="h-3 w-3" />
                </a>

                {/* Status dots */}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {[
                    { ok: isScriptInstalled, label: "Script" },
                    { ok: hasGA4,            label: "GA4"    },
                    { ok: hasMeta,           label: "Meta"   },
                  ].map(({ ok, label }) => (
                    <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", ok ? "bg-emerald-400" : "bg-slate-300")} />
                      {label}
                    </span>
                  ))}
                </div>

                {/* Contextual inline notice */}
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
              </div>

              {/* Toggle + kebab */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <span className={cn(
                    "text-xs font-medium",
                    site.status === "active" ? "text-emerald-600" : "text-slate-400"
                  )}>
                    {site.status === "active" ? "Live" : site.status === "paused" ? "Paused" : "Setup"}
                  </span>
                  <Switch
                    checked={site.status === "active"}
                    onCheckedChange={handleStatusToggle}
                    disabled={updating}
                    aria-label="Toggle tracking live"
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                    className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                    aria-label="Project actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuOpen && (
                    <div
                      className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-white border border-slate-200 shadow-lg overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit project
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete project
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Step 1 — Install script ──────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 p-5 border-b border-slate-100">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg shrink-0 text-xs font-bold",
                  isScriptInstalled
                    ? "bg-emerald-100 border border-emerald-200 text-emerald-700"
                    : "bg-rose-50 border border-rose-100 text-rose-500"
                )}>
                  {isScriptInstalled ? <CheckCircle2 className="h-4 w-4" /> : "1"}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-900">Install the Pigxel script</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isScriptInstalled
                      ? `Detected — last seen ${
                          site.pixel_audit?.audit_timestamp
                            ? new Date(site.pixel_audit.audit_timestamp).toLocaleDateString()
                            : "recently"
                        }`
                      : "Add this code to every page, inside the <head> tag."}
                  </p>
                </div>
                {isScriptInstalled && (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                    ✓ Installed
                  </span>
                )}
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500 mb-3">
                  Copy the code below and paste it before the{" "}
                  <code className="text-rose-500 bg-rose-50 px-1 py-0.5 rounded border border-rose-100">&lt;/head&gt;</code>{" "}
                  tag on every page.
                </p>
                <div className="relative">
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3.5 text-xs overflow-x-auto scrollbar-thin font-mono text-slate-600 leading-relaxed pr-24">
                    <code>{getScriptTag()}</code>
                  </pre>
                  <button
                    onClick={copyToClipboard}
                    className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    {copied ? (
                      <><Check className="h-3.5 w-3.5 text-emerald-500" />Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" />Copy</>
                    )}
                  </button>
                </div>
                {!isScriptInstalled && (
                  <p className="text-xs text-slate-400 mt-3">
                    Once installed, Pigxel will automatically detect the script and update your status.
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <VerifyInstallation siteId={siteId} siteUrl={site.url} />
                </div>
              </div>
            </div>

            {/* ── Step 2 — Connect analytics ─────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 p-5 border-b border-slate-100">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg shrink-0 text-xs font-bold",
                  hasAnalytics
                    ? "bg-emerald-100 border border-emerald-200 text-emerald-700"
                    : "bg-rose-50 border border-rose-100 text-rose-500"
                )}>
                  {hasAnalytics ? <CheckCircle2 className="h-4 w-4" /> : "2"}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-900">Connect your analytics</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {hasAnalytics
                      ? `Connected: ${[hasGA4 && "Google Analytics 4", hasMeta && "Meta Pixel"].filter(Boolean).join(" · ")}`
                      : "Add your Google Analytics or Meta Pixel ID."}
                  </p>
                </div>
                {hasAnalytics && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasGA4 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                        <BarChart2 className="h-3 w-3" /> GA4
                      </span>
                    )}
                    {hasMeta && (
                      <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                        <Share2 className="h-3 w-3" /> Meta
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="p-5">
                <PixelConfigForm
                  siteId={siteId}
                  initialPixels={config.pixels ?? { ga4: "", meta: "" }}
                  currentTrackingConfig={config}
                  compact
                />
              </div>
            </div>
          </div>

        </div>
      </SidebarLayout>
    </AuthGuard>
  );
}
