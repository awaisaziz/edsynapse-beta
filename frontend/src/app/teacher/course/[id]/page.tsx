"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownUp,
  ArrowLeft,
  BarChart2,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Copy,
  FileText,
  Layers,
  LayoutDashboard,
  ListChecks,
  Loader2,
  MessagesSquare,
  AlertCircle,
  Plus,
  Search,
  Share2,
  TrendingUp,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  teacherApi,
  type Course,
  type CourseLesson,
  type CourseAnalytics,
  type StudentRecord,
  type AttemptDetail,
} from "@/lib/edsynapseApi";
import { FileUploadZone } from "@/components/ui/FileUploadZone";
import { DiscussionBoard } from "@/components/ui/DiscussionBoard";
import Markdown from "@/components/ui/Markdown";


const LEVEL_TONE: Record<string, string> = {
  strong: "#10b981",
  moderate: "#f59e0b",
  needs_improvement: "#ef4444",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

function initialsOf(name: string): string {
  return (
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "S"
  );
}

// ── Lesson content card ──────────────────────────────────────────────────────
function LessonCard({
  lesson,
  color,
  index,
  busy,
  onPatch,
  onDelete,
  onUpload,
  onDeleteMaterial,
}: {
  lesson: CourseLesson;
  color: string;
  index: number;
  busy: boolean;
  onPatch: (patch: { title?: string; outline?: string[]; published?: boolean }) => void;
  onDelete: () => void;
  onUpload: (files: File[]) => Promise<void>;
  onDeleteMaterial: (sourceId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [outlineInput, setOutlineInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => setTitle(lesson.title), [lesson.title]);

  const addOutlineItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outlineInput.trim()) return;
    onPatch({ outline: [...lesson.outline, outlineInput.trim()] });
    setOutlineInput("");
  };

  const removeOutlineItem = (i: number) =>
    onPatch({ outline: lesson.outline.filter((_, j) => j !== i) });

  const handleFilesSelected = async (newFiles: File[]) => {
    setUploadError(null);
    setFiles(newFiles);
    setUploading(true);
    try {
      await onUpload(newFiles);
      setFiles([]);
    } catch (err) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : "Failed to ingest source material.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="overflow-hidden rounded-[24px] border border-white/70 bg-white/45 shadow backdrop-blur-xl edsynapse-stagger"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/40"
      >
        <div
          className="flex w-11 h-11 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-md"
          style={{ backgroundColor: color }}
        >
          <span className="text-[8px] font-extrabold uppercase leading-none opacity-80">Lesson</span>
          <span className="text-base font-black leading-tight">{lesson.lesson}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-foreground font-display">{lesson.title}</p>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
                lesson.published
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              )}
            >
              {lesson.published ? "Published" : "Draft"}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {lesson.outline.length} topics · {lesson.materials.length} files
          </p>
        </div>

        <div className="text-muted-foreground">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-white/40 px-5 pb-5 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== lesson.title && onPatch({ title: title.trim() })}
              placeholder="Lesson title..."
              className="min-w-0 flex-1 rounded-xl border border-primary/15 bg-white/70 p-2.5 text-xs font-bold outline-none focus:border-primary focus:bg-white"
            />
            <button
              onClick={() => onPatch({ published: !lesson.published })}
              title={
                lesson.published
                  ? "Unpublish this week and hide all its materials from students"
                  : "Publish this week and all its materials to students"
              }
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[11px] font-bold transition-all active:scale-[0.97]",
                lesson.published
                  ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow shadow-emerald-600/20"
              )}
            >
              {lesson.published ? "Unpublish week" : "Publish week & materials"}
            </button>
            <button
              onClick={onDelete}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100 active:scale-[0.95]"
              title="Delete lesson"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Outline / topics editor */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <ListChecks className="w-3.5 h-3.5" />
                Lesson Topics
              </label>
              <div className="space-y-1.5">
                {lesson.outline.map((item, i) => (
                  <div key={i} className="group flex items-center gap-2 rounded-xl border border-primary/10 bg-white/60 px-3 py-2">
                    <span className="w-1.5 h-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="flex-1 text-xs text-foreground">{item}</span>
                    <button onClick={() => removeOutlineItem(i)} className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-rose-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {lesson.outline.length === 0 && <p className="px-1 text-[11px] text-muted-foreground">No topics yet — add them or upload material to extract them.</p>}
              </div>
              <form onSubmit={addOutlineItem} className="flex gap-2">
                <input
                  value={outlineInput}
                  onChange={(e) => setOutlineInput(e.target.value)}
                  placeholder="Add a topic..."
                  className="flex-1 rounded-xl border border-primary/10 bg-white p-2.5 text-xs outline-none focus:border-primary"
                />
                <button type="submit" disabled={!outlineInput.trim()} className="rounded-xl bg-primary px-3.5 text-xs font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50">
                  Add
                </button>
              </form>
            </div>

            {/* Materials */}
            <div className="space-y-2">
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  Lesson Material
                </label>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Upload PDF/DOCX/notes — text is chunked, embedded for grounding, and topics are extracted into this lesson.
                </p>
              </div>
              {lesson.materials.length > 0 && (
                <div className="space-y-1.5">
                  {lesson.materials.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
                        m.published ? "border-primary/10 bg-white/60" : "border-amber-200 bg-amber-500/5",
                      )}
                    >
                      <FileText className={cn("w-3.5 h-3.5 shrink-0", m.published ? "text-primary" : "text-amber-600")} />
                      <span className={cn("flex-1 truncate text-xs", m.published ? "text-foreground" : "text-foreground/70")}>
                        {m.name}
                      </span>
                      <span className="rounded bg-primary/5 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-primary">{m.type}</span>
                      {/* Materials follow the lesson's publish state — there is no
                          separate per-file control. */}
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase",
                          m.published ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700",
                        )}
                      >
                        {m.published ? "Visible" : "Hidden"}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to remove "${m.name}"?`)) {
                            onDeleteMaterial(m.id);
                          }
                        }}
                        className="p-1 rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-all duration-150 active:scale-95 shrink-0"
                        title="Delete material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {uploading ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.03] p-6 text-xs font-bold text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingesting & embedding…
                </div>
              ) : (
                <>
                  <FileUploadZone onFilesSelected={handleFilesSelected} selectedFiles={files} onRemoveFile={() => setFiles([])} />
                  {uploadError && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/10 text-rose-600 text-xs border border-rose-500/15 mt-2">
                      <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Course workspace page ────────────────────────────────────────────────────
export default function TeacherCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busyLesson, setBusyLesson] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);

  const [activeTab, setActiveTab] = useState<"content" | "students" | "discussion">("content");
  const [codeCopied, setCodeCopied] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [studentView, setStudentView] = useState<"dashboard" | "roster">("dashboard");
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [removeStudentId, setRemoveStudentId] = useState<string | null>(null);
  const [removeStudentBusy, setRemoveStudentBusy] = useState(false);
  const [removeStudentError, setRemoveStudentError] = useState("");
  // Cohort Syllabus Gaps order: weakest topics first by default; toggle to flip.
  const [gapsWeakFirst, setGapsWeakFirst] = useState(true);
  // Read-only per-student record (attempt history + per-topic mastery) and the
  // currently open attempt report.
  const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [reviewAttempt, setReviewAttempt] = useState<AttemptDetail | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Load course
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { course } = await teacherApi.getCourse(id);
        if (cancelled) return;
        setCourse(course);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Load analytics when the Students tab is first opened
  useEffect(() => {
    if (activeTab !== "students" || analytics) return;
    teacherApi.getAnalytics(id).then(setAnalytics).catch(() => setAnalytics({ course_id: id, students: [], topics: [] }));
  }, [activeTab, analytics, id]);

  // Load the selected student's read-only record (attempts + per-topic mastery).
  useEffect(() => {
    if (!selectedStudentId) {
      setStudentRecord(null);
      return;
    }
    let cancelled = false;
    setRecordLoading(true);
    setStudentRecord(null);
    teacherApi
      .getStudentRecord(id, selectedStudentId)
      .then((rec) => { if (!cancelled) setStudentRecord(rec); })
      .catch(() => { if (!cancelled) setStudentRecord(null); })
      .finally(() => { if (!cancelled) setRecordLoading(false); });
    return () => { cancelled = true; };
  }, [selectedStudentId, id]);

  // Open one of the student's attempts as a read-only report.
  const openAttempt = useCallback(
    async (attemptId: string) => {
      if (!selectedStudentId) return;
      setReviewLoading(true);
      setReviewAttempt(null);
      try {
        const detail = await teacherApi.getStudentAttempt(id, selectedStudentId, attemptId);
        setReviewAttempt(detail);
      } catch {
        setReviewAttempt(null);
      } finally {
        setReviewLoading(false);
      }
    },
    [id, selectedStudentId],
  );

  const patchLesson = useCallback(
    async (lessonId: string, patch: { title?: string; outline?: string[]; published?: boolean }) => {
      setBusyLesson(lessonId);
      try {
        const { course } = await teacherApi.updateLesson(id, lessonId, patch);
        setCourse(course);
      } finally {
        setBusyLesson(null);
      }
    },
    [id],
  );

  const addLesson = async () => {
    const n = (course?.lessons.length ?? 0) + 1;
    const { course: updated } = await teacherApi.addLesson(id, `Lesson ${n}`);
    setCourse(updated);
  };

  const deleteLesson = async (lessonId: string) => {
    setBusyLesson(lessonId);
    try {
      const { course } = await teacherApi.deleteLesson(id, lessonId);
      setCourse(course);
    } finally {
      setBusyLesson(null);
    }
  };


  const uploadMaterial = async (lessonId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("lessonId", lessonId);
    form.append("extractTopics", "true");
    const { topics } = await teacherApi.addSource(id, form);
    // Refresh course to pick up the new materials.
    const { course: refreshed } = await teacherApi.getCourse(id);
    // Merge any extracted topics into the lesson outline.
    const lesson = refreshed.lessons.find((l) => l.id === lessonId);
    const newTopics = (topics ?? []).filter((t) => lesson && !lesson.outline.includes(t));
    if (lesson && newTopics.length > 0) {
      const { course } = await teacherApi.updateLesson(id, lessonId, { outline: [...lesson.outline, ...newTopics] });
      setCourse(course);
    } else {
      setCourse(refreshed);
    }
  };

  const deleteMaterial = async (lessonId: string, sourceId: string) => {
    setBusyLesson(lessonId);
    try {
      await teacherApi.deleteSource(id, sourceId);
      const { course } = await teacherApi.getCourse(id);
      setCourse(course);
    } catch (e) {
      console.error("[v0] delete material error:", e);
      throw e;
    } finally {
      setBusyLesson(null);
    }
  };


  const copyText = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
      throw new Error("clipboard unavailable");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      } catch { /* unavailable */ }
    }
  };

  const copyCode = async () => {
    if (!course) return;
    await copyText(course.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1800);
  };

  const shareInvite = async () => {
    if (!course) return;
    await copyText(`Join my EdSynapse course "${course.name}" with code: ${course.code}`);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  };

  const removeStudent = async (studentId: string) => {
    setRemoveStudentBusy(true);
    setRemoveStudentError("");
    try {
      await teacherApi.removeStudent(id, studentId);
      // Remove from local analytics state so the UI updates instantly.
      setAnalytics((prev) =>
        prev ? { ...prev, students: prev.students.filter((s) => s.id !== studentId) } : prev
      );
      // If we were viewing this student's record, clear selection.
      if (selectedStudentId === studentId) setSelectedStudentId(null);
      setRemoveStudentId(null);
    } catch (e) {
      setRemoveStudentError(e instanceof Error ? e.message : "Failed to remove student.");
    } finally {
      setRemoveStudentBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f0f6ff]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f0f6ff]">
        <div className="text-center space-y-3">
          <p className="text-sm font-bold text-foreground">Course not found</p>
          <Link href="/teacher/dashboard" className="text-xs font-bold text-primary hover:underline">← Back to My Courses</Link>
        </div>
      </div>
    );
  }

  // ── Students-tab derived data (real analytics) ──
  const students = analytics?.students ?? [];
  // Enrolled students not already a TA — the candidates the owner can promote.
  const avgScore = (() => {
    const scored = students.filter((s) => s.avgScore != null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((n, s) => n + (s.avgScore ?? 0), 0) / scored.length);
  })();
  const activeToday = students.filter((s) => s.lastActive && Date.now() - new Date(s.lastActive).getTime() < 86_400_000).length;

  // Cohort topic mastery (aggregate by topic across knowledge_states)
  const topicMap = new Map<string, { strong: number; moderate: number; needs_improvement: number }>();
  for (const t of analytics?.topics ?? []) {
    const e = topicMap.get(t.topic) ?? { strong: 0, moderate: 0, needs_improvement: 0 };
    if (t.level in e) (e as Record<string, number>)[t.level] += Number(t.n);
    topicMap.set(t.topic, e);
  }
  // Rank topics by a gap score (more needs-improvement/moderate share = bigger
  // gap). Default order is weakest-first; the toggle flips to strongest-first.
  const cohortTopics = [...topicMap.entries()]
    .map(([topic, c]) => {
      const total = c.strong + c.moderate + c.needs_improvement;
      const gapScore = total ? (c.needs_improvement + c.moderate * 0.5) / total : 0;
      return { topic, ...c, total, gapScore };
    })
    .sort((a, b) => (gapsWeakFirst ? b.gapScore - a.gapScore : a.gapScore - b.gapScore));

  const leaderboard = [...students].sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1));
  const filteredStudents = students.filter((s) => {
    const q = studentQuery.trim().toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });
  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f0f6ff] text-[#1d1d1f] font-sans pb-12">
      <div className="pointer-events-none absolute inset-0 liquid-canvas" />

      {/* ── Header ── */}
      <header className="relative z-30 border-b border-white/45 bg-white/40 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/teacher/dashboard" className="flex items-center gap-1.5 rounded-full border border-primary/10 bg-white/60 px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground hover:bg-white">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">All Courses</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex w-8 h-8 items-center justify-center rounded-xl text-white font-bold text-sm shadow" style={{ backgroundColor: course.color }}>
                {course.name.substring(0, 1)}
              </div>
              <div>
                <p className="text-sm font-bold leading-tight text-foreground font-display">{course.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{course.subject || "General"}</p>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-white/60 p-1 rounded-2xl border border-white/60">
            {([
              { id: "content", label: "Lesson Content", icon: Layers },
              { id: "students", label: "Students", icon: Users },
              { id: "discussion", label: "Discussion", icon: MessagesSquare },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-bold transition-all duration-150 active:scale-[0.98]",
                  activeTab === tab.id ? "bg-primary text-white shadow-md shadow-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Jump to this course's pulse (cohort topic-mastery overview). */}
          <Link
            href={`/teacher/course-pulse?course=${id}`}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-primary/15 bg-white/60 px-3 text-xs font-bold text-primary transition hover:bg-white active:scale-[0.97]"
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Course Pulse</span>
          </Link>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="relative z-10 mx-auto max-w-[1100px] px-6 py-8 space-y-6">
        {activeTab === "content" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="grid grid-cols-2 divide-x divide-white/60 overflow-hidden rounded-2xl border border-white/70 bg-white/45 text-center shadow shadow-black/5 backdrop-blur-xl">
                <div className="px-5 py-3">
                  <div className="text-base font-black text-foreground">{course.lessons.filter((l) => l.published).length}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Published</div>
                </div>
                <div className="px-5 py-3">
                  <div className="text-base font-black text-foreground">{course.lessons.length}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Lessons</div>
                </div>
              </div>

              <button onClick={addLesson} className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-white transition-all hover:bg-primary/95 shadow shadow-primary/20 active:scale-[0.97]">
                <Plus className="w-4 h-4" />
                <span>Add Lesson</span>
              </button>
            </div>

            <div className="space-y-4">
              {course.lessons.map((lesson, i) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  color={course.color}
                  index={i}
                  busy={busyLesson === lesson.id}
                  onPatch={(patch) => patchLesson(lesson.id, patch)}
                  onDelete={() => deleteLesson(lesson.id)}
                  onUpload={(files) => uploadMaterial(lesson.id, files)}
                  onDeleteMaterial={(sourceId) => deleteMaterial(lesson.id, sourceId)}
                />
              ))}

              {course.lessons.length === 0 && (
                <button onClick={addLesson} className="group flex w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-primary/15 bg-white/10 p-12 text-center transition-all hover:border-primary/45 hover:bg-white/30">
                  <div className="mb-3 flex w-12 h-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110 border border-primary/5">
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground font-display">Add Lesson 1</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Build your course lesson by lesson — outline the content and upload material.</p>
                </button>
              )}
            </div>

          </>
        )}

        {/* ── STUDENTS TAB ── */}
        {activeTab === "students" && (
          <div className="space-y-6">
            {/* Invite students with the join code. */}
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              {/* Invite Students — share the join code */}
              <div className="rounded-[24px] border border-white/70 bg-white/45 p-5 shadow-lg backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-foreground font-display">
                    <Users className="w-4 h-4 text-primary" />
                    Students
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-black text-primary">{course.studentCount}</span>
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this join code with students so they can enrol in <strong className="text-foreground">{course.name}</strong>.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={copyCode} title="Copy join code" className="flex items-center gap-2 rounded-xl border border-primary/15 bg-white/70 px-3.5 py-2 text-xs font-bold text-foreground transition hover:bg-white active:scale-[0.97]">
                    <span className="font-mono text-primary font-extrabold tracking-wide">{course.code}</span>
                    {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button type="button" onClick={shareInvite} className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-white transition-all hover:bg-primary/95 shadow shadow-primary/20 active:scale-[0.97]">
                    <Share2 className="w-4 h-4" />
                    <span>Invite Students</span>
                  </button>
                </div>
              </div>

            </div>

            <div className="flex w-fit items-center gap-1 rounded-2xl border border-white/60 bg-white/55 p-1">
              {([
                { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                { id: "roster", label: "Students", icon: Users },
              ] as const).map((v) => (
                <button key={v.id} onClick={() => setStudentView(v.id)} className={cn("flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-bold transition-all active:scale-[0.98]", studentView === v.id ? "bg-primary text-white shadow-md shadow-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-white/50")}>
                  <v.icon className="w-4 h-4" />
                  <span>{v.label}</span>
                </button>
              ))}
            </div>

            {!analytics ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading cohort…
              </div>
            ) : students.length === 0 ? (
              <div className="rounded-3xl border border-white/70 bg-white/45 p-12 text-center backdrop-blur-xl">
                <Users className="mx-auto mb-3 size-8 text-primary/60" />
                <p className="text-sm font-bold text-foreground font-display">No students enrolled yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Share the code <span className="font-mono font-bold text-primary">{course.code}</span> for students to join.</p>
              </div>
            ) : studentView === "dashboard" ? (
              <div className="space-y-6 edsynapse-stagger">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "Enrolled", value: `${students.length}`, icon: Users },
                    { label: "Avg Quiz Score", value: avgScore != null ? `${avgScore}%` : "—", icon: TrendingUp },
                    { label: "Active Today", value: `${activeToday} / ${students.length}`, icon: BarChart2 },
                    { label: "Total Attempts", value: `${students.reduce((n, s) => n + s.attempts, 0)}`, icon: Trophy },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/70 bg-white/45 p-4 shadow-sm backdrop-blur-xl">
                      <stat.icon className="mb-2 size-4 text-primary" />
                      <p className="text-xl font-black text-foreground">{stat.value}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="liquid-panel rounded-3xl p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-sm font-extrabold uppercase tracking-wide text-foreground font-display">Cohort Syllabus Gaps</h3>
                        <p className="text-[11px] text-muted-foreground">Aggregate concept mastery across diagnostics & assessments.</p>
                      </div>
                      <button
                        onClick={() => setGapsWeakFirst((v) => !v)}
                        title={gapsWeakFirst ? "Showing weakest first — click for strongest first" : "Showing strongest first — click for weakest first"}
                        className="flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-primary/15 bg-white/60 px-2.5 text-[10px] font-bold text-primary transition hover:bg-white active:scale-[0.97]"
                      >
                        <ArrowDownUp className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{gapsWeakFirst ? "Weakest first" : "Strongest first"}</span>
                      </button>
                    </div>
                    {cohortTopics.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No diagnostic data yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {cohortTopics.map((t) => (
                          <div key={t.topic} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-foreground truncate pr-2">{t.topic}</span>
                              <span className="text-muted-foreground">{t.total} student{t.total === 1 ? "" : "s"}</span>
                            </div>
                            <div className="flex h-2 overflow-hidden rounded-full bg-black/5">
                              {(["strong", "moderate", "needs_improvement"] as const).map((lvl) =>
                                t[lvl] > 0 ? <div key={lvl} style={{ width: `${(t[lvl] / t.total) * 100}%`, backgroundColor: LEVEL_TONE[lvl] }} /> : null
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="liquid-panel rounded-3xl p-6 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold uppercase tracking-wide text-foreground font-display">Class Leaderboard</h3>
                      <p className="text-[11px] text-muted-foreground">Ranked by average score — tap a name for their report.</p>
                    </div>
                    <div className="space-y-2">
                      {leaderboard.map((s, i) => (
                        <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setStudentView("roster"); }} className="flex w-full items-center gap-3 rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left transition hover:bg-white active:scale-[0.99]">
                          <span className="w-5 shrink-0 text-center text-[12px] font-black text-muted-foreground">{i + 1}</span>
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: course.color }}>{initialsOf(s.name)}</div>
                          <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-foreground">{s.name}</span>
                          <span className="shrink-0 text-[12px] font-black text-foreground">{s.avgScore != null ? `${s.avgScore}%` : "—"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
                <div className="min-w-0 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Enrolled students
                    </p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-black text-primary">
                      {studentQuery ? `${filteredStudents.length} / ${students.length}` : students.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-white/70 px-3.5 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                    <Search className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <input value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Search by name or email..." className="flex-1 bg-transparent text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground" />
                    {studentQuery && <button onClick={() => setStudentQuery("")} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                  <div className="space-y-2">
                    {filteredStudents.map((s) => (
                      <div key={s.id} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all", selectedStudentId === s.id ? "border-primary/30 bg-primary/5 shadow-sm" : "border-white/70 bg-white/45 hover:border-primary/15 hover:bg-white/70")}>
                        <button className="flex flex-1 items-center gap-3 text-left active:scale-[0.99]" onClick={() => setSelectedStudentId(s.id)}>
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold text-white" style={{ backgroundColor: course.color }}>{initialsOf(s.name)}</div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-[#1d1d1f]">{s.name}</p>
                            <p className="truncate text-[11px] text-[#86868b]">{s.email}</p>
                          </div>
                          <span className="shrink-0 text-[12px] font-black text-foreground">{s.avgScore != null ? `${s.avgScore}%` : "—"}</span>
                          <ChevronRight className={cn("size-4 shrink-0", selectedStudentId === s.id ? "text-primary" : "text-[#c7c7cc]")} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRemoveStudentError(""); setRemoveStudentId(s.id); }}
                          title="Remove student from course"
                          className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition-all hover:bg-rose-100 active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {filteredStudents.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted-foreground">No students match “{studentQuery}”.</p>}
                  </div>
                </div>

                <div className="liquid-panel min-w-0 rounded-3xl p-6 min-h-[300px]">
                  {selectedStudent ? (
                    <div className="space-y-5 edsynapse-stagger">
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white shadow" style={{ backgroundColor: course.color }}>{initialsOf(selectedStudent.name)}</div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-lg font-black text-foreground font-display leading-tight">{selectedStudent.name}</h3>
                          <p className="truncate text-[11px] text-muted-foreground">{selectedStudent.email} · Active {relativeTime(selectedStudent.lastActive)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { icon: TrendingUp, value: selectedStudent.avgScore != null ? `${selectedStudent.avgScore}%` : "—", label: "avg score" },
                          { icon: Trophy, value: `${selectedStudent.attempts}`, label: "attempts" },
                          { icon: BarChart2, value: relativeTime(selectedStudent.lastActive), label: "last active" },
                        ].map((s) => (
                          <div key={s.label} className="rounded-2xl border border-black/8 bg-white/50 p-3 text-center">
                            <s.icon className="mx-auto mb-1 size-4 text-[#6e6e73]" strokeWidth={1.8} />
                            <p className="text-[13px] font-semibold">{s.value}</p>
                            <p className="text-[10px] text-[#86868b]">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      {recordLoading ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading record…
                        </div>
                      ) : (
                        <>
                          {/* Per-topic mastery — strong vs. needs work */}
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
                                <span className="size-2 rounded-full" style={{ backgroundColor: LEVEL_TONE.strong }} /> Strong topics
                              </p>
                              {studentRecord && studentRecord.strong.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {studentRecord.strong.map((t) => (
                                    <span key={t} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">{t}</span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-muted-foreground">None yet.</p>
                              )}
                            </div>
                            {studentRecord && studentRecord.moderate.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
                                  <span className="size-2 rounded-full" style={{ backgroundColor: LEVEL_TONE.moderate }} /> Developing
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {studentRecord.moderate.map((t) => (
                                    <span key={t} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">{t}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="space-y-1.5">
                              <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-rose-700">
                                <span className="size-2 rounded-full" style={{ backgroundColor: LEVEL_TONE.needs_improvement }} /> Needs work
                              </p>
                              {studentRecord && studentRecord.weak.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {studentRecord.weak.map((t) => (
                                    <span key={t} className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">{t}</span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-muted-foreground">None yet.</p>
                              )}
                            </div>
                          </div>

                          {/* Quiz / assessment history — click to view the full report */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Quizzes & assessments</p>
                            {studentRecord && studentRecord.attempts.length > 0 ? (
                              <div className="space-y-1.5">
                                {studentRecord.attempts.map((a) => {
                                  const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
                                  return (
                                    <button
                                      key={a.id}
                                      onClick={() => openAttempt(a.id)}
                                      className="flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-white/55 px-3.5 py-2.5 text-left transition hover:border-primary/25 hover:bg-white active:scale-[0.99]"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-bold text-foreground">
                                          {(() => {
                                            const topics = a.topic ? a.topic.split(",").map(t => t.trim()).filter(Boolean) : [];
                                            return topics.length > 1 ? `${topics[0]} +${topics.length - 1} more` : a.topic || "Untitled";
                                          })()}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground capitalize">{a.kind} · {relativeTime(a.created_at)}</p>
                                      </div>
                                      <span className="shrink-0 text-[12px] font-black" style={{ color: pct >= 75 ? LEVEL_TONE.strong : pct >= 45 ? LEVEL_TONE.moderate : LEVEL_TONE.needs_improvement }}>
                                        {a.score}/{a.total}
                                      </span>
                                      <ChevronRight className="size-4 shrink-0 text-[#c7c7cc]" />
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">No quizzes taken yet.</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Users className="w-5 h-5" /></div>
                      <p className="text-sm font-bold text-foreground font-display">Select a student</p>
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">Pick a student to see their progress and assessment history.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "discussion" && (
          <div className="h-[calc(100vh-220px)] min-h-[550px] w-full flex flex-col">
            <DiscussionBoard courseId={id} />
          </div>
        )}
      </main>

      {shareToast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4" />
          <span>Invite copied to clipboard!</span>
        </div>
      )}

      {/* ── READ-ONLY ATTEMPT REPORT MODAL ── */}
      {(reviewLoading || reviewAttempt) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="absolute inset-0" onClick={() => { setReviewAttempt(null); setReviewLoading(false); }} />
          <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[#fbfbfd] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-black/5 px-6 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Read-only report</p>
                {reviewAttempt?.topic ? (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-20 overflow-y-auto pr-1 scrollbar-hide">
                    {reviewAttempt.topic.split(",").map((t) => t.trim()).filter(Boolean).map((t, idx) => (
                      <span key={idx} className="inline-flex items-center rounded-lg bg-primary/10 border border-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <h2 className="text-lg font-bold font-display text-foreground">Loading…</h2>
                )}
                {reviewAttempt && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Score {reviewAttempt.score}/{reviewAttempt.total} · {relativeTime(reviewAttempt.created_at)}
                  </p>
                )}
              </div>
              <button onClick={() => { setReviewAttempt(null); setReviewLoading(false); }} className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground transition" aria-label="Close report">
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {reviewLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading report…
                </div>
              ) : (
                reviewAttempt?.review.map((q, i) => (
                  <div key={q.question_id} className="rounded-2xl border border-black/8 bg-white/70 p-4 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white text-[11px] font-black",
                        q.correct === true ? "bg-emerald-500" : q.correct === false ? "bg-rose-500" : "bg-amber-500")}>
                        {q.correct === true ? "✓" : q.correct === false ? "✕" : "~"}
                      </span>
                      <div className="flex-1 text-[13px] font-bold text-foreground flex gap-1.5 items-start min-w-0">
                        <span className="shrink-0">{i + 1}.</span>
                        <Markdown className="text-[13px] font-bold text-foreground [&_p]:my-0" children={q.prompt} />
                      </div>
                    </div>
                    <div className="space-y-1.5 pl-7">
                      <div className="text-[11px] flex gap-1 items-start">
                        <span className="font-bold text-muted-foreground shrink-0">Their answer:</span>
                        {q.studentResponse ? (
                          <Markdown className={cn("text-[11px] [&_p]:my-0", q.correct === false ? "text-rose-600 [&_p]:text-rose-600" : "text-foreground")} children={q.studentResponse} />
                        ) : (
                          <span className="text-foreground">— (no answer)</span>
                        )}
                      </div>
                      {q.correct !== true && q.correctAnswer && (
                        <div className="text-[11px] flex gap-1 items-start">
                          <span className="font-bold text-muted-foreground shrink-0">Correct answer:</span>
                          <Markdown className="text-[11px] text-emerald-700 [&_p]:text-emerald-700 [&_p]:my-0" children={q.correctAnswer} />
                        </div>
                      )}
                      {q.rationale && (
                        <div className="rounded-xl bg-primary/[0.04] px-3 py-2">
                          <Markdown className="text-[11px] leading-5 text-[#424245]" children={q.rationale} />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REMOVE STUDENT CONFIRMATION MODAL ── */}
      {removeStudentId && (() => {
        const target = students.find((s) => s.id === removeStudentId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="absolute inset-0" onClick={() => { if (!removeStudentBusy) setRemoveStudentId(null); }} />
            <div className="liquid-shell relative w-full max-w-sm overflow-hidden rounded-[34px] p-3 shadow-2xl edsynapse-stagger">
              <div className="rounded-[26px] border border-white/70 bg-[#fbfbfd]/92 p-6 shadow-inner backdrop-blur-2xl space-y-4">
                <button
                  onClick={() => { if (!removeStudentBusy) setRemoveStudentId(null); }}
                  className="absolute right-6 top-6 flex w-8 h-8 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground transition-all"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>

                <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold font-display text-foreground leading-tight">Remove Student</h2>
                  <p className="text-xs text-muted-foreground">
                    Are you sure you want to remove{" "}
                    <strong className="text-foreground">{target?.name ?? "this student"}</strong>{" "}
                    from <strong className="text-foreground">{course.name}</strong>? Their enrollment will be deleted. This action cannot be undone.
                  </p>
                </div>

                {removeStudentError && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-600">
                    {removeStudentError}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setRemoveStudentId(null)}
                    disabled={removeStudentBusy}
                    className="flex-1 rounded-xl border border-black/10 bg-white/80 py-2.5 text-xs font-bold text-foreground transition hover:bg-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => removeStudent(removeStudentId)}
                    disabled={removeStudentBusy}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow shadow-rose-600/25 transition hover:bg-rose-700 active:scale-[0.97] disabled:opacity-60"
                  >
                    {removeStudentBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Remove Student
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
