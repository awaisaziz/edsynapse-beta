"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import { ContactAdminModal } from "@/components/ui/ContactAdminModal";
import { CourseCardMenu, COURSE_PALETTE } from "@/components/ui/CourseCardMenu";
import { studentApi, type Course } from "@/lib/edsynapseApi";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  FolderPlus,
  Layers,
  Plus,
  Sparkles,
  X,
  BookMarked,
  LifeBuoy,
  Archive,
} from "lucide-react";

export default function StudentDashboard() {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<"none" | "join">("none");
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);

  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { courses } = await studentApi.listCourses();
      setCourses(courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Optimistically patch one course in local state, fall back to a reload on error.
  const patchCourse = useCallback(
    async (course: Course, body: { color?: string; archived?: boolean }) => {
      setError("");
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, ...body } : c)));
      try {
        await studentApi.updateCourse(course.id, body);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update course.");
        load();
      }
    },
    [load],
  );

  const deleteCourse = useCallback(
    async (course: Course) => {
      setBusyId(course.id);
      setError("");
      try {
        await studentApi.deleteCourse(course.id);
        setCourses((prev) => prev.filter((c) => c.id !== course.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete course.");
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const activeCourses = courses.filter((c) => !c.archived);
  const archivedCourses = courses.filter((c) => c.archived);

  const renderCard = (course: Course) => {
    const color = course.color || COURSE_PALETTE[0];
    const isSelfStudy = course.kind === "self_study";
    return (
      <Link
        key={course.id}
        href={`/student/class/${course.code}`}
        className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-white/70 bg-white/45 p-6 shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:bg-white/60 hover:shadow-xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div
              className="flex w-10 h-10 items-center justify-center rounded-xl text-white font-bold text-sm shadow-md"
              style={{ backgroundColor: color }}
            >
              {course.name.substring(0, 1)}
            </div>
            <div className="flex items-center gap-2">
              {isSelfStudy ? (
                <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  <Sparkles className="w-3 h-3" /> Personal
                </span>
              ) : (
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10">
                  Classroom
                </span>
              )}
              {/* Students recolor/delete only their own self-study spaces; they may
                  archive any course (per-enrollment for classes). */}
              <CourseCardMenu
                color={color}
                archived={course.archived}
                canRecolor={isSelfStudy}
                canDelete={isSelfStudy}
                busy={busyId === course.id}
                onRecolor={(c) => patchCourse(course, { color: c })}
                onToggleArchive={() => patchCourse(course, { archived: !course.archived })}
                onDelete={() => deleteCourse(course)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold leading-tight font-display text-foreground group-hover:text-primary transition-colors">
              {course.name}
            </h3>
            <p className="text-xs text-muted-foreground font-sans">
              {isSelfStudy ? "Self-study space" : course.subject || "Classroom"}
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/30 pt-4">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-sans">
            <Layers className="w-3.5 h-3.5" />
            <span className="truncate">
              {course.lessons.length} {course.lessons.length === 1 ? "lesson" : "lessons"}
            </span>
          </span>
          <span className="font-mono text-[10px] font-bold text-primary">{course.code}</span>
        </div>
      </Link>
    );
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter a class code.");
      return;
    }
    setError("");
    setJoining(true);
    try {
      const { course } = await studentApi.joinClass(trimmed);
      router.push(`/student/class/${course.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join class.");
      setJoining(false);
    }
  };

  return (
    <AppShell role="student">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/50 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">My Learning Space</h1>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/student/knowledge-map"
              className="flex h-9 items-center gap-1.5 rounded-xl border border-primary/15 bg-white/70 px-3 text-xs font-bold text-primary transition-all hover:bg-white active:scale-[0.97]"
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>Knowledge Map</span>
            </Link>

            <button
              onClick={() => setActiveModal("join")}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-primary/10 bg-white/70 px-3 text-xs font-bold text-foreground transition-all hover:bg-white active:scale-[0.97]"
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>Join Class</span>
            </button>

            <button
              onClick={() => setShowContactAdmin(true)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-primary/10 bg-white/70 px-3 text-xs font-bold text-foreground transition-all hover:bg-white active:scale-[0.97]"
            >
              <LifeBuoy className="w-3.5 h-3.5 text-primary" />
              <span>Message Admin</span>
            </button>

            <Link
              href="/student/self-study/new"
              className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-white transition-all hover:bg-primary/95 active:scale-[0.97] shadow-sm shadow-primary/20"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Create Self-Study Space</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[220px] animate-pulse rounded-[28px] border border-white/60 bg-white/40" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeCourses.map(renderCard)}

            <Link
              href="/student/self-study/new"
              className="group flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-primary/15 bg-white/10 p-6 text-center transition-all duration-200 hover:border-primary/45 hover:bg-white/30 min-h-[220px]"
            >
              <div className="mb-3 flex w-12 h-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110 shadow-sm border border-primary/5">
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <h3 className="text-sm font-bold text-foreground font-display">Build Self-Study Space</h3>
              <p className="mt-1 text-xs text-muted-foreground font-sans">Analyze your files & start learning</p>
            </Link>
          </div>
        )}

        {!loading && archivedCourses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/30 pb-2">
              <Archive className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-display">
                Archived
              </h2>
              <span className="text-xs text-muted-foreground">({archivedCourses.length})</span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 opacity-75">
              {archivedCourses.map(renderCard)}
            </div>
          </div>
        )}

        {!loading && courses.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            You haven&apos;t joined any classes yet. Enter a class code or create a self-study space to begin.
          </p>
        )}
      </div>

      <ContactAdminModal
        open={showContactAdmin}
        onClose={() => setShowContactAdmin(false)}
      />

      {/* ── JOIN CLASS MODAL ────────────────────────────────────────────── */}
      {activeModal === "join" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm transition-opacity animate-in fade-in">
          <div className="absolute inset-0" onClick={() => setActiveModal("none")} />

          <div className="liquid-shell relative w-full max-w-md overflow-hidden rounded-[34px] p-3 shadow-2xl edsynapse-stagger">
            <div className="rounded-[26px] border border-white/70 bg-[#fbfbfd]/90 p-6 shadow-inner backdrop-blur-2xl">
              <button
                onClick={() => setActiveModal("none")}
                className="absolute right-6 top-6 flex w-8 h-8 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground transition-all"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>

              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[10px] font-extrabold tracking-wider uppercase text-primary font-sans">
                <BookOpen className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>Join Classroom</span>
              </div>
              <h2 className="mb-1 text-2xl font-bold font-display text-foreground leading-tight">Enter Class Code</h2>
              <p className="mb-6 text-xs text-muted-foreground">Ask your teacher for the course invite code.</p>

              <form onSubmit={handleJoin} className="space-y-4">
                <div
                  className={cn(
                    "rounded-2xl border bg-white/80 transition-all focus-within:ring-4 focus-within:bg-white",
                    error
                      ? "border-rose-300 focus-within:ring-rose-200/40"
                      : "border-primary/15 focus-within:border-primary focus-within:ring-primary/10",
                  )}
                >
                  <input
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setError("");
                    }}
                    placeholder="e.g. SYN-4829"
                    className="h-14 w-full bg-transparent px-4 font-mono text-xl tracking-widest text-[#1d1d1f] outline-none placeholder:text-muted-foreground placeholder:font-sans placeholder:tracking-normal placeholder:text-sm"
                    autoFocus
                    autoCapitalize="characters"
                  />
                </div>
                {error && <p className="text-xs text-rose-500 px-1 font-semibold">{error}</p>}
                <button
                  type="submit"
                  disabled={joining || !code.trim()}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white transition-all hover:bg-primary/95 active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-primary/25"
                >
                  {joining ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    "Join Class"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
