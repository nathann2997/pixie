"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirebase } from '@/components/providers/firebase-provider';
import { AuthGuard } from '@/components/auth/auth-guard';
import { SidebarLayout } from '@/components/layouts/sidebar-layout';
import { StatusBadge, type StatusVariant } from '@/components/ui/status-badge';
import { NeonButton } from '@/components/ui/neon-button';
import { AddSiteModal } from '@/components/dashboard/add-site-modal';
import { Plus, Globe, ArrowRight } from 'lucide-react';

interface Site {
  id: string;
  name?: string;
  url: string;
  status: 'pending' | 'active' | 'paused';
  owner_id: string;
  last_event_at?: { seconds: number; nanoseconds: number } | null;
  created_at?: unknown;
  trackingConfig?: {
    pixels?: { ga4?: string; meta?: string; tiktok?: string; linkedin?: string; google_ads?: string };
    events?: unknown[];
  };
}

function getConnectedPlatforms(site: Site): string[] {
  const p = site.trackingConfig?.pixels || {};
  const connected: string[] = [];
  if (p.ga4) connected.push('Google Analytics');
  if (p.meta) connected.push('Meta Pixel');
  return connected;
}

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

function ProjectCard({ site, onClick }: { site: Site; onClick: () => void }) {
  const platforms = getConnectedPlatforms(site);
  const eventCount = site.trackingConfig?.events?.length ?? 0;
  const hostname = (() => {
    try { return new URL(site.url.startsWith('http') ? site.url : `https://${site.url}`).hostname; }
    catch { return site.url; }
  })();
  const displayName = site.name || hostname;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md hover:border-slate-300 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Globe className="h-4 w-4 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
              {displayName}
            </p>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {hostname !== displayName ? hostname : site.url}
            </p>
          </div>
        </div>
        <StatusBadge status={site.status as StatusVariant} className="shrink-0 mt-0.5" />
      </div>

      {/* Connected data sources + open arrow */}
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
            <p className="text-xs text-slate-400">No analytics connected</p>
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
              : "Waiting for first event\u2026"}
          </p>
        </div>
      )}
    </button>
  );
}

export default function WorkspacePage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const { user } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'sites'),
      where('owner_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sitesData: Site[] = [];
        snapshot.forEach((doc) => sitesData.push({ id: doc.id, ...doc.data() } as Site));
        setSites(sitesData);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [user]);

  const liveSites = sites.filter((s) => s.status === 'active').length;
  const setupRequired = sites.filter((s) => s.status === 'pending').length;

  return (
    <AuthGuard>
      <SidebarLayout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
          <AddSiteModal
            open={addSiteOpen}
            onOpenChange={setAddSiteOpen}
          />

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Projects</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {loading
                  ? 'Loading…'
                  : sites.length === 0
                    ? 'Add your first project to start tracking'
                    : `${sites.length} project${sites.length !== 1 ? 's' : ''}${liveSites > 0 ? ` · ${liveSites} live` : ''}${setupRequired > 0 ? ` · ${setupRequired} need setup` : ''}`
                }
              </p>
            </div>
            <NeonButton onClick={() => setAddSiteOpen(true)} className="shrink-0">
              <Plus className="h-4 w-4 mr-1.5" />
              New project
            </NeonButton>
          </div>

          {/* Body */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 animate-pulse">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : sites.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100">
                <Globe className="h-6 w-6 text-rose-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Your workspace is empty</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
                Add a new project to start. Pigxel will organize your tracking for
                Google Analytics, Meta Pixel, and more.
              </p>
              <NeonButton onClick={() => setAddSiteOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add your first project
              </NeonButton>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sites.map((site) => (
                <ProjectCard
                  key={site.id}
                  site={site}
                  onClick={() => router.push(`/dashboard/${site.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </SidebarLayout>
    </AuthGuard>
  );
}
