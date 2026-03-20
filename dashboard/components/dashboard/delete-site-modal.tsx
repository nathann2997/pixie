"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, deleteDoc } from "firebase/firestore";
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
import { toast } from "sonner";
import { Trash2, X, AlertTriangle } from "lucide-react";

export interface DeleteSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  siteName: string;
}

export function DeleteSiteModal({
  open,
  onOpenChange,
  siteId,
  siteName,
}: DeleteSiteModalProps) {
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const confirmed = confirmation.trim().toLowerCase() === siteName.trim().toLowerCase();

  const handleDelete = async () => {
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "sites", siteId));
      toast.success("Site deleted");
      onOpenChange(false);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete site");
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (deleting) return;
    setConfirmation("");
    onOpenChange(false);
  };

  return (
    <GlassModal open={open} onOpenChange={handleClose}>
      <GlassModalContent>
        <GlassModalCard className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <GlassModalTitle className="text-base font-semibold text-slate-900">
                  Delete site
                </GlassModalTitle>
                <GlassModalDescription className="text-sm text-slate-500 mt-0.5">
                  This action is permanent and cannot be undone.
                </GlassModalDescription>
              </div>
            </div>
            <GlassModalClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                onClick={handleClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </GlassModalClose>
          </div>

          <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 mb-5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-sm text-rose-700 leading-relaxed">
                Deleting <span className="font-semibold text-rose-900">{siteName}</span> will
                permanently remove all its tracking rules, pixel IDs, and audit data.
                The Pigxel script on your site will stop working.
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            <label className="text-sm text-slate-700">
              Type <span className="font-mono font-semibold text-slate-900">{siteName}</span> to confirm
            </label>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={siteName}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9"
              onKeyDown={(e) => e.key === "Enter" && confirmed && handleDelete()}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 h-9"
              onClick={handleClose}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!confirmed || deleting}
              onClick={handleDelete}
              className="flex-1 h-9 bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting…
                </span>
              ) : (
                "Delete site"
              )}
            </Button>
          </div>
        </GlassModalCard>
      </GlassModalContent>
    </GlassModal>
  );
}
