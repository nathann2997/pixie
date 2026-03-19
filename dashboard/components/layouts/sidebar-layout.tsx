"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useFirebase } from "@/components/providers/firebase-provider";
import {
  Settings,
  Settings2,
  LogOut,
  Menu,
  X,
  HelpCircle,
  Globe,
  Activity,
  Target,
  ChevronDown,
  Plus,
  Check,
} from "lucide-react";
import { AddSiteModal } from "@/components/dashboard/add-site-modal";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractSiteId(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const RESERVED = new Set(["settings", "docs"]);
  if (parts[0] === "dashboard" && parts[1] && !RESERVED.has(parts[1])) {
    return parts[1];
  }
  return null;
}

function formatHostname(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SiteSnap {
  name?: string;
  url: string;
  status: "pending" | "active" | "paused";
}

interface SiteListItem {
  id: string;
  name?: string;
  url: string;
  status: "pending" | "active" | "paused";
}

interface SidebarLayoutProps {
  children: React.ReactNode;
}

interface NavContentProps {
  siteId: string | null;
  activeSite: SiteSnap | null;
  sites: SiteListItem[];
  pathname: string;
  navigate: (href: string) => void;
  handleSignOut: () => void;
  displayName: string;
  initials: string;
  email?: string;
  onAddSite: () => void;
}

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: SiteSnap["status"] }) {
  return (
    <span
      className={cn(
        "shrink-0 h-2 w-2 rounded-full",
        status === "active" ? "bg-emerald-400" : status === "paused" ? "bg-amber-400" : "bg-slate-300"
      )}
    />
  );
}

// ── Nav content ───────────────────────────────────────────────────────────────

