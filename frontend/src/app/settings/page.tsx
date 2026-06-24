"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, Check, AlertTriangle, X } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { cn } from "@/lib/utils";
import {
  useAuth,
  updateProfile,
  deleteAccount,
  resendVerification,
  logout,
  type LearningModality,
  type LearningPace,
} from "@/lib/useAuth";

const EDU_LEVELS = [
  { value: "high_school", label: "High school" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "masters", label: "Masters" },
];
const MODALITIES: { value: LearningModality; label: string }[] = [
  { value: "visual", label: "Visual" },
  { value: "text", label: "Text" },
  { value: "audio", label: "Audio" },
  { value: "all", label: "All / mixed" },
];
const PACES: { value: LearningPace; label: string }[] = [
  { value: "regular", label: "Regular" },
  { value: "methodical", label: "Methodical" },
  { value: "deep", label: "Deep" },
];

const inputCls =
  "w-full rounded-2xl border border-primary/15 bg-white/60 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground disabled:opacity-60";
const labelCls = "text-xs font-bold uppercase tracking-wide text-muted-foreground";

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-2xl border px-4 py-2 text-sm font-semibold transition-all active:scale-[0.98]",
            value === o.value
              ? "border-primary bg-primary text-white shadow-md shadow-primary/20"
              : "border-primary/15 bg-white/60 text-foreground hover:bg-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, refresh } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [institution, setInstitution] = useState("");
  const [field, setField] = useState("");
  const [title, setTitle] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [modality, setModality] = useState<LearningModality | "">("");
  const [pace, setPace] = useState<LearningPace | "">("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await resendVerification();
      setResent(true);
    } catch {
      /* keep silent — banner stays so the user can retry */
    } finally {
      setResending(false);
    }
  };

  // Populate from the loaded session.
  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setBio(user.bio ?? "");
    setInstitution(user.institution ?? "");
    setField(user.field ?? "");
    setTitle(user.title ?? "");
    setEducationLevel(user.educationLevel ?? "");
    setModality(user.learningModality ?? "text");
    setPace(user.learningPace ?? "methodical");
  }, [user]);

  if (isLoading || !user) {
    return (
      <AppShell role="student">
        <div className="py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      </AppShell>
    );
  }

  const isTeacher = user.role === "teacher";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        institution: institution.trim(),
        field: field.trim(),
        title: title.trim(),
        educationLevel,
        ...(isTeacher ? {} : { learningModality: modality || undefined, learningPace: pace || undefined }),
      });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePassword) {
      setDeleteError("Enter your password to confirm.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount(deletePassword);
      await logout();
      window.location.href = "/";
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
      setDeleting(false);
    }
  };

  return (
    <AppShell role={isTeacher ? "teacher" : "student"}>
      <div className="max-w-2xl space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground font-display tracking-tight">Settings</h1>
          <p className="text-xs text-muted-foreground">Manage your profile, preferences, and account.</p>
        </div>

        {!user.emailVerified && (
          <div className="flex flex-col gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Verify your email</p>
                <p className="text-xs text-amber-700">
                  Confirm <span className="font-medium">{user.email}</span> to secure your account and enable password
                  recovery.
                </p>
              </div>
            </div>
            {resent ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <Check className="size-4" /> Link sent
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="shrink-0 rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
              >
                {resending ? "Sending…" : "Resend email"}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="liquid-panel space-y-6 rounded-3xl p-6 md:p-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground font-display">Profile</h2>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <label className={labelCls}>First name</label>
              <input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="flex-1 space-y-2">
              <label className={labelCls}>Last name</label>
              <input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Email</label>
            <input className={inputCls} value={user.email} disabled />
            <p className="px-1 text-[11px] text-muted-foreground">Email can't be changed for now.</p>
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Bio</label>
            <textarea
              className={cn(inputCls, "min-h-[80px] resize-none")}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={400}
              placeholder="A sentence about your goals or what you're studying."
            />
          </div>

          <div className="space-y-2">
            <label className={labelCls}>{isTeacher ? "University / institution" : "University / school"}</label>
            <input className={inputCls} value={institution} onChange={(e) => setInstitution(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className={labelCls}>{isTeacher ? "Department / subject area" : "Program / field of study"}</label>
            <input className={inputCls} value={field} onChange={(e) => setField(e.target.value)} />
          </div>

          {isTeacher && (
            <div className="space-y-2">
              <label className={labelCls}>Title / role</label>
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <label className={labelCls}>{isTeacher ? "Teaching level" : "Education level"}</label>
            <Chips options={EDU_LEVELS} value={educationLevel} onChange={setEducationLevel} />
          </div>

          {!isTeacher && (
            <>
              <div className="border-t border-white/40 pt-6 space-y-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground font-display">
                  Learning preferences
                </h2>
                <p className="text-xs text-muted-foreground">These default how the AI tutor teaches you.</p>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Preferred learning style</label>
                <Chips options={MODALITIES} value={modality} onChange={setModality} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Study pace</label>
                <Chips options={PACES} value={pace} onChange={setPace} />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-white transition-all hover:bg-primary/95 active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-primary/20"
          >
            {saving ? (
              <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : saved ? (
              <>
                <Check className="size-4" /> Saved
              </>
            ) : (
              <>
                <Save className="size-4" /> Save changes
              </>
            )}
          </button>
        </form>

        {/* Danger zone */}
        <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-rose-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-700 font-display">Danger zone</h2>
          </div>
          <p className="text-sm text-rose-700/90">
            Deleting your account is permanent. All your courses, enrollments, study history, and data are removed and
            cannot be recovered.
          </p>
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="flex h-11 items-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-bold text-white transition-all hover:bg-rose-700 active:scale-[0.98]"
          >
            <Trash2 className="size-4" /> Delete account
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => !deleting && setShowDelete(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl">
            <button
              onClick={() => !deleting && setShowDelete(false)}
              className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground"
            >
              <X className="size-4" strokeWidth={2.5} />
            </button>
            <div className="mb-2 flex items-center gap-2 text-rose-600">
              <AlertTriangle className="size-5" />
              <h3 className="text-lg font-bold text-foreground font-display">Delete your account?</h3>
            </div>
            <p className="mb-5 text-sm text-muted-foreground">
              This is permanent. Enter your password to confirm.
            </p>

            {deleteError && (
              <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600">
                {deleteError}
              </div>
            )}

            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Current password"
              className={inputCls}
              autoFocus
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => !deleting && setShowDelete(false)}
                className="flex-1 h-11 rounded-2xl border border-primary/15 bg-white/60 text-sm font-bold text-foreground transition hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || !deletePassword}
                className="flex flex-1 h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Trash2 className="size-4" /> Delete forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
