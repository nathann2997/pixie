"use client";

import { useState, useEffect, useMemo } from "react";
import {
  GlassModal,
  GlassModalContent,
  GlassModalTitle,
  GlassModalCard,
  GlassModalClose,
} from "@/components/ui/glass-modal";
import { Button } from "@/components/ui/button";
import { NeonButton } from "@/components/ui/neon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PixelsConfig } from "@/components/dashboard/pixel-config-form";
import type { EventRule, EventParam } from "@/lib/normalize-event";
import type {
  Platform,
  StandardEvent,
  EventCategory,
  ParamDef,
} from "@/lib/platform-events";
import {
  PLATFORMS,
  STANDARD_EVENTS,
  getEventsByCategory,
  getPlatform,
  formatEventName,
} from "@/lib/platform-events";
import { EventParamField } from "@/components/dashboard/event-param-field";
import {
  MousePointerClick,
  Globe,
  Code2,
  ArrowLeft,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

export interface AddEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  currentTrackingConfig: {
    pixels: PixelsConfig;
    events: EventRule[];
  };
}

type TriggerType = "url" | "text" | "css";
type EventMode = "standard" | "custom";

const CATEGORY_LABELS: Record<EventCategory, string> = {
  ecommerce: "E-commerce",
  lead_gen: "Lead Generation",
  engagement: "Engagement",
};

// ── Sub-components ─────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
              step === n
                ? "bg-rose-400 text-white"
                : step > n
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-400 border border-slate-200"
            )}
          >
            {step > n ? <Check className="h-3 w-3" /> : n}
          </div>
          <span
            className={cn(
              "text-xs font-medium",
              step === n ? "text-slate-900" : "text-slate-500"
            )}
          >
            {n === 1 ? "Intent & Platforms" : "Trigger & Parameters"}
          </span>
          {n < 2 && <div className="w-6 h-px bg-slate-200 mx-1" />}
        </div>
      ))}
    </div>
  );
}

interface MatchCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}

