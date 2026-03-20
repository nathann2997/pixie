"use client";

import { useEffect, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { doc, updateDoc } from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { NeonButton } from "@/components/ui/neon-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STANDARD_EVENTS, type Platform } from "@/lib/platform-events";
import type { EventRule } from "@/lib/normalize-event";
import {
  Send,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  MousePointerClick,
  FormInput,
  Eye,
  BarChart2,
  Share2,
  Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface EventDraft {
  selector: string;
  trigger: "click" | "submit" | "pageview";
  platform: "ga4" | "meta" | "tiktok" | "linkedin" | "google_ads" | "both" | "all";
  event_name: string;
  description: string;
  google_ads_conversion_label?: string;
  linkedin_conversion_id?: string;
}

interface TrackingConfig {
  pixels: { ga4?: string; meta?: string; tiktok?: string; linkedin?: string; google_ads?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: any[];
}

interface EventChatProps {
  siteId: string;
  siteUrl: string;
  trackingConfig: TrackingConfig;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TRIGGER_ICONS = {
  click:     MousePointerClick,
  submit:    FormInput,
  pageview:  Eye,
};

const PLATFORM_LABELS: Record<string, string> = {
  ga4:        "Google Analytics 4",
  meta:       "Meta Pixel",
  tiktok:     "TikTok Pixel",
  linkedin:   "LinkedIn Insight Tag",
  google_ads: "Google Ads",
  both:       "GA4 + Meta",
  all:        "All Platforms",
};

const PLATFORM_STYLES: Record<string, string> = {
  ga4:        "bg-blue-50 border-blue-200 text-blue-700",
  meta:       "bg-indigo-50 border-indigo-200 text-indigo-700",
  tiktok:     "bg-slate-900 border-slate-700 text-white",
  linkedin:   "bg-sky-50 border-sky-200 text-sky-700",
  google_ads: "bg-amber-50 border-amber-200 text-amber-700",
  both:       "bg-violet-50 border-violet-200 text-violet-700",
  all:        "bg-rose-50 border-rose-200 text-rose-700",
};

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! Tell me what you want to track on your site. For example: \"track form submissions on /contact-sales\" or \"track clicks on the Buy Now button\".",
};

// ── Draft → EventRule mapper ──────────────────────────────────────────────────

function chatDraftToEventRule(draft: EventDraft): EventRule {
  // Expand platform: "both" → ['ga4', 'meta'], "all" → all platforms
  const platforms: Platform[] =
    draft.platform === "both"
      ? ["ga4", "meta"]
      : draft.platform === "all"
        ? ["ga4", "meta", "tiktok", "linkedin", "google_ads"]
        : [draft.platform as Platform];

  // Look up standard event for platform names
  const std = STANDARD_EVENTS.find(
    (e) => e.id === draft.event_name || Object.values(e.names).some((n) => n === draft.event_name)
  );

  const platformNames: Partial<Record<Platform, string>> = {};
  for (const p of platforms) {
    platformNames[p] = std?.names[p] || draft.event_name;
  }

  return {
    id: crypto.randomUUID(),
    displayName: std?.displayName || draft.description || draft.event_name,
    eventType: std ? "standard" : "custom",
    standardEventId: std?.id,
    platforms,
    platformNames,
    trigger: draft.trigger,
    selector: draft.selector,
    params: [],
    platformFields: {
      linkedin_conversion_id: draft.linkedin_conversion_id,
      google_ads_conversion_label: draft.google_ads_conversion_label,
    },
    description: draft.description,
    createdAt: new Date().toISOString(),
  };
}

// ── Event preview card ────────────────────────────────────────────────────────

function EventPreviewCard({
  event,
  onConfirm,
  onStartOver,
  saving,
}: {
  event: EventDraft;
  onConfirm: () => void;
  onStartOver: () => void;
  saving: boolean;
}) {
  const TriggerIcon = TRIGGER_ICONS[event.trigger] ?? MousePointerClick;

  return (
    <div className="mx-3 mb-2 bg-white border border-emerald-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border-b border-emerald-100">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        <p className="text-sm font-semibold text-emerald-800">Ready to add</p>
      </div>
      <div className="p-4 space-y-3">
        {/* Event name */}
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-sm font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
            {event.event_name}
          </code>
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium",
            PLATFORM_STYLES[event.platform] ?? PLATFORM_STYLES.ga4
          )}>
            {(event.platform === "ga4" || event.platform === "both" || event.platform === "all") && <BarChart2 className="h-3 w-3" />}
            {event.platform === "meta" && <Share2 className="h-3 w-3" />}
            {PLATFORM_LABELS[event.platform] ?? event.platform}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <TriggerIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="capitalize font-medium text-slate-700">{event.trigger}</span>
            <span className="text-slate-300">·</span>
            <code className="font-mono text-slate-500 truncate">{event.selector}</code>
          </div>
          {event.description && (
            <p className="text-slate-500 leading-relaxed pl-5">{event.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <NeonButton
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 gap-1.5"
          >
            {saving ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Adding…</>
            ) : (
              <><CheckCircle2 className="h-3.5 w-3.5" />Add event</>
            )}
          </NeonButton>
          <button
            onClick={onStartOver}
            disabled={saving}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 border border-rose-200 shrink-0 mr-2 mt-0.5">
          <Sparkles className="h-3 w-3 text-rose-500" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-rose-400 text-white rounded-tr-sm"
            : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

// ── Thinking indicator ────────────────────────────────────────────────────────

function ThinkingBubble() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 border border-rose-200 shrink-0">
        <Sparkles className="h-3 w-3 text-rose-500" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EventChat({ siteId, siteUrl, trackingConfig }: EventChatProps) {
  const [messages,    setMessages]    = useState<ChatMessage[]>([GREETING]);
  const [input,       setInput]       = useState("");
  const [thinking,    setThinking]    = useState(false);
  const [pendingEvent, setPendingEvent] = useState<EventDraft | null>(null);
  const [saving,      setSaving]      = useState(false);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking, pendingEvent]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || thinking) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setThinking(true);

    try {
      const fn = httpsCallable<
        { siteId: string; siteUrl: string; messages: ChatMessage[] },
        { message: string; event_ready: boolean; event?: EventDraft }
      >(functions, "eventBuilderChat");

      // Send everything except the initial greeting (it's in the system prompt)
      const historyToSend = nextMessages.filter((m, i) => !(i === 0 && m.role === "assistant"));
      const res = await fn({ siteId, siteUrl, messages: historyToSend });

      const assistantMsg: ChatMessage = { role: "assistant", content: res.data.message };
      setMessages((prev) => [...prev, assistantMsg]);

      if (res.data.event_ready && res.data.event) {
        setPendingEvent(res.data.event);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
      toast.error(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleConfirm = async () => {
    if (!pendingEvent) return;
    setSaving(true);
    try {
      const newRule = chatDraftToEventRule(pendingEvent);
      const updatedEvents = [...(trackingConfig.events ?? []), newRule];
      await updateDoc(doc(db, "sites", siteId), {
        trackingConfig: { ...trackingConfig, events: updatedEvents },
      });
      toast.success(`"${newRule.displayName}" added to your events.`);
      handleStartOver();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  const handleStartOver = () => {
    setPendingEvent(null);
    setMessages([GREETING]);
    setInput("");
    inputRef.current?.focus();
  };

  const hasChatted = messages.length > 1;

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" style={{ height: "520px" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 border border-rose-100 shrink-0">
          <Sparkles className="h-4 w-4 text-rose-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Event Builder</p>
          <p className="text-xs text-slate-400">Describe what you want to track in plain English</p>
        </div>
        {hasChatted && (
          <button
            onClick={handleStartOver}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start over
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {thinking && <ThinkingBubble />}
        {pendingEvent && !thinking && (
          <EventPreviewCard
            event={pendingEvent}
            onConfirm={handleConfirm}
            onStartOver={handleStartOver}
            saving={saving}
          />
        )}
      </div>

      {/* Quick prompts (only on first message) */}
      {messages.length === 1 && !thinking && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5 shrink-0">
          {[
            "Track form submissions on the contact page",
            "Track clicks on the Buy Now button",
            "Track visits to the pricing page",
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingEvent ? "Any changes? Or confirm to add the event." : "Describe what you want to track…"}
            disabled={thinking || saving}
            rows={1}
            className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition-colors disabled:opacity-50 max-h-28 overflow-y-auto"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || thinking || saving}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-rose-400 hover:bg-rose-500 text-white transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
