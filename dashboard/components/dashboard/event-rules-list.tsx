"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import {
  MousePointerClick,
  FormInput,
  Globe,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventRule } from "@/lib/normalize-event";
import { type Platform, getPlatform } from "@/lib/platform-events";

export interface EventRulesListProps {
  rules: EventRule[];
  onDelete?: (id: string) => void;
}

type MatchInfo =
  | { type: "text"; value: string }
  | { type: "url"; value: string }
  | { type: "css"; value: string };

function decodeSelector(selector: string): MatchInfo {
  if (selector.startsWith("text=")) return { type: "text", value: selector.slice(5) };
  if (selector.startsWith("url=")) return { type: "url", value: selector.slice(4) };
  return { type: "css", value: selector };
}

function TriggerBadge({ trigger, matchType }: { trigger: string; matchType: MatchInfo["type"] }) {
  if (matchType === "url" || trigger === "pageview") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs text-emerald-700">
        <Globe className="h-3 w-3" />
        Page view
      </span>
    );
  }
  if (trigger === "submit") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs text-rose-600">
        <FormInput className="h-3 w-3" />
        Form submit
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
      <MousePointerClick className="h-3 w-3" />
      Button click
    </span>
  );
}

function PlatformBadge({ platform }: { platform: Platform }) {
  const cfg = getPlatform(platform);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{
        borderColor: cfg.color + "40",
        backgroundColor: cfg.color + "10",
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

function MatchDescription({ match }: { match: MatchInfo }) {
  if (match.type === "text") {
    return (
      <p className="text-xs text-slate-500">
        Fires when someone clicks a button containing{" "}
        <span className="text-slate-700 font-medium">&ldquo;{match.value}&rdquo;</span>
      </p>
    );
  }
  if (match.type === "url") {
    return (
      <p className="text-xs text-slate-500">
        Fires when visitor is on a page with{" "}
        <code className="text-rose-500 bg-rose-50 px-1 py-0.5 rounded text-xs font-mono border border-rose-100">
          {match.value}
        </code>{" "}
        in the URL
      </p>
    );
  }
  return (
    <p className="text-xs text-slate-400">
      Fires on click — <span className="italic">see technical details below</span>
    </p>
  );
}

function TrackingBlockCard({
  rule,
  onDelete,
}: {
  rule: EventRule;
  onDelete?: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const match = decodeSelector(rule.selector);
  const needsConfig = !rule.selector;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm font-semibold text-slate-900 leading-tight">
            {rule.displayName || "Unnamed block"}
          </p>
          {needsConfig ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              Needs configuration
            </span>
          ) : (
            <MatchDescription match={match} />
          )}
          <div className="flex items-center flex-wrap gap-2">
            <TriggerBadge trigger={rule.trigger} matchType={match.type} />
            <span className="text-slate-300 text-xs">&rarr;</span>
            {rule.platforms.map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
            {rule.params.length > 0 && (
              <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
                {rule.params.length} param{rule.params.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {!needsConfig && match.type === "css" && (
            <>
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showDetails ? (
                  <><ChevronUp className="h-3 w-3" />Hide selector</>
                ) : (
                  <><ChevronDown className="h-3 w-3" />Show selector</>
                )}
              </button>
              {showDetails && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                  <p className="text-xs text-slate-500 font-mono">
                    <span className="text-slate-400">selector: </span>
                    <span className="text-rose-500">{rule.selector || "—"}</span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 h-8 w-8 p-0 shrink-0"
            onClick={onDelete}
            aria-label="Remove tracking block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function EventRulesList({ rules, onDelete }: EventRulesListProps) {
  if (rules.length === 0) {
    return (
      <GlassCard className="p-8 text-center border-dashed border-slate-200">
        <p className="text-sm text-slate-500 mb-1">No tracking blocks yet</p>
        <p className="text-xs text-slate-400">
          Use &ldquo;Add block&rdquo; above or &ldquo;Scan my site&rdquo; to get started.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className={cn("space-y-2")}>
      {rules.map((rule) => (
        <TrackingBlockCard
          key={rule.id}
          rule={rule}
          onDelete={onDelete ? () => onDelete(rule.id) : undefined}
        />
      ))}
    </div>
  );
}
