"use client";

import { useState, useMemo } from "react";
import {
  ShoppingCart,
  UserPlus,
  Rocket,
  FileText,
  MapPin,
  Check,
  X,
} from "lucide-react";
import {
  GlassModal,
  GlassModalContent,
  GlassModalCard,
  GlassModalTitle,
  GlassModalDescription,
  GlassModalClose,
} from "@/components/ui/glass-modal";
import { NeonButton } from "@/components/ui/neon-button";
import { TEMPLATES, createEventsFromTemplate } from "@/lib/event-templates";
import { getStandardEvent } from "@/lib/platform-events";
import { PLATFORMS } from "@/lib/platform-events";
import type { EventTemplate } from "@/lib/event-templates";
import type { Platform } from "@/lib/platform-events";
import type { EventRule } from "@/lib/normalize-event";

// ── Icon map ────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  UserPlus,
  Rocket,
  FileText,
  MapPin,
};

// ── Trigger badge colors ────────────────────────────────────────

const TRIGGER_STYLES: Record<string, string> = {
  click: "bg-blue-50 text-blue-600 border-blue-200",
  submit: "bg-amber-50 text-amber-600 border-amber-200",
  pageview: "bg-green-50 text-green-600 border-green-200",
};

// ── Props ───────────────────────────────────────────────────────

interface TemplatePickerProps {
  eventCount: number;
  onSave: (events: EventRule[]) => void;
}

// ── Component ───────────────────────────────────────────────────

