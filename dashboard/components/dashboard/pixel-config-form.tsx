"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GlassCard } from "@/components/ui/glass-card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NeonButton } from "@/components/ui/neon-button";
import { toast } from "sonner";
import { Check, HelpCircle } from "lucide-react";

const inputCls =
  "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 font-mono text-sm h-9";

export interface PixelsConfig {
  ga4?: string;
  meta?: string;
  tiktok?: string;
  linkedin?: string;
  google_ads?: string;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block ml-1.5 align-middle">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="More info"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 shadow-xl pointer-events-none">
          {children}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
}

export interface PixelConfigFormProps {
  siteId: string;
  initialPixels: PixelsConfig;
  currentTrackingConfig: {
    pixels: PixelsConfig;
    events: unknown[];
  };
  compact?: boolean;
}

export function PixelConfigForm({
  siteId,
  initialPixels,
  currentTrackingConfig,
  compact = false,
}: PixelConfigFormProps) {
  const [ga4,        setGa4]        = useState(initialPixels.ga4        ?? "");
  const [meta,       setMeta]       = useState(initialPixels.meta       ?? "");
  const [tiktok,     setTiktok]     = useState(initialPixels.tiktok     ?? "");
  const [linkedin,   setLinkedin]   = useState(initialPixels.linkedin   ?? "");
  const [googleAds,  setGoogleAds]  = useState(initialPixels.google_ads ?? "");
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    setGa4(initialPixels.ga4        ?? "");
    setMeta(initialPixels.meta      ?? "");
    setTiktok(initialPixels.tiktok  ?? "");
    setLinkedin(initialPixels.linkedin  ?? "");
    setGoogleAds(initialPixels.google_ads ?? "");
  }, [initialPixels.ga4, initialPixels.meta, initialPixels.tiktok, initialPixels.linkedin, initialPixels.google_ads]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateDoc(doc(db, "sites", siteId), {
        trackingConfig: {
          ...currentTrackingConfig,
          pixels: {
            ga4:        ga4.trim()       || null,
            meta:       meta.trim()      || null,
            tiktok:     tiktok.trim()    || null,
            linkedin:   linkedin.trim()  || null,
            google_ads: googleAds.trim() || null,
          },
        },
      });
      setSaved(true);
      toast.success("Saved to workspace.");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {!compact && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Connect your data sources</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Paste your tracking IDs below. Pigxel will automatically send conversion data to these
            platforms whenever a tracking event fires on your website.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* GA4 */}
        <GlassCard className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-[#fef3e2] border border-[#fde68a] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                <path fill="#E37400" d="M15.86 4.39V19.39C15.86 21.06 17 22 18.25 22C19.39 22 20.64 21.21 20.64 19.39V4.5C20.64 2.96 19.5 2 18.25 2S15.86 3.06 15.86 4.39Z"/>
                <path fill="#F9AB00" d="M9.61 12V19.39C9.61 21.07 10.77 22 12 22C13.14 22 14.39 21.21 14.39 19.39V12.11C14.39 10.57 13.25 9.61 12 9.61S9.61 10.67 9.61 12Z"/>
                <path fill="#F9AB00" d="M5.75 17.23C7.07 17.23 8.14 18.3 8.14 19.61C8.14 20.93 7.07 22 5.75 22S3.36 20.93 3.36 19.61C3.36 18.3 4.43 17.23 5.75 17.23Z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-1">
                <Label htmlFor="pixel-ga4" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Google Analytics 4
                </Label>
                <FieldHint>
                  In GA4, go to Admin → Data Streams → click your stream → copy the Measurement ID (starts with G-)
                </FieldHint>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Tracks page views, events, and conversions in Google Analytics.
              </p>
              <Input
                id="pixel-ga4"
                type="text"
                placeholder="G-XXXXXXXXXX"
                value={ga4}
                onChange={(e) => setGa4(e.target.value)}
                className={inputCls}
              />
              {ga4 && !ga4.startsWith("G-") && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  Google Analytics 4 IDs usually start with G-
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Meta Pixel */}
        <GlassCard className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-[#e7f0fd] border border-[#c3d9fb] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-1">
                <Label htmlFor="pixel-meta" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Facebook / Meta Pixel
                </Label>
                <FieldHint>
                  In Meta Business Suite, go to Events Manager → Data Sources → select your pixel → copy the Pixel ID (a long number)
                </FieldHint>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Tracks conversions for Facebook and Instagram ad campaigns.
              </p>
              <Input
                id="pixel-meta"
                type="text"
                placeholder="1234567890123456"
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </GlassCard>

        {/* TikTok Pixel */}
        <GlassCard className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-black border border-slate-700 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                <path fill="#ffffff" d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.78 1.52V6.82a4.85 4.85 0 01-1.01-.13z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-1">
                <Label htmlFor="pixel-tiktok" className="text-sm font-medium text-slate-700 cursor-pointer">
                  TikTok Pixel
                </Label>
                <FieldHint>
                  In TikTok Ads Manager, go to Assets → Events → Web Events → select your pixel → copy the Pixel ID (20 characters)
                </FieldHint>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Tracks conversions for TikTok ad campaigns.
              </p>
              <Input
                id="pixel-tiktok"
                type="text"
                placeholder="BTVR9ABCDEF1234567890"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                className={inputCls}
              />
              {tiktok && tiktok.length !== 20 && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  TikTok Pixel IDs are exactly 20 characters
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* LinkedIn Insight Tag */}
        <GlassCard className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-[#e8f0fe] border border-[#c3d1f5] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                <path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-1">
                <Label htmlFor="pixel-linkedin" className="text-sm font-medium text-slate-700 cursor-pointer">
                  LinkedIn Insight Tag
                </Label>
                <FieldHint>
                  In LinkedIn Campaign Manager, go to Analyze → Insight Tag → copy the Partner ID (a number, e.g. 123456)
                </FieldHint>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Tracks conversions for LinkedIn ad campaigns.
              </p>
              <Input
                id="pixel-linkedin"
                type="text"
                placeholder="123456"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className={inputCls}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Each conversion action also needs a Conversion ID. You will add those when creating individual events.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Google Ads */}
        <GlassCard className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                <path fill="#34A853" d="M3.9998 22.9291C1.7908 22.9291 0 21.1383 0 18.9293s1.7908-3.9998 3.9998-3.9998 3.9998 1.7908 3.9998 3.9998-1.7908 3.9998-3.9998 3.9998z"/>
                <path fill="#4285F4" d="M23.4641 16.9287L15.4632 3.072C14.3586 1.1587 11.9121.5028 9.9988 1.6074S7.4295 5.1585 8.5341 7.0718l8.0009 13.8567c1.1046 1.9133 3.5511 2.5679 5.4644 1.4646 1.9134-1.1046 2.568-3.5511 1.4647-5.4644z"/>
                <path fill="#FBBC04" d="M7.5137 4.8438L1.5645 15.1484A4.5 4.5 0 0 1 4 14.4297c2.5597-.0075 4.6248 2.1585 4.4941 4.7148l3.2168-5.5723-3.6094-6.25c-.4499-.7793-.6322-1.6394-.5878-2.4784z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-1">
                <Label htmlFor="pixel-google-ads" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Google Ads
                </Label>
                <FieldHint>
                  In Google Ads, go to Tools → Conversions → select a conversion action → Tag setup → copy the Conversion ID (starts with AW-)
                </FieldHint>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Tracks conversions directly in Google Ads for campaign bidding and reporting.
              </p>
              <Input
                id="pixel-google-ads"
                type="text"
                placeholder="AW-XXXXXXXXXX"
                value={googleAds}
                onChange={(e) => setGoogleAds(e.target.value)}
                className={inputCls}
              />
              {googleAds && !googleAds.startsWith("AW-") && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  Google Ads Conversion IDs start with AW-
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1.5">
                Each conversion action also needs a Conversion Label. You will add those when creating individual events.
              </p>
            </div>
          </div>
        </GlassCard>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <NeonButton type="submit" disabled={saving} className="w-full sm:w-auto">
          {saved ? (
            <>
              <Check className="h-4 w-4 mr-2 text-white/80" />
              Saved!
            </>
          ) : saving ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving…
            </span>
          ) : (
            "Save data sources"
          )}
        </NeonButton>
      </form>
    </div>
  );
}
