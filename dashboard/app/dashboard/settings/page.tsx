"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfile,
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useFirebase } from "@/components/providers/firebase-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SidebarLayout } from "@/components/layouts/sidebar-layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NeonButton } from "@/components/ui/neon-button";
import {
  GlassModal,
  GlassModalContent,
  GlassModalTitle,
  GlassModalDescription,
  GlassModalCard,
  GlassModalClose,
} from "@/components/ui/glass-modal";
import { toast } from "sonner";
import { User, Lock, Trash2, AlertTriangle, X, Check, Zap } from "lucide-react";

const inputCls =
  "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 h-9";

// ── Profile section ───────────────────────────────────────────

function ProfileSection() {
  const { user } = useFirebase();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() || null });
      toast.success("Name updated");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 border border-rose-100">
          <User className="h-4 w-4 text-rose-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
          <p className="text-xs text-slate-400 mt-0.5">Your display name inside Pigxel.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="display-name" className="text-sm text-slate-700">
            Display name
          </Label>
          <Input
            id="display-name"
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm text-slate-700">Email</Label>
          <Input
            type="email"
            value={user?.email ?? ""}
            disabled
            className="bg-slate-50 border-slate-200 text-slate-400 h-9 cursor-not-allowed"
          />
          <p className="text-xs text-slate-400">Email cannot be changed here.</p>
        </div>

        <NeonButton type="submit" disabled={saving} className="h-9 text-sm">
          {saved ? (
            <>
              <Check className="h-4 w-4 mr-2 text-emerald-300" />
              Saved!
            </>
          ) : saving ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving…
            </span>
          ) : (
            "Save changes"
          )}
        </NeonButton>
      </form>
    </GlassCard>
  );
}

// ── Change password section ───────────────────────────────────

function PasswordSection() {
  const { user } = useFirebase();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show for email/password users
  const isEmailUser = user?.providerData.some((p) => p.providerId === "password");
  if (!isEmailUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (next.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (!auth.currentUser || !user?.email) return;

    setSaving(true);
    try {
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, next);
      toast.success("Password updated");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      const friendly = msg.includes("wrong-password") || msg.includes("invalid-credential")
        ? "Current password is incorrect."
        : msg;
      setError(friendly);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 border border-rose-100">
          <Lock className="h-4 w-4 text-rose-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
          <p className="text-xs text-slate-500 mt-0.5">Update your login password.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="current-password" className="text-sm text-slate-700">
            Current password
          </Label>
          <Input
            id="current-password"
            type="password"
            placeholder="••••••••"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputCls}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password" className="text-sm text-slate-700">
            New password
          </Label>
          <Input
            id="new-password"
            type="password"
            placeholder="Min. 6 characters"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputCls}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password" className="text-sm text-slate-700">
            Confirm new password
          </Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Repeat new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputCls}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <NeonButton type="submit" disabled={saving || !current || !next || !confirm} className="h-9 text-sm">
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Updating…
            </span>
          ) : (
            "Update password"
          )}
        </NeonButton>
      </form>
    </GlassCard>
  );
}

// ── Delete account modal ──────────────────────────────────────

function DeleteAccountModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useFirebase();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmailUser = user?.providerData.some((p) => p.providerId === "password");

  const handleDelete = async () => {
    if (!auth.currentUser || !user) return;
    setError(null);
    setDeleting(true);
    try {
      // Re-authenticate for email users
      if (isEmailUser && user.email) {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }

      // Delete all sites owned by this user
      const sitesSnap = await getDocs(
        query(collection(db, "sites"), where("owner_id", "==", user.uid))
      );
      await Promise.all(sitesSnap.docs.map((d) => deleteDoc(doc(db, "sites", d.id))));

      // Delete the Firebase Auth account
      await deleteUser(auth.currentUser);

      toast.success("Account deleted");
      router.push("/login");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete account";
      const friendly = msg.includes("wrong-password") || msg.includes("invalid-credential")
        ? "Incorrect password."
        : msg.includes("requires-recent-login")
          ? "Please sign out and sign back in, then try again."
          : msg;
      setError(friendly);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <GlassModal open={open} onOpenChange={(v) => { if (!deleting) onOpenChange(v); }}>
      <GlassModalContent>
        <GlassModalCard className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <GlassModalTitle className="text-base font-semibold text-slate-900">
                  Delete account
                </GlassModalTitle>
                <GlassModalDescription className="text-sm text-slate-400 mt-0.5">
                  Permanent — this cannot be undone.
                </GlassModalDescription>
              </div>
            </div>
            <GlassModalClose asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </GlassModalClose>
          </div>

          <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 mb-5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 leading-relaxed">
                Your account and <strong className="text-rose-900">all sites</strong> will be permanently deleted.
                Pigxel scripts on your websites will stop working immediately.
              </p>
            </div>
          </div>

          {isEmailUser && (
            <div className="space-y-1.5 mb-5">
              <Label className="text-sm text-slate-700">
                Confirm your password to continue
              </Label>
              <Input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                autoComplete="current-password"
              />
            </div>
          )}

          {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 mb-4">
            {error}
          </div>
          )}

          <div className="flex gap-3">
            <GlassModalClose asChild>
              <Button
                variant="secondary"
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 h-9"
                disabled={deleting}
              >
                Cancel
              </Button>
            </GlassModalClose>
            <Button
              onClick={handleDelete}
              disabled={deleting || (isEmailUser ? !password : false)}
              className="flex-1 h-9 bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting…
                </span>
              ) : (
                "Delete my account"
              )}
            </Button>
          </div>
        </GlassModalCard>
      </GlassModalContent>
    </GlassModal>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  return (
    <AuthGuard>
      <SidebarLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
          <DeleteAccountModal open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen} />

          <div className="mb-8">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Settings</h1>
            <p className="text-sm text-slate-400 mt-0.5">Manage your account preferences.</p>
          </div>

          <div className="space-y-5">
            <ProfileSection />

          {/* Plan */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200">
                <Zap className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Plan</h3>
                <p className="text-xs text-slate-500">Your current Pigxel plan</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-sm font-medium text-emerald-700">
                Free
              </span>
              <p className="text-xs text-slate-400">Unlimited sites · Unlimited events</p>
            </div>
          </GlassCard>

            <PasswordSection />

            {/* Danger zone */}
            <div className="rounded-xl border border-rose-500/20 overflow-hidden">
              <div className="bg-rose-500/5 px-5 py-4 border-b border-rose-500/20">
                <h2 className="text-sm font-semibold text-rose-400">Danger zone</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actions here are permanent and cannot be reversed.
                </p>
              </div>
              <div className="px-5 py-4 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Delete account</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Permanently delete your Pigxel account and all sites.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setDeleteAccountOpen(true)}
                    className="shrink-0 border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 bg-transparent h-9 text-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </AuthGuard>
  );
}