export function TemplatePicker({ eventCount, onSave }: TemplatePickerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  const [checkedEvents, setCheckedEvents] = useState<Set<string>>(new Set());
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    new Set(["ga4", "meta"])
  );
  const [linkedinConversionId, setLinkedinConversionId] = useState("");
  const [googleAdsConversionId, setGoogleAdsConversionId] = useState("");
  const [googleAdsConversionLabel, setGoogleAdsConversionLabel] = useState("");

  // Don't show if already have 3+ events
  if (eventCount >= 3) return null;

  const openTemplate = (template: EventTemplate) => {
    setSelectedTemplate(template);
    setCheckedEvents(new Set(template.eventIds));
    setSelectedPlatforms(new Set(["ga4", "meta"]));
    setLinkedinConversionId("");
    setGoogleAdsConversionId("");
    setGoogleAdsConversionLabel("");
  };

  const closeModal = () => setSelectedTemplate(null);

  const toggleEvent = (eventId: string) => {
    setCheckedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const handleAdd = () => {
    if (!selectedTemplate) return;

    const filteredTemplate: EventTemplate = {
      ...selectedTemplate,
      eventIds: selectedTemplate.eventIds.filter((id) => checkedEvents.has(id)),
    };

    const platformFields: EventRule["platformFields"] = {};
    if (selectedPlatforms.has("linkedin") && linkedinConversionId) {
      platformFields.linkedin_conversion_id = linkedinConversionId;
    }
    if (selectedPlatforms.has("google_ads") && googleAdsConversionId) {
      platformFields.google_ads_conversion_id = googleAdsConversionId;
    }
    if (selectedPlatforms.has("google_ads") && googleAdsConversionLabel) {
      platformFields.google_ads_conversion_label = googleAdsConversionLabel;
    }

    const events = createEventsFromTemplate(
      filteredTemplate,
      Array.from(selectedPlatforms),
      platformFields
    );

    if (events.length > 0) {
      onSave(events);
      closeModal();
    }
  };

  const checkedCount = checkedEvents.size;

  return (
    <>
      {/* ── Template cards row ─────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-700 mb-2">Quick start with a template</p>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
          {TEMPLATES.map((template) => {
            const Icon = ICON_MAP[template.icon];
            return (
              <button
                key={template.id}
                onClick={() => openTemplate(template)}
                className="group flex-shrink-0 snap-start w-52 bg-white border border-slate-200 rounded-lg p-4 text-left hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-rose-50 group-hover:border-rose-100 transition-colors">
                    {Icon && <Icon className="h-4 w-4 text-slate-500 group-hover:text-rose-500 transition-colors" />}
                  </div>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                    {template.eventIds.length} events
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 mb-0.5 truncate">
                  {template.name}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {template.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Template modal ─────────────────────────────────────── */}
      <GlassModal open={!!selectedTemplate} onOpenChange={(open) => !open && closeModal()}>
        <GlassModalContent className="max-w-lg">
          <GlassModalCard className="p-0 overflow-hidden">
            {selectedTemplate && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div>
                    <GlassModalTitle className="text-base font-semibold text-slate-900">
                      Add {selectedTemplate.name} Events
                    </GlassModalTitle>
                    <GlassModalDescription className="text-xs text-slate-500 mt-0.5">
                      Select events and platforms to add
                    </GlassModalDescription>
                  </div>
                  <GlassModalClose className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <X className="h-4 w-4" />
                  </GlassModalClose>
                </div>

                <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
                  {/* ── Event checklist ────────────────────── */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Events
                    </p>
                    <div className="space-y-1.5">
                      {selectedTemplate.eventIds.map((eventId) => {
                        const std = getStandardEvent(eventId);
                        if (!std) return null;
                        const checked = checkedEvents.has(eventId);
                        return (
                          <label
                            key={eventId}
                            className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 cursor-pointer transition-colors"
                          >
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                                checked
                                  ? "bg-rose-500 border-rose-500"
                                  : "border-slate-300 bg-white"
                              }`}
                              onClick={(e) => {
                                e.preventDefault();
                                toggleEvent(eventId);
                              }}
                            >
                              {checked && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900">
                                {std.displayName}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {std.description}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                                TRIGGER_STYLES[std.defaultTrigger] ?? "bg-slate-50 text-slate-500 border-slate-200"
                              }`}
                            >
                              {std.defaultTrigger}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Platform selection ─────────────────── */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Platforms
                    </p>
                    <div className="space-y-1.5">
                      {PLATFORMS.map((platform) => {
                        const checked = selectedPlatforms.has(platform.id);
                        return (
                          <div key={platform.id}>
                            <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 cursor-pointer transition-colors">
                              <div
                                className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                                  checked
                                    ? "bg-rose-500 border-rose-500"
                                    : "border-slate-300 bg-white"
                                }`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  togglePlatform(platform.id);
                                }}
                              >
                                {checked && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: platform.color }}
                              />
                              <span className="text-sm font-medium text-slate-900">
                                {platform.label}
                              </span>
                            </label>

                            {/* LinkedIn extra field */}
                            {platform.id === "linkedin" && checked && (
                              <div className="ml-10 mt-1.5 mb-1">
                                <label className="block text-xs text-slate-500 mb-1">
                                  Conversion ID
                                </label>
                                <input
                                  type="text"
                                  value={linkedinConversionId}
                                  onChange={(e) => setLinkedinConversionId(e.target.value)}
                                  placeholder="12345678"
                                  className="w-full h-8 px-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition-colors"
                                />
                              </div>
                            )}

                            {/* Google Ads extra fields */}
                            {platform.id === "google_ads" && checked && (
                              <div className="ml-10 mt-1.5 mb-1 space-y-2">
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">
                                    Conversion ID
                                  </label>
                                  <input
                                    type="text"
                                    value={googleAdsConversionId}
                                    onChange={(e) => setGoogleAdsConversionId(e.target.value)}
                                    placeholder="1234567890"
                                    className="w-full h-8 px-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">
                                    Conversion Label
                                  </label>
                                  <input
                                    type="text"
                                    value={googleAdsConversionLabel}
                                    onChange={(e) => setGoogleAdsConversionLabel(e.target.value)}
                                    placeholder="abc1Def2Ghi3"
                                    className="w-full h-8 px-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition-colors"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <GlassModalClose className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors">
                    Cancel
                  </GlassModalClose>
                  <NeonButton
                    onClick={handleAdd}
                    disabled={checkedCount === 0 || selectedPlatforms.size === 0}
                    className="gap-1.5"
                  >
                    Add {checkedCount} event{checkedCount !== 1 ? "s" : ""}
                  </NeonButton>
                </div>
              </>
            )}
          </GlassModalCard>
        </GlassModalContent>
      </GlassModal>
    </>
  );
}
