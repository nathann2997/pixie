"use client";

import { CheckCircle2, XCircle, AlertCircle, Layers, RefreshCw } from "lucide-react";

export interface PixelAudit {
  detected_pixels: string[];
  detected_scripts: string[];
  has_data_layer: boolean;
  data_layer_healthy: boolean;
  data_layer_events: string[];
  gtag_id: string | null;
  gtm_id: string | null;
  fbq_id: string | null;
  ttq_present: boolean;
  linkedin_present: boolean;
  pinterest_present: boolean;
  script_installed: boolean;
  audit_timestamp: string;
  page_url: string;
}

interface AuditStatusCardProps {
  audit: PixelAudit | null | undefined;
}

function AuditRow({
  label,
  detected,
  detail,
}: {
  label: string;
  detected: boolean;
  detail?: string | null;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2.5">
        {detected ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
        )}
        <span className={`text-sm ${detected ? "text-slate-700" : "text-slate-400"}`}>
          {label}
        </span>
      </div>
      {detail && (
        <span className="text-xs font-mono text-slate-400 truncate max-w-[160px]">{detail}</span>
      )}
    </div>
  );
}

function timeAgo(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

export function AuditStatusCard({ audit }: AuditStatusCardProps) {
  if (!audit) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Tracking audit</h3>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">Script not yet detected</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Once the Pigxel script is installed on your site, it will automatically audit your
                tracking setup and report the results here.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasAnyPixel = audit.detected_pixels.length > 0;
  const suggestions: string[] = [];

  if (!audit.has_data_layer) {
    suggestions.push("Add a dataLayer to your site for more accurate, reliable tracking.");
  } else if (!audit.data_layer_healthy) {
    suggestions.push("A dataLayer was found but appears empty — ensure it's initialised before the Pigxel script.");
  }
  if (!hasAnyPixel) {
    suggestions.push("No tracking pixels detected. Set up Google Analytics 4 or Meta Pixel directly on your site first.");
  }
  if (audit.detected_pixels.includes("gtm") && !audit.has_data_layer) {
    suggestions.push("GTM detected but no dataLayer — this is unusual. Check your GTM snippet is correct.");
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-rose-400" />
          <h3 className="text-sm font-semibold text-slate-900">Tracking audit</h3>
        </div>
        <span className="text-xs text-slate-400">
          Last seen {timeAgo(audit.audit_timestamp)}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          Detected on your site
        </p>
        <div>
          <AuditRow label="Google Tag Manager" detected={audit.detected_pixels.includes("gtm")} detail={audit.gtm_id} />
          <AuditRow label="Google Analytics 4" detected={audit.detected_pixels.includes("ga4") || audit.detected_pixels.includes("gtm")} detail={audit.gtag_id} />
          <AuditRow label="Meta Pixel" detected={audit.detected_pixels.includes("meta")} detail={audit.fbq_id} />
          <AuditRow label="TikTok Pixel" detected={audit.ttq_present} />
          <AuditRow label="LinkedIn Insight" detected={audit.linkedin_present} />
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          dataLayer
        </p>
        <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
          <Layers className={`h-4 w-4 shrink-0 mt-0.5 ${audit.has_data_layer ? "text-emerald-500" : "text-slate-300"}`} />
          <div>
            <p className={`text-sm font-medium ${audit.has_data_layer ? "text-slate-700" : "text-slate-400"}`}>
              {audit.has_data_layer
                ? audit.data_layer_healthy ? "dataLayer active" : "dataLayer present (empty)"
                : "No dataLayer found"}
            </p>
            {audit.has_data_layer && audit.data_layer_events.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                Custom events seen: {audit.data_layer_events.slice(0, 5).join(", ")}
                {audit.data_layer_events.length > 5 ? ` +${audit.data_layer_events.length - 5} more` : ""}
              </p>
            )}
            {audit.has_data_layer && (
              <p className="text-xs text-emerald-600 mt-0.5">
                Pigxel will forward events via dataLayer for maximum accuracy.
              </p>
            )}
            {!audit.has_data_layer && (
              <p className="text-xs text-slate-400 mt-0.5">Pigxel will forward events directly via gtag / fbq.</p>
            )}
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Suggestions</p>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 && hasAnyPixel && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-emerald-700">
            Tracking looks healthy. Pigxel will forward events to your existing pixels.
          </p>
        </div>
      )}
    </div>
  );
}
