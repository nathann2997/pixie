import * as React from "react";
import { cn } from "@/lib/utils";

type StatusVariant = "active" | "paused" | "pending";

const LABELS: Record<StatusVariant, string> = {
  active: "Live",
  paused: "Paused",
  pending: "Setup Required",
};

/** Pastel pill style — Monday.com inspired */
const STYLES: Record<StatusVariant, { dot: string; pill: string }> = {
  active: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  paused: {
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600 border-slate-200",
  },
  pending: {
    dot: "bg-amber-400",
    pill: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

const VALID_STATUSES: StatusVariant[] = ["active", "paused", "pending"];

function normalizeStatus(value: string | undefined): StatusVariant {
  const lower = value?.toLowerCase();
  return VALID_STATUSES.includes(lower as StatusVariant) ? (lower as StatusVariant) : "pending";
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusVariant | string;
  label?: string;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, label, className, ...props }, ref) => {
    const normalized = normalizeStatus(status);
    const styles = STYLES[normalized];
    const displayLabel = label ?? LABELS[normalized];

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
          styles.pill,
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            styles.dot,
            normalized === "active" && "pulse-slow"
          )}
        />
        {displayLabel}
      </span>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { StatusBadge, type StatusVariant };
