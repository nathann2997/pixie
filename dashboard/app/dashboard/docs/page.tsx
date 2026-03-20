"use client";

import { useEffect, useRef, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SidebarLayout } from "@/components/layouts/sidebar-layout";
import {
  CheckCircle2,
  ChevronRight,
  Layers,
  MousePointerClick,
  Globe,
  BarChart2,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Share2,
  Target,
} from "lucide-react";

// ── Section anchor IDs ──────────────────────────────────────────
const NAV = [
  { id: "how-it-works",         label: "How Pigxel works" },
  { id: "pigxel-vs-gtm",        label: "Pigxel vs GTM" },
  { id: "add-site",             label: "Add your first project" },
  { id: "install-script",       label: "Install the script" },
  { id: "platform-shopify",     label: "  Shopify" },
  { id: "platform-wordpress",   label: "  WordPress" },
  { id: "platform-webflow",     label: "  Webflow" },
  { id: "platform-squarespace", label: "  Squarespace" },
  { id: "platform-wix",         label: "  Wix" },
  { id: "platform-html",        label: "  Any website" },
  { id: "health-check",         label: "Health Check" },
  { id: "analytics-ids",        label: "Connecting analytics" },
  { id: "event-builder",        label: "Event Builder" },
  { id: "events-ga4",           label: "  Google Analytics 4" },
  { id: "events-meta",          label: "  Meta / Facebook" },
  { id: "events-linkedin",      label: "  LinkedIn" },
  { id: "events-tiktok",        label: "  TikTok" },
  { id: "conversions-discover", label: "AI site scan" },
  { id: "go-live",              label: "Going live" },
  { id: "status-labels",        label: "Status labels" },
  { id: "troubleshooting",      label: "Troubleshooting" },
];

// ── Small copy button ───────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Code block ─────────────────────────────────────────────────
function Code({ children }: { children: string }) {
  return (
    <div className="relative my-4">
      <pre className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3.5 text-xs font-mono text-slate-600 leading-relaxed overflow-x-auto scrollbar-thin pr-20">
        <code>{children}</code>
      </pre>
      <CopyButton text={children} />
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────
function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="pt-10 pb-2 scroll-mt-8">
      <div className="flex items-center gap-2.5 mb-4">
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 border border-rose-100 shrink-0">
            <Icon className="h-4 w-4 text-rose-400" />
          </div>
        )}
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

// ── Platform sub-section ───────────────────────────────────────
function PlatformSection({ id, name, children }: { id: string; name: string; children: React.ReactNode }) {
  return (
    <div id={id} className="pt-6 scroll-mt-8">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <ChevronRight className="h-3.5 w-3.5 text-rose-400" />
        {name}
      </h3>
      <div className="text-sm text-slate-600 leading-relaxed space-y-3 pl-5">{children}</div>
    </div>
  );
}

// ── Sub-section (for event platform groups) ────────────────────
function SubSection({ id, name, children }: { id: string; name: string; children: React.ReactNode }) {
  return (
    <div id={id} className="pt-6 scroll-mt-8">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{name}</h3>
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

// ── Callouts ───────────────────────────────────────────────────
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 my-3">
      <Sparkles className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
      <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 my-3">
      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
    </div>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-rose-400 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {number}
      </span>
      <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
    </div>
  );
}

