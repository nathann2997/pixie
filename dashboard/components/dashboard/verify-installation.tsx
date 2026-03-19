"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, Search } from "lucide-react";

interface VerifyResult {
  scriptDetected: boolean;
  detectedPixels: string[];
  pageUrl: string;
}

interface VerifyInstallationProps {
  siteId: string;
  siteUrl: string;
}

export function VerifyInstallation({ siteId, siteUrl }: VerifyInstallationProps) {
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "failed">("idle");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setStatus("checking");
    setError(null);
    setResult(null);

    try {
      const verify = httpsCallable<
        { siteId: string; url: string },
        { success: boolean; scriptDetected: boolean; detectedPixels: string[]; pageUrl: string }
      >(functions, "verifySiteInstallation");

      const res = await verify({ siteId, url: siteUrl });

      if (res.data.success && res.data.scriptDetected) {
        setResult({
          scriptDetected: true,
          detectedPixels: res.data.detectedPixels,
          pageUrl: res.data.pageUrl,
        });
        setStatus("success");
      } else {
        setResult({
          scriptDetected: false,
          detectedPixels: [],
          pageUrl: res.data.pageUrl || siteUrl,
        });
        setStatus("failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Try again.");
      setStatus("failed");
    }
  };

  if (status === "idle") {
    return (
      <button
        onClick={handleVerify}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        Verify installation
      </button>
    );
  }

  if (status === "checking") {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Checking {new URL(siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`).hostname}...</span>
      </div>
    );
  }

  if (status === "success" && result) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 mt-3">
        <div className="flex items-center gap-2 mb-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="text-sm font-medium text-emerald-700">Script detected</span>
        </div>
        {result.detectedPixels.length > 0 && (
          <p className="text-xs text-emerald-600 ml-6">
            Found: {result.detectedPixels.join(", ")}
          </p>
        )}
        <button
          onClick={() => setStatus("idle")}
          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium ml-6 mt-1"
        >
          Check again
        </button>
      </div>
    );
  }

  // failed
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 mt-3">
      <div className="flex items-center gap-2 mb-1.5">
        <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-sm font-medium text-amber-700">
          {error || "Script not detected yet"}
        </span>
      </div>
      <p className="text-xs text-amber-600 ml-6">
        Make sure the script tag is in your site&apos;s &lt;head&gt; and the page has been deployed.
      </p>
      <button
        onClick={handleVerify}
        className="text-xs text-amber-600 hover:text-amber-700 font-medium ml-6 mt-1"
      >
        Try again
      </button>
    </div>
  );
}
