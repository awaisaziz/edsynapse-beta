"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  BookOpenText,
  Check,
  Copy,
  Layers,
  LifeBuoy,
  Plus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/ui/AppShell";
import { ContactAdminModal } from "@/components/ui/ContactAdminModal";
import { CourseCardMenu, COURSE_PALETTE } from "@/components/ui/CourseCardMenu";
import { teacherApi, type Course } from "@/lib/edsynapseApi";

interface CourseCardProps {
  course: Course;
  index: number;
  busy: boolean;
  onRecolor: (color: string) => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

function CourseCard({ course, index, busy, onRecolor, onToggleArchive, onDelete }: CourseCardProps) {
  const [copied, setCopied] = useState(false);
  const color = course.color || COURSE_PALETTE[0];

  const copyCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = course.code;
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        /* clipboard unavailable */
      }
    };
    Promise.resolve(navigator.clipboard?.writeText(text)).catch(fallback);
    if (!navigator.clipboard?.writeText) fallback();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Link
      href={`/teacher/course/${course.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/45 shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:bg-white/60 hover:shadow-xl edsynapse-stagger"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="h-2 w-full" style={{ backgroundColor: color }} />

      <div className="flex flex-1 flex-col justify-between p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div
              className="flex w-10 h-10 items-center justify-center rounded-xl text-white font-bold text-sm shadow-md"
              style={{ backgroundColor: color }}
            >
              {course.name.substring(0, 1)}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 rounded-full border border-primary/10 bg-white/70 px-3 py-1 text-[10px] font-extrabold text-primary transition hover:bg-white"
                title="Copy invite code"
              >
                <span className="font-mono">{course.code}</span>
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
              <CourseCardMenu
                color={color}
                archived={course.archived}
                busy={busy}
                onRecolor={onRecolor}
                onToggleArchive={onToggleArchive}
                onDelete={onDelete}
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {course.subject || "General"}
            </p>
            <h3 className="text-lg font-bold leading-tight font-display text-foreground group-hover:text-primary transition-colors">
              {course.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {course.lessons.length} {course.lessons.length === 1 ? "lesson" : "lessons"}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t border-white/40 pt-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {course.studentCount} students
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {course.lessons.length} lessons
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { courses } = await teacherApi.listCourses();
      setCourses(courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Periodic background polling for teacher courses (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { courses: updatedCourses } = await teacherApi.listCourses();
        setCourses((prev) => {
          const changed = prev.length !== updatedCourses.length ||
            updatedCourses.some((c, i) => !prev[i] || c.archived !== prev[i].archived || c.color !== prev[i].color || c.name !== prev[i].name || c.lessons.length !== prev[i].lessons.length || c.studentCount !== prev[i].studentCount);
          return changed ? updatedCourses : prev;
        });
      } catch (err) {
        console.warn("[TeacherDashboard] Background auto-refresh failed:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const [busyId, setBusyId] = useState<string | null>(null);

  const patchCourse = useCallback(
    async (course: Course, body: { color?: string; archived?: boolean }) => {
      setError("");
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, ...body } : c)));
      try {
        await teacherApi.updateCourse(course.id, body);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update course.");
        load();
      }
    },
    [load],
  );

  const deleteCourse = useCallback(async (course: Course) => {
    setBusyId(course.id);
    setError("");
    try {
      await teacherApi.deleteCourse(course.id);
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete course.");
    } finally {
      setBusyId(null);
    }
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const { course } = await teacherApi.createCourse(newName.trim(), newSubject.trim());
      setShowCreate(false);
      router.push(`/teacher/course/${course.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course.");
      setCreating(false);
    }
  };

  const activeCourses = courses.filter((c) => !c.archived);
  const archivedCourses = courses.filter((c) => c.archived);

  const cardHandlers = (course: Course) => ({
    busy: busyId === course.id,
    onRecolor: (color: string) => patchCourse(course, { color }),
    onToggleArchive: () => patchCourse(course, { archived: !course.archived }),
    onDelete: () => deleteCourse(course),
  });

  return (
    <AppShell role="teacher">
      <ContactAdminModal
        open={showContactAdmin}
        onClose={() => setShowContactAdmin(false)}
      />

      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between border border-white/60 bg-white/45 backdrop-blur-md p-6 rounded-3xl gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">All Courses</h1>
            <p className="text-sm text-muted-foreground">
              Manage course content lesson by lesson and track every cohort.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowContactAdmin(true)}
              className="flex h-11 items-center gap-2 rounded-2xl border border-primary/10 bg-white/70 px-4 text-xs font-bold text-foreground transition-all hover:bg-white active:scale-[0.97]"
            >
              <LifeBuoy className="w-4 h-4 text-primary" />
              <span>Message Admin</span>
            </button>

            <button
              onClick={() => setShowCreate(true)}
              className="flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-xs font-bold text-white transition-all hover:bg-primary/95 active:scale-[0.97] shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Course</span>
            </button>
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
            {activeCourses.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} {...cardHandlers(course)} />
            ))}

            <button
              onClick={() => setShowCreate(true)}
              className="group flex min-h-[260px] flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-primary/15 bg-white/10 p-6 text-center transition-all duration-200 hover:border-primary/45 hover:bg-white/30"
            >
              <div className="mb-3 flex w-12 h-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110 shadow-sm border border-primary/5">
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <h3 className="text-sm font-bold text-foreground font-display">Create New Course</h3>
              <p className="mt-1 text-xs text-muted-foreground">Add lesson content & invite students</p>
            </button>
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
              {archivedCourses.map((course, i) => (
                <CourseCard key={course.id} course={course} index={i} {...cardHandlers(course)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="absolute inset-0" onClick={() => setShowCreate(false)} />

          <div className="liquid-shell relative w-full max-w-md overflow-hidden rounded-[34px] p-3 shadow-2xl edsynapse-stagger">
            <div className="rounded-[26px] border border-white/70 bg-[#fbfbfd]/90 p-6 shadow-inner backdrop-blur-2xl space-y-5">
              <button
                onClick={() => setShowCreate(false)}
                className="absolute right-6 top-6 flex w-8 h-8 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground transition-all"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[10px] font-extrabold tracking-wider uppercase text-primary">
                  <BookOpenText className="w-3.5 h-3.5" />
                  New Course
                </span>
                <h2 className="text-2xl font-bold font-display text-foreground leading-tight pt-1">Create a Course</h2>
                <p className="text-xs text-muted-foreground">
                  Name it and set a subject — you&apos;ll add lesson content and material inside the course.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Course Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. AP Biology, Organic Chemistry"
                    autoFocus
                    className="w-full p-3 rounded-xl border border-primary/15 bg-white focus:border-primary outline-none text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Subject Area</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Science, Mathematics"
                    className="w-full p-3 rounded-xl border border-primary/15 bg-white focus:border-primary outline-none text-xs"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-bold text-white transition-all hover:bg-primary/95 shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-[0.98]"
              >
                {creating ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Create & Open Course</span>
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
