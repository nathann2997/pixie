"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  href?: string;
}

interface OnboardingChecklistProps {
  siteId: string;
  scriptInstalled: boolean;
  hasPixels: boolean;
  hasEvents: boolean;
  isLive: boolean;
}

export function OnboardingChecklist({
  siteId,
  scriptInstalled,
  hasPixels,
  hasEvents,
  isLive,
}: OnboardingChecklistProps) {
  const router = useRouter();

  const steps: OnboardingStep[] = [
    {
      key: "script",
      label: "Install the Pigxel script",
      description: "Add the tracking snippet to your website.",
      completed: scriptInstalled,
    },
    {
      key: "pixels",
      label: "Connect your analytics",
      description: "Add your GA4 or Meta Pixel ID.",
      completed: hasPixels,
    },
    {
      key: "events",
      label: "Set up tracking rules",
      description: "Define what actions to track.",
      completed: hasEvents,
      href: `/dashboard/${siteId}/events`,
    },
    {
      key: "live",
      label: "Go live",
      description: "Start collecting data.",
      completed: isLive,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allDone = completedCount === steps.length;

  if (allDone) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Getting started</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {completedCount} of {steps.length} complete
          </p>
        </div>
        <div className="flex gap-1">
          {steps.map((s) => (
            <div
              key={s.key}
              className={cn(
                "h-1.5 w-6 rounded-full",
                s.completed ? "bg-emerald-400" : "bg-slate-200"
              )}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {steps.map((step) => (
          <button
            key={step.key}
            onClick={() => step.href && !step.completed && router.push(step.href)}
            disabled={step.completed || !step.href}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
              step.completed
                ? "opacity-60"
                : step.href
                  ? "hover:bg-slate-50 cursor-pointer"
                  : "cursor-default"
            )}
          >
            {step.completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-slate-300 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                step.completed ? "text-slate-400 line-through" : "text-slate-700"
              )}>
                {step.label}
              </p>
              {!step.completed && (
                <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
              )}
            </div>
            {!step.completed && step.href && (
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
