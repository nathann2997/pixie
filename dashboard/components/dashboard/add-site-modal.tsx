"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirebase } from "@/components/providers/firebase-provider";
import {
  GlassModal,
  GlassModalContent,
  GlassModalTitle,
  GlassModalDescription,
  GlassModalCard,
  GlassModalClose,
} from "@/components/ui/glass-modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NeonButton } from "@/components/ui/neon-button";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, LayoutGrid } from "lucide-react";

const inputCls =
  "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9";

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 32) || "project";
}

function generateId(slug: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${slug}-${random}`;
}

export interface AddSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (siteId: string) => void;
}

export function AddSiteModal({
  open,
  onOpenChange,
  onSuccess,
}: AddSiteModalProps) {
  const [siteName, setSiteName] = useState("");
  const [domainUrl, setDomainUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useFirebase();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError("You must be logged in to create a project.");
      return;
    }
    const url = domainUrl.trim();
    if (!url) {
      setError("Please enter a website URL.");
      return;
    }
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    setSubmitting(true);
    try {
      const slug = slugFromName(siteName.trim() || "My Project");
      const newId = generateId(slug);
      await setDoc(doc(db, "sites", newId), {
        owner_id: user.uid,
        name: siteName.trim() || normalizedUrl,
        status: "pending",
        url: normalizedUrl,
        createdAt: serverTimestamp(),
        trackingConfig: {
          pixels: {},
          events: [],
        },
      });
      onOpenChange(false);
      setSiteName("");
      setDomainUrl("");
      onSuccess?.(newId);
      toast.success("Project created. Saved to workspace.");
      router.push(`/dashboard/${newId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create project. Try again.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassModal open={open} onOpenChange={onOpenChange}>
      <GlassModalContent>
        <GlassModalCard className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
                <LayoutGrid className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <GlassModalTitle className="text-base font-semibold text-slate-900">
                  New project
                </GlassModalTitle>
                <GlassModalDescription className="text-sm text-slate-500 mt-0.5">
                  Pigxel will organize tracking for this website.
                </GlassModalDescription>
              </div>
            </div>
            <GlassModalClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </GlassModalClose>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="add-site-name" className="text-sm font-medium text-slate-700">
                Project name
              </Label>
              <Input
                id="add-site-name"
                type="text"
                placeholder="e.g. My Shopify Store"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-site-url" className="text-sm font-medium text-slate-700">
                Website URL
              </Label>
              <Input
                id="add-site-url"
                type="url"
                placeholder="https://yoursite.com"
                value={domainUrl}
                onChange={(e) => setDomainUrl(e.target.value)}
                className={inputCls}
              />
            </div>
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                {error}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <GlassModalClose asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 h-9"
                >
                  Cancel
                </Button>
              </GlassModalClose>
              <NeonButton type="submit" disabled={submitting} className="flex-1">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating…
                  </span>
                ) : (
                  "Create project"
                )}
              </NeonButton>
            </div>
          </form>
        </GlassModalCard>
      </GlassModalContent>
    </GlassModal>
  );
}