// ── Comparison table ───────────────────────────────────────────
function CompareTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden my-4 text-sm">
      <div className="grid bg-slate-100 border-b border-slate-200" style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr)` }}>
        {headers.map((h) => (
          <div key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {h}
          </div>
        ))}
      </div>
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid divide-x divide-slate-100 border-b border-slate-100 last:border-0"
          style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr)` }}
        >
          {row.map((cell, j) => (
            <div key={j} className="px-4 py-3 text-xs text-slate-600">
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Event reference table ──────────────────────────────────────
function EventTable({ rows }: { rows: { action: string; name: string; note?: string }[] }) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden my-4">
      <div className="grid grid-cols-2 bg-slate-100 border-b border-slate-200">
        <div className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">What you&apos;re tracking</div>
        <div className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Event name to use</div>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
          <div className="px-4 py-3 text-xs text-slate-600">{row.action}</div>
          <div className="px-4 py-3">
            <code className="text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 text-xs font-mono">
              {row.name}
            </code>
            {row.note && <p className="text-xs text-slate-400 mt-1">{row.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState("how-it-works");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    const sections = document.querySelectorAll("section[id], div[id]");
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <AuthGuard>
      <SidebarLayout>
        <div className="flex gap-0 min-h-full" ref={contentRef}>

          {/* ── Sticky side nav ──────────────────── */}
          <aside className="hidden xl:block w-52 shrink-0 sticky top-0 self-start h-screen overflow-y-auto scrollbar-thin py-8 px-4 border-r border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
              On this page
            </p>
            <nav className="space-y-0.5">
              {NAV.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`block px-2 py-1.5 rounded-md text-xs transition-colors ${
                    item.label.startsWith("  ") ? "pl-5" : ""
                  } ${
                    activeSection === item.id
                      ? "text-rose-500 bg-rose-50"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {item.label.trim()}
                </a>
              ))}
            </nav>
          </aside>

          {/* ── Content ───────────────────────────── */}
          <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 xl:px-8 py-8">

            {/* Page header */}
            <div className="mb-8 pb-6 border-b border-slate-200">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Help & setup guide</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Everything you need to set up conversion tracking on your website — no developer knowledge required for most steps.
              </p>
            </div>

            {/* ══════════════════════════════════════ */}
            {/* 1. HOW PIGXEL WORKS                   */}
            {/* ══════════════════════════════════════ */}
            <Section id="how-it-works" title="How Pigxel works" icon={Sparkles}>
              <p>
                Pigxel sits between your website and your ad platforms. You install one small script,
                define what counts as a conversion — a button click, a form submission, a thank-you
                page visit — and Pigxel handles sending that data to Google Analytics, Meta, LinkedIn,
                or TikTok automatically.
              </p>
              <p>
                You do not need a developer to set up events. You do not need to write any code after
                the initial install. And you do not need to touch your analytics platforms directly —
                Pigxel does the routing for you.
              </p>

              <div className="space-y-2 my-3">
                {[
                  {
                    title: "Audits your tracking setup",
                    desc: "Pigxel checks which analytics tools and ad pixels are already on your site and reports what it finds in your Health Check tab. It updates every time a visitor loads your site.",
                  },
                  {
                    title: "Listens for the conversions you care about",
                    desc: "You define what counts as a conversion in plain English — 'someone clicks a button labelled Book a call' or 'someone reaches /thank-you'. Pigxel watches for those moments in the background.",
                  },
                  {
                    title: "Forwards events to your ad platforms",
                    desc: "When a conversion happens, Pigxel fires the event to Google Analytics, Meta Pixel, LinkedIn Insight Tag, or TikTok Pixel — whichever you have connected.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Tip>
                Pigxel works alongside the tools you already have — it does not replace Google
                Analytics or Meta Pixel. Think of it as the layer that connects the dots between
                what happens on your site and what your ad platforms need to know.
              </Tip>
            </Section>

            <div className="my-6 border-t border-slate-200" />

            {/* ══════════════════════════════════════ */}
            {/* 2. PIGXEL VS GTM                      */}
            {/* ══════════════════════════════════════ */}
            <Section id="pigxel-vs-gtm" title="Pigxel vs Google Tag Manager" icon={Layers}>
              <p>
                If you already use Google Tag Manager — or have been told you should — here is how
                Pigxel fits in.
              </p>

              <CompareTable
                headers={["", "Pigxel", "Google Tag Manager"]}
                rows={[
                  ["Who sets it up", "You, in minutes", "Usually a developer or specialist"],
                  ["How events are configured", "Plain English in a dashboard", "Trigger rules + tag templates in GTM"],
                  ["Code knowledge required", "None after install", "Tags often require coding or templates"],
                  ["Platforms supported", "GA4, Meta, LinkedIn, TikTok", "GA4, Meta, LinkedIn, TikTok + more"],
                  ["Works alongside each other", "Yes", "Yes"],
                ]}
              />

              <p className="font-medium text-slate-700">Pigxel and GTM are not competitors</p>
              <p>
                If you already use GTM, Pigxel will detect it automatically and use it to forward
                events through the dataLayer. This means your existing GTM tags, triggers, and
                variables are fully respected. Pigxel adds events to the dataLayer — GTM distributes
                them from there. You get the reliability of GTM without having to log in and edit it
                every time you want to track something new.
              </p>

              <p className="font-medium text-slate-700 mt-2">If you do not have GTM</p>
              <p>
                Pigxel calls your analytics tools directly. It detects whether GA4 (via{" "}
                <code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 text-xs">gtag.js</code>),
                Meta Pixel (<code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 text-xs">fbq</code>),
                LinkedIn Insight Tag, or TikTok Pixel are installed on your site and fires events
                straight to each one. No GTM required.
              </p>

              <Tip>
                The bottom line: if you use GTM, Pigxel plugs into it seamlessly. If you do not,
                Pigxel works fine without it. Either way, setup is the same — install one script,
                define your conversions, go live.
              </Tip>
            </Section>

            <div className="my-6 border-t border-slate-200" />

            {/* ══════════════════════════════════════ */}
            {/* 3. ADD YOUR FIRST PROJECT             */}
            {/* ══════════════════════════════════════ */}
            <Section id="add-site" title="Add your first project" icon={Globe}>
              <p>
                Start by adding the website you want to track. Pigxel creates a separate project for
                each site, so your settings, conversions, and health check results stay organised.
              </p>
              <div className="space-y-2 mt-3">
                <Step number={1}>
                  From your Workspace, click the{" "}
                  <strong className="text-slate-900 font-semibold">New project</strong> button in the top right corner.
                </Step>
                <Step number={2}>
                  Enter a name for the project (for example, "My Shopify Store") and your full website
                  URL (for example, <code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 text-xs">https://yourstore.com</code>).
                  The name is just for your reference inside Pigxel.
                </Step>
                <Step number={3}>
                  Click <strong className="text-slate-900 font-semibold">Create project</strong>. You will be taken
                  to the project page where you can finish setting up.
                </Step>
              </div>
              <p className="mt-3 text-slate-500">
                Your project will show a{" "}
                <span className="text-amber-600 font-medium">Pending</span> badge until the script is
                installed and an analytics platform is connected. You can add as many projects as you need.
              </p>
            </Section>

            <div className="my-6 border-t border-slate-200" />

            {/* ══════════════════════════════════════ */}
            {/* 4. INSTALL THE SCRIPT                 */}
            {/* ══════════════════════════════════════ */}
            <Section id="install-script" title="Install the Pigxel script" icon={Globe}>
              <p>
                The Pigxel script is a short piece of code that goes into the{" "}
                <code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 text-xs">&lt;head&gt;</code>{" "}
                section of every page on your website. You only need to add it once — it runs
                automatically on every page after that.
              </p>
              <p>
                To find your unique script, open your project in Pigxel and go to the{" "}
                <strong className="text-slate-900 font-semibold">Setup tab</strong>. Under{" "}
                <strong className="text-slate-900 font-semibold">Step 1: Install the Pigxel script</strong>,
                click <strong className="text-slate-900 font-semibold">Copy</strong>.
              </p>
              <p>The code looks like this (your project ID will be different):</p>
              <Code>{`<script
  src="https://cdn.pigxel.io/pigxel.js?id=your-project-id"
  data-api="https://us-central1-pigxel-prod.cloudfunctions.net"
></script>`}</Code>
              <Warning>
                Do not edit the code before pasting it. The{" "}
                <code className="text-amber-700 bg-amber-50 px-1 rounded border border-amber-100 text-xs">id=</code>{" "}
                value is unique to your project. If it is changed or removed, Pigxel will not know which
                project to report to.
              </Warning>

              <PlatformSection id="platform-shopify" name="Shopify">
                <p>Shopify lets you add custom code directly from the theme editor — no plugin needed.</p>
                <div className="space-y-2">
                  <Step number={1}>Log in to your Shopify admin panel.</Step>
                  <Step number={2}>Go to <strong className="text-slate-900 font-semibold">Online Store → Themes</strong>.</Step>
                  <Step number={3}>
                    Next to your active theme, click the three-dot menu and select{" "}
                    <strong className="text-slate-900 font-semibold">Edit code</strong>.
                  </Step>
                  <Step number={4}>
                    In the left file list, open the <strong className="text-slate-900 font-semibold">Layout</strong> folder
                    and click <strong className="text-slate-900 font-semibold">theme.liquid</strong>.
                  </Step>
                  <Step number={5}>
                    Find the closing{" "}
                    <code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 text-xs">&lt;/head&gt;</code>{" "}
                    tag. Paste the Pigxel script on the line just before it.
                  </Step>
                  <Step number={6}>Click <strong className="text-slate-900 font-semibold">Save</strong>.</Step>
                </div>
                <Tip>
                  <strong className="text-slate-900 font-semibold">theme.liquid</strong> controls every page in your
                  store, so adding the script once here covers your entire site — product pages, cart, and checkout.
                </Tip>
              </PlatformSection>

              <PlatformSection id="platform-wordpress" name="WordPress">
                <p>There are two ways to add the script in WordPress.</p>
                <p className="font-medium text-slate-700">Option A: WPCode plugin (recommended)</p>
                <div className="space-y-2">
                  <Step number={1}>In WordPress, go to <strong className="text-slate-900 font-semibold">Plugins → Add New</strong>.</Step>
                  <Step number={2}>
                    Search for <strong className="text-slate-900 font-semibold">WPCode</strong>. Install and activate it.
                  </Step>
                  <Step number={3}>Go to <strong className="text-slate-900 font-semibold">Code Snippets → Header &amp; Footer</strong>.</Step>
                  <Step number={4}>Paste the Pigxel script into the <strong className="text-slate-900 font-semibold">Header</strong> box.</Step>
                  <Step number={5}>Click <strong className="text-slate-900 font-semibold">Save Changes</strong>.</Step>
                </div>
                <p className="font-medium text-slate-700 mt-4">Option B: Edit your theme directly (advanced)</p>
                <div className="space-y-2">
                  <Step number={1}>Go to <strong className="text-slate-900 font-semibold">Appearance → Theme File Editor</strong>.</Step>
                  <Step number={2}>Open <strong className="text-slate-900 font-semibold">header.php</strong>.</Step>
                  <Step number={3}>
                    Find{" "}
                    <code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 text-xs">&lt;/head&gt;</code>{" "}
                    and paste the script just before it.
                  </Step>
                  <Step number={4}>Click <strong className="text-slate-900 font-semibold">Update File</strong>.</Step>
                </div>
                <Warning>
                  Changes to header.php can be overwritten when you update your WordPress theme. The
                  WPCode plugin method is safer because it is theme-independent.
                </Warning>
              </PlatformSection>

              <PlatformSection id="platform-webflow" name="Webflow">
                <div className="space-y-2">
                  <Step number={1}>Open your project in the Webflow Designer.</Step>
                  <Step number={2}>
                    Go to <strong className="text-slate-900 font-semibold">Project Settings → Custom Code</strong>.
                  </Step>
                  <Step number={3}>Paste the Pigxel script into the <strong className="text-slate-900 font-semibold">Head code</strong> box.</Step>
                  <Step number={4}>Click <strong className="text-slate-900 font-semibold">Save</strong>, then publish your site.</Step>
                </div>
                <Tip>
                  Adding the script via Project Settings → Custom Code (Head) applies it to every page,
                  including pages you create in the future.
                </Tip>
              </PlatformSection>

              <PlatformSection id="platform-squarespace" name="Squarespace">
                <p>Code injection is available on the Business plan and above.</p>
                <div className="space-y-2">
                  <Step number={1}>Log in and open your site.</Step>
                  <Step number={2}>Go to <strong className="text-slate-900 font-semibold">Website → Website Tools → Code Injection</strong>.</Step>
                  <Step number={3}>Paste the Pigxel script into the <strong className="text-slate-900 font-semibold">Header</strong> field.</Step>
                  <Step number={4}>Click <strong className="text-slate-900 font-semibold">Save</strong>.</Step>
                </div>
                <Warning>
                  Code Injection is not available on the Personal plan. You will need to upgrade to
                  Business or higher to add custom scripts.
                </Warning>
              </PlatformSection>

              <PlatformSection id="platform-wix" name="Wix">
                <div className="space-y-2">
                  <Step number={1}>Go to your Wix site dashboard and click <strong className="text-slate-900 font-semibold">Settings</strong>.</Step>
                  <Step number={2}>Scroll to <strong className="text-slate-900 font-semibold">Custom Code</strong> and click <strong className="text-slate-900 font-semibold">Add Custom Code</strong>.</Step>
                  <Step number={3}>Paste the Pigxel script into the code box.</Step>
                  <Step number={4}>
                    Under <strong className="text-slate-900 font-semibold">Add Code to Pages</strong>, choose{" "}
                    <strong className="text-slate-900 font-semibold">All Pages</strong>.
                  </Step>
                  <Step number={5}>
                    Under <strong className="text-slate-900 font-semibold">Place Code in</strong>, choose{" "}
                    <strong className="text-slate-900 font-semibold">Head</strong>.
                  </Step>
                  <Step number={6}>
                    Give it a name like "Pigxel" and click <strong className="text-slate-900 font-semibold">Apply</strong>.
                  </Step>
                </div>
              </PlatformSection>

              <PlatformSection id="platform-html" name="Any website (custom HTML)">
                <p>
                  If you manage HTML files directly, paste the script just before the closing head tag
                  on every page — or in a shared header template if one exists.
                </p>
                <Code>{`<head>
  <!-- Your existing tags here -->

  <script
    src="https://cdn.pigxel.io/pigxel.js?id=your-project-id"
    data-api="https://us-central1-pigxel-prod.cloudfunctions.net"
  ></script>
</head>`}</Code>
              </PlatformSection>
            </Section>

            <div className="my-6 border-t border-slate-200" />

            {/* ══════════════════════════════════════ */}
            {/* 5. HEALTH CHECK                       */}
            {/* ══════════════════════════════════════ */}
            <Section id="health-check" title="Health Check" icon={ShieldCheck}>
              <p>
                Once the Pigxel script is installed, go to the{" "}
                <strong className="text-slate-900 font-semibold">Health Check</strong> tab of your project and click{" "}
                <strong className="text-slate-900 font-semibold">Run health check</strong>. Pigxel will scan your
                site and report back on every tracking tool it finds.
              </p>

              <div className="rounded-lg border border-slate-200 overflow-hidden my-4">
                <div className="bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  What Pigxel checks for
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { name: "Google Tag Manager", desc: "If GTM is present, Pigxel will use the dataLayer to forward events — the most reliable method." },
                    { name: "Google Analytics 4", desc: "Required for GA4 event reporting. Pigxel fires events via gtag() or through the dataLayer if GTM is present." },
                    { name: "Meta Pixel (fbq)", desc: "Required for Facebook and Instagram ad conversion tracking." },
                    { name: "TikTok Pixel (ttq)", desc: "Required for TikTok ad conversion tracking." },
                    { name: "LinkedIn Insight Tag", desc: "Required for LinkedIn ad conversion tracking." },
                    { name: "dataLayer", desc: "A data structure used by GTM. If detected, Pigxel pushes events here and lets GTM distribute them." },
                  ].map((item) => (
                    <div key={item.name} className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-700">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="font-medium text-slate-700">What is a dataLayer?</p>
              <p>
                A dataLayer is a behind-the-scenes list that Google Tag Manager reads from. When
                Pigxel detects one on your site, it adds conversion events to that list instead of
                calling GA4 or Meta directly. Think of it as using the proper front door rather than
                going around the back — it is more reliable and respects any custom rules your
                developer may have set up inside GTM.
              </p>
              <Tip>
                If you use GTM, you already have a dataLayer. Pigxel will detect it automatically.
                You do not need to do anything extra.
              </Tip>

              <p className="font-medium text-slate-700 mt-4">No tracking tools detected?</p>
              <p>
                If the health check shows nothing, it means none of the supported analytics tools
                have been installed on your site yet. You will need to install GA4, Meta Pixel, or
                another tool first — Pigxel can then forward events to them. The health check results
                include suggestions for what to do next.
              </p>
            </Section>

            <div className="my-6 border-t border-slate-200" />

            {/* ══════════════════════════════════════ */}
            {/* 6. CONNECTING ANALYTICS               */}
            {/* ══════════════════════════════════════ */}
            <Section id="analytics-ids" title="Connecting your analytics" icon={BarChart2}>
              <p>
                In the <strong className="text-slate-900 font-semibold">Setup tab</strong> under{" "}
                <strong className="text-slate-900 font-semibold">Step 2: Connect your analytics</strong>, paste your
                tracking IDs so Pigxel knows where to send conversion data.
              </p>

              <p className="font-medium text-slate-700">How to find your Google Analytics 4 Measurement ID</p>
              <div className="space-y-2">
                <Step number={1}>Open Google Analytics at <strong className="text-slate-900 font-semibold">analytics.google.com</strong>.</Step>
                <Step number={2}>Click the <strong className="text-slate-900 font-semibold">Admin</strong> gear icon in the bottom left.</Step>
                <Step number={3}>Under the Property column, click <strong className="text-slate-900 font-semibold">Data Streams</strong>.</Step>
                <Step number={4}>Click on your website data stream.</Step>
                <Step number={5}>
                  Copy the <strong className="text-slate-900 font-semibold">Measurement ID</strong>. It starts with{" "}
                  <code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 text-xs">G-</code> followed by letters and numbers.
                </Step>
              </div>

              <p className="font-medium text-slate-700 mt-4">How to find your Meta Pixel ID</p>
              <div className="space-y-2">
                <Step number={1}>Go to <strong className="text-slate-900 font-semibold">business.facebook.com</strong>.</Step>
                <Step number={2}>In the left menu, click <strong className="text-slate-900 font-semibold">Events Manager</strong>.</Step>
                <Step number={3}>Select your pixel from the list on the left.</Step>
                <Step number={4}>
                  Your <strong className="text-slate-900 font-semibold">Pixel ID</strong> is shown at the top — it
                  is a long number like{" "}
                  <code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 text-xs">1234567890123456</code>.
                </Step>
              </div>

              <Tip>
                Once saved, Pigxel will automatically route events from your website to the correct
                analytics accounts whenever a conversion is detected.
              </Tip>
            </Section>

            <div className="my-6 border-t border-slate-200" />

            {/* ══════════════════════════════════════ */}
            {/* 7. EVENT BUILDER                      */}
            {/* ══════════════════════════════════════ */}
            <Section id="event-builder" title="Event Builder" icon={MousePointerClick}>
              <p>
                The Event Builder lets you define conversions in plain English — no code required.
                Open the <strong className="text-slate-900 font-semibold">Conversions</strong> tab of your project,
                make sure <strong className="text-slate-900 font-semibold">Active</strong> is selected, then click{" "}
                <strong className="text-slate-900 font-semibold">Add manually</strong>.
              </p>

              <p className="font-medium text-slate-700">Step 1: What is this event?</p>
              <p>
                Give the event a name that makes sense to you — for example, "Newsletter signup" or
                "Book a call button clicked". This is just your internal label; it does not affect
                what gets sent to your analytics platforms.
              </p>
              <p>
                Then choose which platform to send the event to (GA4, Meta, or both) and enter the
                platform&apos;s event name. Pigxel will suggest the correct technical name based on
                what you type. See the event reference guides below for the right names to use.
              </p>

              <p className="font-medium text-slate-700 mt-2">Step 2: When should it fire?</p>
              <p>Choose how Pigxel detects when the conversion happens. There are three methods:</p>

              <div className="space-y-2 my-3">
                {[
                  {
                    title: "Button or link click — by text",
                    badge: "Recommended for most",
                    desc: "Tell Pigxel the text shown on the button, for example 'Book a call' or 'Get started'. Pigxel will watch for any click on an element containing that text. Capitalisation does not matter but spelling does.",
                  },
                  {
                    title: "Visitor reaches a page",
                    badge: "Best for purchase / lead confirmation",
                    desc: "Enter part of the confirmation page URL, for example /thank-you or /order-confirmation. Pigxel fires the event whenever a visitor lands on a URL containing that text. Use this wherever possible — it fires when the outcome is confirmed, not just when someone clicks.",
                  },
                  {
                    title: "CSS selector (advanced)",
                    badge: "For developers",
                    desc: "Target a specific element using a CSS selector like #checkout-btn or .contact-form-submit. Use this if the button text method does not work, for example if multiple buttons share the same text.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border border-slate-200 px-4 py-3 bg-slate-50">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      <span className="text-xs bg-rose-50 border border-rose-200 text-rose-600 px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <Tip>
                When in doubt, use the <strong className="text-slate-900 font-semibold">Visitor reaches a page</strong>{" "}
                method. A thank-you or confirmation page is the most reliable signal that a conversion
                actually happened — not just that someone clicked.
              </Tip>

              {/* GA4 events */}
              <SubSection id="events-ga4" name="Google Analytics 4 — event names">
                <p>
                  GA4 uses lowercase event names with underscores. Using the standard names below
                  gives you access to GA4&apos;s built-in conversion reports and funnel analysis.
                </p>
                <EventTable
                  rows={[
                    { action: "Someone completes a purchase", name: "purchase" },
                    { action: "Someone submits a lead form", name: "generate_lead" },
                    { action: "Someone signs up or registers", name: "sign_up" },
                    { action: "Someone adds a product to their cart", name: "add_to_cart" },
                    { action: "Someone starts the checkout process", name: "begin_checkout" },
                    { action: "Someone books a call or demo", name: "schedule" },
                    { action: "Someone subscribes (newsletter, etc.)", name: "subscribe" },
                    { action: "Someone downloads a file or resource", name: "file_download" },
                    { action: "Someone contacts you", name: "contact" },
                    { action: "Someone views a key page or product", name: "view_item", note: "Use for product page views" },
                    { action: "Someone searches on your site", name: "search" },
                  ]}
                />
                <p className="font-medium text-slate-700">Custom event names</p>
                <p>
                  You can use any name you like. Standard names give you pre-built reports in GA4 —
                  custom names will still appear under Events but will not feed into conversion funnels
                  automatically.
                </p>
                <p className="font-medium text-slate-700 mt-2">Marking events as conversions in GA4</p>
                <p>
                  After events start arriving, go to{" "}
                  <strong className="text-slate-900 font-semibold">GA4 → Admin → Events</strong>, find your event,
                  and toggle <strong className="text-slate-900 font-semibold">Mark as conversion</strong>. This tells
                  GA4 to count it in conversion reports and bidding signals for Google Ads.
                </p>
              </SubSection>

              {/* Meta events */}
              <SubSection id="events-meta" name="Meta / Facebook — event names">
                <p>
                  Meta uses capitalised event names with no underscores. Using the standard names
                  below allows Meta&apos;s ad platform to optimise campaigns automatically for that
                  conversion type.
                </p>
                <EventTable
                  rows={[
                    { action: "Someone completes a purchase", name: "Purchase", note: "Must include value and currency for ROAS reporting" },
                    { action: "Someone submits a lead form", name: "Lead" },
                    { action: "Someone registers or creates an account", name: "CompleteRegistration" },
                    { action: "Someone adds a product to their cart", name: "AddToCart" },
                    { action: "Someone starts checkout", name: "InitiateCheckout" },
                    { action: "Someone views a product or key page", name: "ViewContent" },
                    { action: "Someone subscribes", name: "Subscribe" },
                    { action: "Someone contacts you", name: "Contact" },
                    { action: "Someone books a call or appointment", name: "Schedule" },
                    { action: "Someone searches on your site", name: "Search" },
                  ]}
                />
                <Tip>
                  Meta event names are capitalised with no underscores. GA4 event names are lowercase
                  with underscores. Pigxel&apos;s Event Builder fills in the correct format for each
                  platform automatically based on which platform you select.
                </Tip>
                <p className="font-medium text-slate-700">How to verify Meta events</p>
                <p>
                  Open <strong className="text-slate-900 font-semibold">Meta Business Suite → Events Manager →</strong>{" "}
                  your pixel <strong className="text-slate-900 font-semibold">→ Test Events</strong>. Enter your
                  website URL, trigger the conversion on your site, and watch the event appear in real time.
                </p>
              </SubSection>

              {/* LinkedIn events */}
              <SubSection id="events-linkedin" name="LinkedIn — conversion tracking">
                <p>
                  LinkedIn uses a different model to GA4 and Meta. Conversions are defined inside
                  LinkedIn Campaign Manager, not in the pixel code. The LinkedIn Insight Tag being
                  detected by Pigxel confirms the script is installed correctly — the conversion
                  definition lives in your ad account.
                </p>
                <p className="font-medium text-slate-700">How LinkedIn conversion tracking works</p>
                <p>
                  LinkedIn matches conversions in one of two ways:
                </p>
                <div className="space-y-2 my-3">
                  <div className="rounded-lg border border-slate-200 px-4 py-3 bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">URL-based conversions (recommended)</p>
                    <p className="text-xs text-slate-500 mt-1">
                      You tell LinkedIn to count a conversion whenever someone visits a specific URL
                      (e.g. your /thank-you page). Set this up in Campaign Manager → Account Assets →
                      Conversions → Add a conversion → Website Actions → URL matches. Pigxel supports
                      this natively via the "Visitor reaches a page" trigger.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-4 py-3 bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">Event-based conversions (advanced)</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Fires a conversion using a JavaScript call with a Conversion ID from your LinkedIn
                      account. Your developer would call{" "}
                      <code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 font-mono">
                        window.lintrk(&apos;track&apos;, &#123; conversion_id: XXXX &#125;)
                      </code>
                      . Use URL-based conversions unless you need event-level control.
                    </p>
                  </div>
                </div>
                <p className="font-medium text-slate-700">Where to find your LinkedIn Conversion ID</p>
                <div className="space-y-2">
                  <Step number={1}>Open LinkedIn Campaign Manager.</Step>
                  <Step number={2}>Go to <strong className="text-slate-900 font-semibold">Account Assets → Conversions</strong>.</Step>
                  <Step number={3}>Select your conversion or create a new one.</Step>
                  <Step number={4}>The Conversion ID is shown in the conversion details panel.</Step>
                </div>
                <Tip>
                  For most marketers, setting up LinkedIn conversions via a thank-you page URL in
                  Campaign Manager is the simplest and most reliable method. Pigxel&apos;s "Visitor
                  reaches a page" trigger is designed exactly for this use case.
                </Tip>
              </SubSection>

              {/* TikTok events */}
              <SubSection id="events-tiktok" name="TikTok — event names">
                <p>
                  TikTok Pixel uses capitalised event names similar to Meta. If the TikTok Pixel is
                  detected in your health check, Pigxel can fire events to it automatically.
                </p>
                <EventTable
                  rows={[
                    { action: "Someone completes a purchase", name: "PlaceAnOrder" },
                    { action: "Someone starts checkout", name: "InitiateCheckout" },
                    { action: "Someone adds to cart", name: "AddToCart" },
                    { action: "Someone completes registration", name: "CompleteRegistration" },
                    { action: "Someone views a product or key content", name: "ViewContent" },
                    { action: "Someone submits a form", name: "SubmitForm" },
                    { action: "Someone searches on your site", name: "Search" },
                    { action: "Someone subscribes", name: "Subscribe" },
                    { action: "Someone contacts you", name: "Contact" },
                    { action: "Someone downloads something", name: "Download" },
                  ]}
                />
                <p className="font-medium text-slate-700">How to verify TikTok events</p>
                <p>
                  Open <strong className="text-slate-900 font-semibold">TikTok Ads Manager → Assets → Events →
                  Web Events → Test Events</strong>. Enter your website URL and trigger a conversion to
                  see the event arrive in real time.
                </p>
              </SubSection>

              {/* Google Ads events */}
              <SubSection id="events-google-ads" name="Google Ads — conversion tracking">
                <p>
                  Google Ads conversion tracking is separate from Google Analytics 4. Both use the
                  same <code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 font-mono">gtag.js</code>{" "}
                  script, but Google Ads uses a different account ID starting with{" "}
                  <code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 font-mono">AW-</code>.
                </p>
                <p className="font-medium text-slate-700">Why Google Ads conversions matter</p>
                <p>
                  When you send conversions directly to Google Ads (not just GA4), Google&apos;s
                  bidding algorithms use that data to optimise your campaigns in real time.
                  Bidding strategies like <strong className="text-slate-900 font-semibold">Target CPA</strong>{" "}
                  and <strong className="text-slate-900 font-semibold">Target ROAS</strong> rely on
                  native conversion data to work effectively.
                </p>
                <p className="font-medium text-slate-700">What you need</p>
                <div className="space-y-2 my-3">
                  <div className="rounded-lg border border-slate-200 px-4 py-3 bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">Conversion ID</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Starts with <code className="font-mono text-rose-500">AW-</code> followed by numbers.
                      Found in Google Ads → Tools → Conversions → select a conversion → Tag setup → Google Tag.
                      Add this to the &quot;Google Ads&quot; field in Pigxel&apos;s setup page.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-4 py-3 bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">Conversion Label</p>
                    <p className="text-xs text-slate-500 mt-1">
                      A short alphanumeric code unique to each conversion action. Found in the same Tag
                      setup screen as the Conversion ID. You enter this when creating each conversion
                      event in Pigxel. The label is what tells Google Ads exactly which conversion fired.
                    </p>
                  </div>
                </div>
                <p className="font-medium text-slate-700">Where to find your Conversion ID and Label</p>
                <div className="space-y-2">
                  <Step number={1}>Sign in to Google Ads and click the tools icon (top right).</Step>
                  <Step number={2}>Under <strong className="text-slate-900 font-semibold">Measurement</strong>, select <strong className="text-slate-900 font-semibold">Conversions</strong>.</Step>
                  <Step number={3}>Click on the conversion action you want to track.</Step>
                  <Step number={4}>Click <strong className="text-slate-900 font-semibold">Tag setup</strong> then <strong className="text-slate-900 font-semibold">Use Google Tag Manager</strong>.</Step>
                  <Step number={5}>Copy the <strong className="text-slate-900 font-semibold">Conversion ID</strong> (e.g. <code className="font-mono text-rose-500">AW-123456789</code>) and the <strong className="text-slate-900 font-semibold">Conversion Label</strong> (e.g. <code className="font-mono text-rose-500">AbCdEfGhIjKlMnOp</code>).</Step>
                </div>
                <Tip>
                  The Google Ads Conversion ID goes in the &quot;Google Ads&quot; field on the Pigxel setup
                  page. The Conversion Label is entered separately for each individual event you
                  create. This means one Google Ads account can track multiple different types
                  of conversion (e.g. a lead form and a purchase) with separate labels.
                </Tip>
              </SubSection>
            </Section>

            <div className="my-6 border-t border-slate-200" />

            {/* ══════════════════════════════════════ */}
            {/* 8. AI SITE SCAN                       */}
            {/* ══════════════════════════════════════ */}
            <Section id="conversions-discover" title="AI site scan" icon={Sparkles}>
              <p>
                Not sure which buttons or forms to track? Let Pigxel find them for you. Open the{" "}
                <strong className="text-slate-900 font-semibold">Conversions</strong> tab, switch to the{" "}
                <strong className="text-slate-900 font-semibold">Discover</strong> view, and click{" "}
                <strong className="text-slate-900 font-semibold">Scan my site</strong>.
              </p>
              <p>
                Pigxel visits your website, looks for buttons, forms, and links that appear to be
                conversion points, and lists them as suggestions. Click the{" "}
                <strong className="text-slate-900 font-semibold">+</strong> button on any suggestion to open the
                Event Builder pre-filled with that element&apos;s details.
              </p>

              <p className="font-medium text-slate-700">What the scan looks for</p>
              <div className="rounded-lg border border-slate-200 overflow-hidden my-3">
                <div className="divide-y divide-slate-100">
                  {[
                    { label: "Buttons", desc: "Any <button> element containing action words — Buy, Get, Start, Join, Book, Contact, Subscribe, Download, Try, Sign up." },
                    { label: "Submit inputs", desc: "Any <input type=\"submit\"> form submit button." },
                    { label: "Styled links", desc: "Links that are styled as buttons (using class names like .btn, .button, or similar)." },
                  ].map((item) => (
                    <div key={item.label} className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Warning>
                The scan works on publicly accessible pages. If your site requires a login to reach
                checkout, account creation, or confirmation pages, the scan may not find those elements.
                Use the Event Builder manually for those cases.
              </Warning>
            </Section>

            <div className="my-6 border-t border-slate-200" />

            {/* ══════════════════════════════════════ */}
            {/* 9. GOING LIVE                         */}
            {/* ══════════════════════════════════════ */}
            <Section id="go-live" title="Going live" icon={Zap}>
              <p>
                Once the script is installed and at least one analytics platform is connected, Pigxel
                is ready to track. You will see a green banner at the top of your project page:
                <strong className="text-slate-900 font-semibold"> "Everything is set up — you&apos;re ready to go live."</strong>
              </p>
              <div className="space-y-2">
                <Step number={1}>
                  Open your project in Pigxel. Check the four status pills in the project header —
                  Script installed and at least one analytics platform should be green.
                </Step>
                <Step number={2}>
                  Click the <strong className="text-slate-900 font-semibold">Go Live</strong> button in the green
                  banner, or flip the toggle in the project header from Off to Live.
                </Step>
                <Step number={3}>
                  The status badge will change from{" "}
                  <span className="text-amber-600 font-medium">Pending</span> to{" "}
                  <span className="text-emerald-600 font-medium">Active</span>. Pigxel is now forwarding
                  conversion events.
                </Step>
              </div>
              <p className="mt-3">
                Allow <strong className="text-slate-900 font-semibold">24 to 48 hours</strong> for events to appear
                in standard GA4 reports or Meta Events Manager. Use their respective real-time tools
                for immediate verification.
              </p>
              <Warning>
                If you ever need to stop tracking temporarily, flip the toggle in the project header
                to Paused. Pigxel will continue running health checks on your site but will not send
                any events while paused.
              </Warning>
            </Section>

            <div className="my-6 border-t border-slate-200" />

            {/* ══════════════════════════════════════ */}
            {/* 10. STATUS LABELS                     */}
            {/* ══════════════════════════════════════ */}
            <Section id="status-labels" title="Status labels explained" icon={HelpCircle}>
              <p>Every project in Pigxel shows a status badge. Here is what each one means:</p>
              <div className="rounded-lg border border-slate-200 overflow-hidden my-4">
                <div className="divide-y divide-slate-200">
                  <div className="flex items-start gap-4 px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-100 border-amber-200 text-amber-700 shrink-0 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Pending
                    </span>
                    <p className="text-sm text-slate-600">
                      Your project has been created but setup is not complete. The script may not be
                      installed yet, or you have not connected an analytics platform.
                    </p>
                  </div>
                  <div className="flex items-start gap-4 px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium bg-emerald-100 border-emerald-200 text-emerald-700 shrink-0 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                    <p className="text-sm text-slate-600">
                      Tracking is live. Pigxel is watching for conversions and forwarding events to
                      your connected analytics platforms.
                    </p>
                  </div>
                  <div className="flex items-start gap-4 px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium bg-slate-100 border-slate-200 text-slate-600 shrink-0 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Paused
                    </span>
                    <p className="text-sm text-slate-600">
                      Tracking has been manually paused. The Pigxel script is still installed and
                      health checks still run, but no conversion events will be sent to your analytics
                      platforms until you resume.
                    </p>
                  </div>
                </div>
              </div>
            </Section>

            <div className="my-6 border-t border-slate-200" />

            {/* ══════════════════════════════════════ */}
            {/* 11. TROUBLESHOOTING                   */}
            {/* ══════════════════════════════════════ */}
            <Section id="troubleshooting" title="Troubleshooting" icon={HelpCircle}>
              <div className="space-y-6">

                <div>
                  <p className="font-medium text-slate-700">The health check says "Script not yet detected"</p>
                  <p className="text-slate-500 mt-1">Check the following:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-500 text-sm">
                    <li>Make sure you saved the script change and published your site.</li>
                    <li>Visit your website in a browser and wait for the page to fully load.</li>
                    <li>Return to Pigxel and run the health check again.</li>
                    <li>
                      If the script is on a staging site or a password-protected page, Pigxel cannot
                      reach it. Test on a publicly accessible page first.
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium text-slate-700">No tracking tools detected in the health check</p>
                  <p className="text-slate-500 mt-1">
                    Pigxel only forwards events to tools that are already installed on your site. If
                    nothing is detected, you need to install GA4, Meta Pixel, or another supported tool
                    first. Once installed, run the health check again — Pigxel will pick them up
                    automatically.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-slate-700">My events are not showing in Google Analytics</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-500 text-sm">
                    <li>
                      Make sure your project status in Pigxel is{" "}
                      <span className="text-emerald-600 font-medium">Active</span>. Events are not sent
                      while paused or pending.
                    </li>
                    <li>
                      Confirm the event name in your tracking rule matches one of the GA4 standard names
                      or a custom name you have set up in GA4.
                    </li>
                    <li>
                      For button click rules, check the button text matches exactly (spelling matters,
                      capitalisation does not).
                    </li>
                    <li>
                      GA4 standard reports can take up to 48 hours to update. Check{" "}
                      <strong className="text-slate-900 font-semibold">GA4 → Reports → Realtime</strong> for
                      immediate feedback — events appear there within seconds.
                    </li>
                    <li>
                      If your site uses a Content Security Policy (CSP), ask your developer to confirm
                      the Pigxel domain is on the allowlist.
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium text-slate-700">My events are not showing in Meta Events Manager</p>
                  <p className="text-slate-500 mt-1">
                    Check the same points as above. In Meta, use the{" "}
                    <strong className="text-slate-900 font-semibold">Test Events</strong> tool in Events
                    Manager to see events arrive in real time. Also confirm your Meta Pixel ID is saved
                    correctly in the Pigxel Setup tab — the ID is a long number, not the pixel name.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-slate-700">LinkedIn or TikTok conversions are not showing</p>
                  <p className="text-slate-500 mt-1">
                    For LinkedIn: conversions are configured inside Campaign Manager, not in the pixel
                    code. Make sure your conversion is set up there and matched to the correct URL or
                    event. For TikTok: use the Test Events tool in TikTok Ads Manager to verify events
                    are arriving. Allow up to 20 minutes for events to be processed.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-slate-700">I do not know which event name to use</p>
                  <p className="text-slate-500 mt-1">
                    The Event Builder suggests platform event names automatically as you type your
                    internal event name. For purchases, use{" "}
                    <code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 text-xs">purchase</code>{" "}
                    for GA4 and{" "}
                    <code className="text-rose-500 bg-rose-50 px-1 rounded border border-rose-100 text-xs">Purchase</code>{" "}
                    for Meta. Using the standard names gives you access to built-in optimisation
                    features in each ad platform.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-slate-700">The live toggle is greyed out and I cannot turn it on</p>
                  <p className="text-slate-500 mt-1">
                    The toggle is locked when a project status is Pending. Install the Pigxel script
                    and connect at least one analytics platform in the Setup tab. Once both status pills
                    in the project header turn green, the toggle will unlock and the green Go Live banner
                    will appear.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-slate-700">How do I test that everything is working?</p>
                  <p className="text-slate-500 mt-1">
                    The quickest way is to use GA4 Realtime. Open{" "}
                    <strong className="text-slate-900 font-semibold">GA4 → Reports → Realtime</strong>, then visit
                    your own website and trigger a conversion (click the button or visit the page you
                    defined in Pigxel). The event should appear in Realtime within seconds.
                  </p>
                  <p className="text-slate-500 mt-2">
                    For Meta, open the{" "}
                    <strong className="text-slate-900 font-semibold">Test Events</strong> tab in Events Manager.
                    For TikTok, use the{" "}
                    <strong className="text-slate-900 font-semibold">Test Events</strong> tool in TikTok Ads Manager.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-slate-700">I deleted a project by mistake</p>
                  <p className="text-slate-500 mt-1">
                    Deleted projects cannot be recovered. Add the project again with the same URL,
                    complete setup, and update the Pigxel script on your website with the new project
                    ID from the Setup tab. Tracking will resume once the new script is live.
                  </p>
                </div>

              </div>
            </Section>

            <div className="h-16" />
          </main>
        </div>
      </SidebarLayout>
    </AuthGuard>
  );
}