function MatchCard({
  selected,
  onClick,
  icon,
  title,
  description,
  badge,
}: MatchCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border px-4 py-3.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400",
        selected
          ? "bg-rose-50 border-rose-300 text-rose-700"
          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center",
            selected
              ? "bg-rose-50 text-rose-500"
              : "bg-slate-100 text-slate-400"
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold">{title}</span>
            {badge && (
              <span className="text-xs bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-full px-2 py-0.5">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

// ── Main Modal ─────────────────────────────────────────

export function AddEventModal({
  open,
  onOpenChange,
  siteId,
  currentTrackingConfig,
}: AddEventModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [eventMode, setEventMode] = useState<EventMode>("standard");
  const [selectedEvent, setSelectedEvent] = useState<StandardEvent | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    new Set(["ga4"])
  );
  const [platformExtraFields, setPlatformExtraFields] = useState<
    Record<string, string>
  >({});
  const [platformNamesOpen, setPlatformNamesOpen] = useState(false);

  // Step 2 state
  const [triggerType, setTriggerType] = useState<TriggerType>("text");
  const [triggerValue, setTriggerValue] = useState("");
  const [paramValues, setParamValues] = useState<
    Record<string, string | number | boolean>
  >({});
  const [commonParamsOpen, setCommonParamsOpen] = useState(false);
  const [customParams, setCustomParams] = useState<
    { key: string; value: string }[]
  >([]);
  const [saving, setSaving] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setEventMode("standard");
        setSelectedEvent(null);
        setSearchQuery("");
        setCustomName("");
        setSelectedPlatforms(new Set(["ga4"]));
        setPlatformExtraFields({});
        setPlatformNamesOpen(false);
        setTriggerType("text");
        setTriggerValue("");
        setParamValues({});
        setCommonParamsOpen(false);
        setCustomParams([]);
      }, 200);
    }
  }, [open]);

  // Auto-fill trigger from standard event defaults
  useEffect(() => {
    if (selectedEvent) {
      const defaultTrigger = selectedEvent.defaultTrigger;
      if (defaultTrigger === "pageview") setTriggerType("url");
      else setTriggerType("text");

      if (selectedEvent.defaultSelector) {
        const sel = selectedEvent.defaultSelector;
        if (sel.startsWith("url=")) {
          setTriggerType("url");
          setTriggerValue(sel.replace("url=", ""));
        } else if (sel.startsWith("text=")) {
          setTriggerType("text");
          setTriggerValue(sel.replace("text=", ""));
        } else {
          setTriggerType("css");
          setTriggerValue(sel);
        }
      } else {
        setTriggerValue("");
      }

      // Pre-fill default param values
      const defaults: Record<string, string | number | boolean> = {};
      for (const p of [
        ...selectedEvent.requiredParams,
        ...selectedEvent.commonParams,
      ]) {
        if (p.defaultValue !== undefined) {
          defaults[p.key] = p.defaultValue;
        }
      }
      setParamValues(defaults);
    }
  }, [selectedEvent]);

  // Grouped standard events filtered by search
  const groupedEvents = useMemo(() => {
    const categories: EventCategory[] = [
      "ecommerce",
      "lead_gen",
      "engagement",
    ];
    const query = searchQuery.toLowerCase().trim();

    return categories
      .map((cat) => {
        let events = getEventsByCategory(cat);
        if (query) {
          events = events.filter(
            (e) =>
              e.displayName.toLowerCase().includes(query) ||
              e.description.toLowerCase().includes(query) ||
              e.id.includes(query)
          );
        }
        return { category: cat, label: CATEGORY_LABELS[cat], events };
      })
      .filter((g) => g.events.length > 0);
  }, [searchQuery]);

  // Platform toggle
  const togglePlatform = (id: Platform) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) next.add(id);
      return next;
    });
  };

  // Extra field handler
  const setExtraField = (key: string, value: string) => {
    setPlatformExtraFields((prev) => ({ ...prev, [key]: value }));
  };

  // Param change handler
  const setParamValue = (key: string, value: string | number | boolean) => {
    setParamValues((prev) => ({ ...prev, [key]: value }));
  };

  // Build platform names preview
  const platformNamesPreview = useMemo(() => {
    const parts: string[] = [];
    const platforms = Array.from(selectedPlatforms);

    if (eventMode === "standard" && selectedEvent) {
      for (const p of platforms) {
        const name = selectedEvent.names[p];
        if (name) {
          const cfg = getPlatform(p);
          parts.push(`${name} (${cfg.label})`);
        }
      }
    } else if (eventMode === "custom" && customName.trim()) {
      for (const p of platforms) {
        const cfg = getPlatform(p);
        const formatted = formatEventName(customName, cfg.namingConvention);
        if (formatted) {
          parts.push(`${formatted} (${cfg.label})`);
        }
      }
    }

    return parts;
  }, [eventMode, selectedEvent, customName, selectedPlatforms]);

  // Build platform names map for the EventRule
  const buildPlatformNames = (): Partial<Record<Platform, string>> => {
    const names: Partial<Record<Platform, string>> = {};
    const platforms = Array.from(selectedPlatforms);

    if (eventMode === "standard" && selectedEvent) {
      for (const p of platforms) {
        if (selectedEvent.names[p]) {
          names[p] = selectedEvent.names[p];
        }
      }
    } else if (eventMode === "custom" && customName.trim()) {
      for (const p of platforms) {
        const cfg = getPlatform(p);
        const formatted = formatEventName(customName, cfg.namingConvention);
        if (formatted) names[p] = formatted;
      }
    }

    return names;
  };

  // Build selector string
  const buildSelector = (type: TriggerType, value: string): string => {
    switch (type) {
      case "url": {
        const v = value.trim();
        return `url=${v.startsWith("/") ? v : `/${v}`}`;
      }
      case "text":
        return `text=${value.trim()}`;
      case "css":
        return value.trim();
    }
  };

  // Determine trigger from type
  const triggerFromType = (
    type: TriggerType
  ): "click" | "submit" | "pageview" => {
    return type === "url" ? "pageview" : "click";
  };

  // Get required params filtered by selected platforms
  const getFilteredParams = (params: ParamDef[]): ParamDef[] => {
    return params.filter((p) => {
      if (!p.platforms) return true;
      return p.platforms.some((pp) => selectedPlatforms.has(pp));
    });
  };

  // Validation
  const displayName =
    eventMode === "standard"
      ? selectedEvent?.displayName || ""
      : customName.trim();

  const step1Valid = (() => {
    if (!displayName) return false;
    if (selectedPlatforms.size === 0) return false;
    // Validate extra fields
    for (const p of Array.from(selectedPlatforms)) {
      const cfg = getPlatform(p);
      for (const field of cfg.extraFields) {
        if (field.required && !platformExtraFields[field.key]?.trim()) {
          return false;
        }
      }
    }
    return true;
  })();

  const step2Valid = triggerValue.trim().length > 0;

  // Handle save
  const handleSave = async () => {
    if (!step2Valid || saving) return;
    setSaving(true);

    try {
      const params: EventParam[] = [];

      // Collect params from standard event fields
      if (selectedEvent) {
        const allParams = [
          ...selectedEvent.requiredParams,
          ...selectedEvent.commonParams,
        ];
        for (const p of getFilteredParams(allParams)) {
          const val = paramValues[p.key];
          if (val !== undefined && val !== "" && val !== false) {
            params.push({
              key: p.key,
              value: val,
              valueSource: "static",
              platforms: p.platforms,
            });
          }
        }
      }

      // Add custom params
      for (const cp of customParams) {
        if (cp.key.trim() && cp.value.trim()) {
          params.push({
            key: cp.key.trim(),
            value: cp.value.trim(),
            valueSource: "static",
          });
        }
      }

      const newRule: EventRule = {
        id: crypto.randomUUID(),
        displayName: displayName,
        eventType: eventMode === "standard" ? "standard" : "custom",
        standardEventId: selectedEvent?.id,
        platforms: Array.from(selectedPlatforms),
        platformNames: buildPlatformNames(),
        trigger: triggerFromType(triggerType),
        selector: buildSelector(triggerType, triggerValue),
        params,
        platformFields: {
          linkedin_conversion_id:
            platformExtraFields["linkedin_conversion_id"] || undefined,
          google_ads_conversion_id:
            platformExtraFields["google_ads_conversion_id"] || undefined,
          google_ads_conversion_label:
            platformExtraFields["google_ads_conversion_label"] || undefined,
        },
        createdAt: new Date().toISOString(),
      };

      const existingEvents = currentTrackingConfig.events || [];
      const updatedEvents = [...existingEvents, newRule];

      await updateDoc(doc(db, "sites", siteId), {
        trackingConfig: { ...currentTrackingConfig, events: updatedEvents },
      });

      toast.success("Conversion event created");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to create event. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Naming convention helper text for custom mode
  const namingHints = useMemo(() => {
    const platforms = Array.from(selectedPlatforms);
    return platforms
      .map((p) => {
        const cfg = getPlatform(p);
        switch (cfg.namingConvention) {
          case "snake_case":
            return `${cfg.label}: snake_case (e.g. my_event)`;
          case "PascalCase":
            return `${cfg.label}: PascalCase (e.g. MyEvent)`;
          case "fixed":
            return `${cfg.label}: always "conversion"`;
          case "none":
            return `${cfg.label}: uses Conversion ID only`;
        }
      })
      .filter(Boolean);
  }, [selectedPlatforms]);

  return (
    <GlassModal open={open} onOpenChange={onOpenChange}>
      <GlassModalContent className="max-w-md">
        <GlassModalCard className="p-6 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <GlassModalTitle className="text-base font-semibold text-slate-900">
              Add conversion event
            </GlassModalTitle>
            <GlassModalClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 h-7 w-7 -mt-0.5 -mr-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </GlassModalClose>
          </div>
          <p className="text-xs text-slate-500 mb-5">
            Tell Pigxel what to track and when to send the data to your
            analytics.
          </p>

          <StepIndicator step={step} />

          {/* ── Step 1: Intent & Platforms ─────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Event type toggle */}
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setEventMode("standard");
                    setCustomName("");
                  }}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    eventMode === "standard"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEventMode("custom");
                    setSelectedEvent(null);
                    setSearchQuery("");
                  }}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    eventMode === "custom"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Custom
                </button>
              </div>

              {/* Standard mode: searchable event list */}
              {eventMode === "standard" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9 pl-9"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                    {groupedEvents.map((group) => (
                      <div key={group.category}>
                        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {group.label}
                          </span>
                        </div>
                        {group.events.map((evt) => (
                          <button
                            key={evt.id}
                            type="button"
                            onClick={() => setSelectedEvent(evt)}
                            className={cn(
                              "w-full text-left px-3 py-2 flex items-center justify-between transition-colors",
                              selectedEvent?.id === evt.id
                                ? "bg-rose-50 text-rose-700"
                                : "hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <div className="min-w-0">
                              <span className="text-sm font-medium">
                                {evt.displayName}
                              </span>
                              <span className="text-xs text-slate-400 ml-2">
                                {evt.description}
                              </span>
                            </div>
                            {selectedEvent?.id === evt.id && (
                              <Check className="h-3.5 w-3.5 text-rose-500 shrink-0 ml-2" />
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                    {groupedEvents.length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-slate-400">
                        No events match your search
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Custom mode: text input */}
              {eventMode === "custom" && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="ae-custom-name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Custom event name
                  </Label>
                  <Input
                    id="ae-custom-name"
                    placeholder="e.g. Newsletter Signup"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9"
                    autoFocus
                  />
                  {namingHints.length > 0 && (
                    <div className="space-y-0.5 pt-1">
                      {namingHints.map((hint, i) => (
                        <p key={i} className="text-xs text-slate-400">
                          {hint}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Platform checkboxes */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  Send this data to
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map((p) => {
                    const selected = selectedPlatforms.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlatform(p.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-left",
                          selected
                            ? "bg-rose-50 border-rose-300 text-rose-700"
                            : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          <span
                            className={cn(
                              "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                              selected
                                ? "bg-rose-400 border-rose-400"
                                : "border-slate-300 bg-white"
                            )}
                          >
                            {selected && (
                              <Check className="h-2.5 w-2.5 text-white" />
                            )}
                          </span>
                        </span>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Extra fields for selected platforms (LinkedIn, Google Ads) */}
              {Array.from(selectedPlatforms).map((pId) => {
                const cfg = getPlatform(pId);
                if (cfg.extraFields.length === 0) return null;
                return cfg.extraFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label
                      htmlFor={`ae-${field.key}`}
                      className="text-sm font-medium text-slate-700"
                    >
                      {cfg.label} — {field.label}
                    </Label>
                    <Input
                      id={`ae-${field.key}`}
                      placeholder={field.placeholder}
                      value={platformExtraFields[field.key] || ""}
                      onChange={(e) => setExtraField(field.key, e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 font-mono text-sm h-9"
                    />
                    {field.helpText && (
                      <p className="text-xs text-slate-400">
                        {field.helpText}
                      </p>
                    )}
                  </div>
                ));
              })}

              {/* Platform names preview */}
              {platformNamesPreview.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setPlatformNamesOpen(!platformNamesOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <span>Platform event names</span>
                    {platformNamesOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {platformNamesOpen && (
                    <div className="px-3 pb-2">
                      <p className="text-xs text-slate-600">
                        {platformNamesPreview.join(" · ")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1 actions */}
              <div className="flex gap-3 pt-1">
                <GlassModalClose asChild>
                  <Button
                    variant="secondary"
                    className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 h-9"
                  >
                    Cancel
                  </Button>
                </GlassModalClose>
                <NeonButton
                  className="flex-1 h-9 text-sm"
                  disabled={!step1Valid}
                  onClick={() => setStep(2)}
                >
                  Next: Trigger & Params
                </NeonButton>
              </div>
            </div>
          )}

          {/* ── Step 2: Trigger & Parameters ─────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Trigger section */}
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-3 block">
                  When should this event fire?
                </Label>
                <div className="space-y-2">
                  <MatchCard
                    selected={triggerType === "text"}
                    onClick={() => {
                      setTriggerType("text");
                      setTriggerValue("");
                    }}
                    icon={<MousePointerClick className="h-4 w-4" />}
                    title="When text is clicked"
                    description="Fires when someone clicks a button or link that contains specific text."
                    badge="Recommended"
                  />
                  <MatchCard
                    selected={triggerType === "url"}
                    onClick={() => {
                      setTriggerType("url");
                      setTriggerValue("");
                    }}
                    icon={<Globe className="h-4 w-4" />}
                    title="When someone visits a URL"
                    description="Fires when someone lands on a specific page, like a thank-you or confirmation page."
                  />
                  <MatchCard
                    selected={triggerType === "css"}
                    onClick={() => {
                      setTriggerType("css");
                      setTriggerValue("");
                    }}
                    icon={<Code2 className="h-4 w-4" />}
                    title="CSS selector"
                    description="Target a specific element on the page using a CSS selector."
                  />
                </div>
              </div>

              {/* Trigger value input */}
              {triggerType === "text" && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="ae-trigger-text"
                    className="text-sm font-medium text-slate-700"
                  >
                    What text does the button or link contain?
                  </Label>
                  <Input
                    id="ae-trigger-text"
                    placeholder="e.g. Subscribe, Sign Up, Get Started"
                    value={triggerValue}
                    onChange={(e) => setTriggerValue(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9"
                    autoFocus
                  />
                  <p className="text-xs text-slate-500">
                    Pigxel will fire whenever a button or link on your site
                    contains this text. Not case-sensitive.
                  </p>
                </div>
              )}

              {triggerType === "url" && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="ae-trigger-url"
                    className="text-sm font-medium text-slate-700"
                  >
                    What does the page URL contain?
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono">
                      /
                    </span>
                    <Input
                      id="ae-trigger-url"
                      placeholder="thank-you"
                      value={triggerValue.replace(/^\//, "")}
                      onChange={(e) => setTriggerValue(e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9 pl-6 font-mono text-sm"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Fires once when a visitor lands on a page whose URL contains
                    this path.
                  </p>
                </div>
              )}

              {triggerType === "css" && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="ae-trigger-css"
                    className="text-sm font-medium text-slate-700"
                  >
                    CSS selector
                  </Label>
                  <Input
                    id="ae-trigger-css"
                    placeholder="e.g. #submit-btn or .checkout-form"
                    value={triggerValue}
                    onChange={(e) => setTriggerValue(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9 font-mono text-sm"
                    autoFocus
                  />
                  <p className="text-xs text-slate-500">
                    Target a specific element by ID, class or attribute
                    selector.
                  </p>
                </div>
              )}

              {/* Parameters section */}
              {selectedEvent && (
                <div className="space-y-4">
                  {/* Required params */}
                  {getFilteredParams(selectedEvent.requiredParams).length >
                    0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-slate-700">
                        Required parameters
                      </Label>
                      {getFilteredParams(selectedEvent.requiredParams).map(
                        (p) => (
                          <EventParamField
                            key={p.key}
                            param={{ ...p, required: true }}
                            value={paramValues[p.key] ?? ""}
                            onChange={setParamValue}
                          />
                        )
                      )}
                    </div>
                  )}

                  {/* Common params (collapsible) */}
                  {getFilteredParams(selectedEvent.commonParams).length > 0 && (
                    <div className="rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setCommonParamsOpen(!commonParamsOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                      >
                        <span>
                          Common parameters (
                          {getFilteredParams(selectedEvent.commonParams).length})
                        </span>
                        {commonParamsOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      {commonParamsOpen && (
                        <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3">
                          {getFilteredParams(selectedEvent.commonParams).map(
                            (p) => (
                              <EventParamField
                                key={p.key}
                                param={p}
                                value={paramValues[p.key] ?? ""}
                                onChange={setParamValue}
                              />
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Custom parameters */}
              <div className="space-y-2">
                {customParams.map((cp, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Key"
                      value={cp.key}
                      onChange={(e) => {
                        const updated = [...customParams];
                        updated[i] = { ...updated[i], key: e.target.value };
                        setCustomParams(updated);
                      }}
                      className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9 flex-1 font-mono text-sm"
                    />
                    <Input
                      placeholder="Value"
                      value={cp.value}
                      onChange={(e) => {
                        const updated = [...customParams];
                        updated[i] = { ...updated[i], value: e.target.value };
                        setCustomParams(updated);
                      }}
                      className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCustomParams(customParams.filter((_, j) => j !== i))
                      }
                      className="text-slate-400 hover:text-slate-600 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setCustomParams([...customParams, { key: "", value: "" }])
                  }
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add parameter
                </button>
              </div>

              {/* Step 2 actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="secondary"
                  className="gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 h-9"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
                <NeonButton
                  className="flex-1 h-9 text-sm"
                  disabled={!step2Valid || saving}
                  onClick={handleSave}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </span>
                  ) : (
                    "Save event"
                  )}
                </NeonButton>
              </div>
            </div>
          )}
        </GlassModalCard>
      </GlassModalContent>
    </GlassModal>
  );
}
