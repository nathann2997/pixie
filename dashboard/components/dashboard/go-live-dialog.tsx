"use client";

import {
  GlassModal,
  GlassModalContent,
  GlassModalCard,
  GlassModalTitle,
  GlassModalDescription,
} from "@/components/ui/glass-modal";
import { NeonButton } from "@/components/ui/neon-button";
import { Button } from "@/components/ui/button";
import { Zap, Pause, BarChart2 } from "lucide-react";

interface GoLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "activate" | "pause";
  onConfirm: () => void;
  loading: boolean;
  pixelConfig: {
    ga4?: string;
    meta?: string;
    tiktok?: string;
    linkedin?: string;
    google_ads?: string;
  };
  eventCount: number;
}

export function GoLiveDialog({
  open,
  onOpenChange,
  action,
  onConfirm,
  loading,
  pixelConfig,
  eventCount,
}: GoLiveDialogProps) {
  const connectedPlatforms = [
    pixelConfig.ga4 && `GA4 (${pixelConfig.ga4})`,
    pixelConfig.meta && `Meta Pixel (${pixelConfig.meta})`,
    pixelConfig.tiktok && `TikTok (${pixelConfig.tiktok})`,
    pixelConfig.linkedin && `LinkedIn (${pixelConfig.linkedin})`,
    pixelConfig.google_ads && `Google Ads (${pixelConfig.google_ads})`,
  ].filter(Boolean);

  if (action === "activate") {
    return (
      <GlassModal open={open} onOpenChange={onOpenChange}>
        <GlassModalContent>
          <GlassModalCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200">
                <Zap className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <GlassModalTitle className="text-base font-semibold text-slate-900">
                  Go live with tracking?
                </GlassModalTitle>
                <GlassModalDescription className="text-xs text-slate-500 mt-0.5">
                  Pigxel will start forwarding events to your connected platforms.
                </GlassModalDescription>
              </div>
            </div>

            {connectedPlatforms.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Connected platforms</p>
                <div className="space-y-1.5">
                  {connectedPlatforms.map((p) => (
                    <div key={p} className="flex items-center gap-2 text-sm text-slate-700">
                      <BarChart2 className="h-3.5 w-3.5 text-slate-400" />
                      {p}
                    </div>
                  ))}
                </div>
                {eventCount > 0 && (
                  <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                    {eventCount} tracking rule{eventCount !== 1 ? "s" : ""} configured
                  </p>
                )}
              </div>
            )}

            {connectedPlatforms.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
                <p className="text-xs text-amber-700">
                  No platforms connected yet. Events will be tracked but not forwarded anywhere.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
              >
                Cancel
              </Button>
              <NeonButton
                onClick={onConfirm}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {loading ? "Activating..." : "Go live"}
              </NeonButton>
            </div>
          </GlassModalCard>
        </GlassModalContent>
      </GlassModal>
    );
  }

  return (
    <GlassModal open={open} onOpenChange={onOpenChange}>
      <GlassModalContent>
        <GlassModalCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
              <Pause className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <GlassModalTitle className="text-base font-semibold text-slate-900">
                Pause tracking?
              </GlassModalTitle>
              <GlassModalDescription className="text-xs text-slate-500 mt-0.5">
                Event forwarding will stop immediately.
              </GlassModalDescription>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
            <p className="text-xs text-amber-700">
              Events that happen while paused will not be captured. You can resume tracking at any time.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
            >
              Keep live
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-white border-0"
            >
              {loading ? "Pausing..." : "Pause tracking"}
            </Button>
          </div>
        </GlassModalCard>
      </GlassModalContent>
    </GlassModal>
  );
}
