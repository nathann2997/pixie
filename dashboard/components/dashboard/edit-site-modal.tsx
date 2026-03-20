"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  GlassModal,
  GlassModalContent,
  GlassModalTitle,
  GlassModalDescription,
  GlassModalCard,
  GlassModalClose,
} from "@/components/ui/glass-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NeonButton } from "@/components/ui/neon-button";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";

export interface EditSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  currentName: string;
  currentUrl: string;
}

const inputCls =
  "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9";

export function EditSiteModal({
  open,
  onOpenChange,
  siteId,
  currentName,
  currentUrl,
}: EditSiteModalProps) {
  const [name, setName] = useState(currentName);
  const [url, setUrl] = useState(currentUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync if parent values change
  useEffect(() => {
    if (open) {
      setName(currentName);
      setUrl(currentUrl);
      setError(null);
    }
  }, [open, currentName, currentUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("Please enter a website URL.");
      return;
    }
    const normalizedUrl = trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`;
    const trimmedName = name.trim() || normalizedUrl;

    setSaving(true);
    try {
      await updateDoc(doc(db, "sites", siteId), {
        name: trimmedName,
        url: normalizedUrl,
      });
      toast.success("Site updated");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save changes.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassModal open={open} onOpenChange={onOpenChange}>
      <GlassModalContent>
        <GlassModalCard className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
                <Pencil className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <GlassModalTitle className="text-base font-semibold text-slate-900">
                  Edit site
                </GlassModalTitle>
                <GlassModalDescription className="text-sm text-slate-500 mt-0.5">
                  Update your site name or URL.
                </GlassModalDescription>
              </div>
            </div>
            <GlassModalClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </GlassModalClose>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-site-name" className="text-sm font-medium text-slate-700">
                Website name
              </Label>
              <Input
                id="edit-site-name"
                type="text"
                placeholder="e.g. My Shopify Store"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-site-url" className="text-sm font-medium text-slate-700">
                Website URL
              </Label>
              <Input
                id="edit-site-url"
                type="url"
                placeholder="https://yoursite.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={inputCls}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <GlassModalClose asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 h-9"
                  disabled={saving}
                >
                  Cancel
                </Button>
              </GlassModalClose>
              <NeonButton type="submit" disabled={saving} className="flex-1 h-9 text-sm">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving…
                  </span>
                ) : (
                  "Save changes"
                )}
              </NeonButton>
            </div>
          </form>
        </GlassModalCard>
      </GlassModalContent>
    </GlassModal>
  );
}
