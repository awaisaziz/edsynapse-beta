"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, completeOnboarding, type LearningModality, type LearningPace } from "@/lib/useAuth";

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
const PACES: { value: LearningPace; label: string; hint: string }[] = [
  { value: "regular", label: "Regular", hint: "Standard pace" },
  { value: "methodical", label: "Methodical", hint: "Step by step" },
  { value: "deep", label: "Deep", hint: "Thorough & detailed" },
];

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; hint?: string }[];
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
            "rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
            value === o.value
              ? "border-primary bg-primary text-white shadow-md shadow-primary/20"
              : "border-primary/15 bg-white/60 text-foreground hover:bg-white",
          )}
        >
          {o.label}
          {o.hint && <span className={cn("ml-1.5 text-xs font-normal", value === o.value ? "text-white/80" : "text-muted-foreground")}>· {o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-primary/15 bg-white/60 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground";
const labelCls = "text-xs font-bold uppercase tracking-wide text-muted-foreground";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [educationLevel, setEducationLevel] = useState("");
  const [modality, setModality] = useState<LearningModality | "">("");
  const [pace, setPace] = useState<LearningPace | "">("");
  const [field, setField] = useState("");
  const [institution, setInstitution] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Redirect out if not signed in or already onboarded.
  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/sign-in");
    else if (user.onboarded) router.replace(user.role === "teacher" ? "/teacher/dashboard" : "/student");
  }, [user, isLoading, router]);

  const isTeacher = user?.role === "teacher";

  const canSubmit = isTeacher
    ? institution.trim() !== "" && field.trim() !== "" && title.trim() !== ""
    : educationLevel !== "" && modality !== "" && pace !== "" && field.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;
    setSaving(true);
    setError("");
    try {
      await completeOnboarding({
        educationLevel,
        field: field.trim(),
        institution: institution.trim(),
        title: title.trim(),
        bio: bio.trim(),
        ...(isTeacher ? {} : { learningModality: modality as LearningModality, learningPace: pace as LearningPace }),
      });
      // Hard navigation so the SWR session cache reloads with onboarded=true.
      window.location.href = isTeacher ? "/teacher/dashboard" : "/student";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
      setSaving(false);
    }
  };

  if (isLoading || !user || user.onboarded) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f0f6ff]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f0f6ff] text-[#1d1d1f]">
      <div className="pointer-events-none absolute inset-0 liquid-canvas" />
      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center px-4 py-16">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            {isTeacher ? <GraduationCap className="size-4" /> : <User className="size-4" />}
            {isTeacher ? "Teacher setup" : "Student setup"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
            Welcome, {user.firstName || user.name}.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tell us a little about you so EdSynapse can tailor the experience. You can change this later in Settings.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="liquid-panel space-y-6 rounded-3xl p-6 md:p-8">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {error}
            </div>
          )}

          {isTeacher ? (
            <>
              <div className="space-y-2">
                <label className={labelCls}>University / institution *</label>
                <input className={inputCls} value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. Stanford University" />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Department / subject area *</label>
                <input className={inputCls} value={field} onChange={(e) => setField(e.target.value)} placeholder="e.g. Biology, Computer Science" />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Title / role *</label>
                <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Professor, Instructor, TA" />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Teaching level (optional)</label>
                <Chips options={EDU_LEVELS} value={educationLevel} onChange={setEducationLevel} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className={labelCls}>Education level *</label>
                <Chips options={EDU_LEVELS} value={educationLevel} onChange={setEducationLevel} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Program / field of study *</label>
                <input className={inputCls} value={field} onChange={(e) => setField(e.target.value)} placeholder="e.g. Computer Science, Pre-med" />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Preferred learning style *</label>
                <Chips options={MODALITIES} value={modality} onChange={setModality} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Study pace *</label>
                <Chips options={PACES} value={pace} onChange={setPace} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>University / school (optional)</label>
                <input className={inputCls} value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. MIT" />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className={labelCls}>Short bio (optional)</label>
            <textarea
              className={cn(inputCls, "min-h-[80px] resize-none")}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A sentence about your goals or what you're studying."
              maxLength={400}
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white transition-all hover:bg-primary/95 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/25"
          >
            {saving ? (
              <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>Finish setup</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