function NavContent({
  siteId,
  activeSite,
  sites,
  pathname,
  navigate,
  handleSignOut,
  displayName,
  initials,
  email,
  onAddSite,
}: NavContentProps) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const isActivePath = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  // Close dropdown on outside click
  useEffect(() => {
    if (!switcherOpen) return;
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [switcherOpen]);

  const siteNav = siteId
    ? [
        { label: "Setup",  href: `/dashboard/${siteId}`,        icon: Settings2, exact: true  },
        { label: "Events", href: `/dashboard/${siteId}/events`, icon: Target,    exact: false },
        { label: "Health", href: `/dashboard/${siteId}/health`, icon: Activity,  exact: false },
      ]
    : [];

  const activeSiteName = activeSite
    ? activeSite.name || formatHostname(activeSite.url)
    : null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-thin py-3 space-y-0.5">

        {/* ── Site switcher dropdown ── */}
        <div className="px-3 pb-2" ref={switcherRef}>
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors text-left",
              switcherOpen
                ? "bg-rose-50 border-rose-200"
                : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
            )}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white border border-slate-200 shrink-0">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              {activeSiteName ? (
                <>
                  <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{activeSiteName}</p>
                  <p className="text-xs text-slate-400 truncate">{activeSite ? formatHostname(activeSite.url) : ""}</p>
                </>
              ) : (
                <p className="text-xs font-medium text-slate-500">Select a site</p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform",
                switcherOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown */}
          {switcherOpen && (
            <div className="absolute left-3 right-3 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {sites.length > 0 ? (
                <div className="py-1 max-h-52 overflow-y-auto">
                  {sites.map((s) => {
                    const isActive = s.id === siteId;
                    const name = s.name || formatHostname(s.url);
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          navigate(`/dashboard/${s.id}`);
                          setSwitcherOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          isActive ? "bg-rose-50" : "hover:bg-slate-50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            isActive ? "text-rose-600" : "text-slate-800"
                          )}>
                            {name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{formatHostname(s.url)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusDot status={s.status} />
                          {isActive && <Check className="h-3.5 w-3.5 text-rose-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 py-3 text-xs text-slate-400">No sites yet</p>
              )}
              <div className="border-t border-slate-100">
                <button
                  onClick={() => {
                    setSwitcherOpen(false);
                    onAddSite();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  Add new site
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Site-level nav (no label) ── */}
        {siteId && (
          <nav className="px-3">
            {siteNav.map((item) => {
              const active = isActivePath(item.href, item.exact);
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left",
                    active
                      ? "bg-rose-50 text-rose-600"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <item.icon
                    className={cn("h-4 w-4 shrink-0", active ? "text-rose-500" : "text-slate-400")}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* ── Bottom: settings + help + user ── */}
      <div className="p-3 border-t border-slate-200 space-y-0.5 shrink-0">
        {/* Settings */}
        <button
          onClick={() => navigate("/dashboard/settings")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            isActivePath("/dashboard/settings")
              ? "bg-rose-50 text-rose-600"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <Settings
            className={cn(
              "h-4 w-4 shrink-0",
              isActivePath("/dashboard/settings") ? "text-rose-500" : "text-slate-400"
            )}
            strokeWidth={isActivePath("/dashboard/settings") ? 2.5 : 2}
          />
          <span>Settings</span>
        </button>

        {/* Help */}
        <button
          onClick={() => navigate("/dashboard/docs")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            isActivePath("/dashboard/docs")
              ? "bg-rose-50 text-rose-600"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <HelpCircle
            className={cn(
              "h-4 w-4 shrink-0",
              isActivePath("/dashboard/docs") ? "text-rose-500" : "text-slate-400"
            )}
            strokeWidth={2}
          />
          <span>Help & Setup</span>
        </button>

        {/* User row */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors group cursor-default">
          <div className="flex-shrink-0 h-7 w-7 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 text-xs font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{displayName}</p>
            {email && displayName !== email.split("@")[0] && (
              <p className="text-xs text-slate-400 truncate">{email}</p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-500 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [activeSite,   setActiveSite]   = useState<SiteSnap | null>(null);
  const [sites,        setSites]        = useState<SiteListItem[]>([]);
  const [addSiteOpen,  setAddSiteOpen]  = useState(false);

  const pathname  = usePathname();
  const router    = useRouter();
  const { user }  = useFirebase();

  const siteId = extractSiteId(pathname);

  // Subscribe to active site
  useEffect(() => {
    if (!siteId) { setActiveSite(null); return; }
    const unsub = onSnapshot(
      doc(db, "sites", siteId),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data() as SiteSnap;
          setActiveSite({ name: d.name, url: d.url, status: d.status });
        } else {
          setActiveSite(null);
        }
      },
      () => setActiveSite(null)
    );
    return () => unsub();
  }, [siteId]);

  // Subscribe to all user's sites (for the switcher list)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "sites"), where("owner_id", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: SiteListItem[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as SiteListItem));
        setSites(items);
      },
      () => {}
    );
    return () => unsub();
  }, [user]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const navigate = (href: string) => {
    router.push(href);
    setSidebarOpen(false);
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Account";
  const initials    = displayName.charAt(0).toUpperCase();

  const navProps: NavContentProps = {
    siteId,
    activeSite,
    sites,
    pathname,
    navigate,
    handleSignOut,
    displayName,
    initials,
    email:     user?.email ?? undefined,
    onAddSite: () => setAddSiteOpen(true),
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* Modal lives here so it can overlay everything */}
      <AddSiteModal open={addSiteOpen} onOpenChange={setAddSiteOpen} />

      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-slate-200 shrink-0 relative">
        {/* Logo — bigger */}
        <div className="flex items-center px-5 py-4 border-b border-slate-100 shrink-0">
          <button onClick={() => navigate("/dashboard")} className="focus-visible:outline-none">
            <Image
              src="/pigxel.jpg"
              alt="Pigxel"
              width={130}
              height={44}
              className="object-contain h-11 w-auto"
              priority
            />
          </button>
        </div>
        <NavContent {...navProps} />
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Image
          src="/pigxel.jpg"
          alt="Pigxel"
          width={80}
          height={28}
          className="object-contain h-7 w-auto"
          priority
        />
        {activeSite && (
          <div className="flex items-center gap-1.5 ml-auto">
            <StatusDot status={activeSite.status} />
            <span className="text-xs text-slate-600 font-medium truncate max-w-[120px]">
              {activeSite.name || formatHostname(activeSite.url)}
            </span>
          </div>
        )}
      </div>

      {/* ── Mobile sidebar overlay ────────────────────────────── */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 lg:hidden flex flex-col animate-slide-in-left relative">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 shrink-0">
              <Image
                src="/pigxel.jpg"
                alt="Pigxel"
                width={90}
                height={32}
                className="object-contain h-8 w-auto"
              />
              <button
                onClick={() => setSidebarOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavContent {...navProps} />
          </aside>
        </>
      )}

      {/* ── Main content ──────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto scrollbar-thin lg:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}
