"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Users,
  GraduationCap,
  BookOpen,
  Mail,
  Trash2,
  Ban,
  RotateCcw,
  X,
  Send,
  LogOut,
  Search,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformUserDTO, SupportThreadDTO } from "@/lib/admin";

interface AdminCourse {
  id: string;
  name: string;
  subject: string;
  code: string;
  color: string;
  ownerName: string;
  studentCount: number;
  lessonCount: number;
}

type Tab = "overview" | "teachers" | "students" | "courses" | "messages";

export default function AdminDashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<PlatformUserDTO[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [threads, setThreads] = useState<SupportThreadDTO[]>([]);

  const refresh = useCallback(async () => {
    const [u, c, t] = await Promise.all([
      fetch("/api/admin/users", { credentials: "include" }),
      fetch("/api/admin/courses", { credentials: "include" }),
      fetch("/api/admin/support", { credentials: "include" }),
    ]);
    if (u.ok) setUsers(((await u.json()) as { users: PlatformUserDTO[] }).users);
    if (c.ok) setCourses(((await c.json()) as { courses: AdminCourse[] }).courses);
    if (t.ok) setThreads(((await t.json()) as { threads: SupportThreadDTO[] }).threads);
  }, []);

  // Gate on an authenticated admin session, then load data.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) throw new Error("unauthenticated");
        const data = (await res.json()) as { user: { role: string } | null };
        if (!data.user || data.user.role !== "admin") throw new Error("forbidden");
        if (cancelled) return;
        setAuthChecked(true);
        await refresh();
      } catch {
        router.replace("/");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, refresh]);

  // Periodic background polling for admin dashboard (every 5 seconds)
  useEffect(() => {
    if (!authChecked) return;
    const interval = setInterval(async () => {
      try {
        await refresh();
      } catch (err) {
        console.warn("[AdminDashboard] Background auto-refresh failed:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [authChecked, refresh]);

  if (!authChecked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f0f6ff] text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const teachers = users.filter((u) => u.role === "teacher");
  const students = users.filter((u) => u.role === "student");
  const openMessages = threads.filter((t) => t.unreadForAdmin).length;

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
  };

  const stats = [
    { label: "Teachers", value: teachers.length, icon: GraduationCap, tab: "teachers" as Tab, color: "#0066cc" },
    { label: "Students", value: students.length, icon: Users, tab: "students" as Tab, color: "#8b5cf6" },
    { label: "Courses", value: courses.length, icon: BookOpen, tab: "courses" as Tab, color: "#10b981" },
    { label: "Open Messages", value: openMessages, icon: Mail, tab: "messages" as Tab, color: "#f59e0b" },
  ];

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "teachers", label: "Teachers", icon: GraduationCap },
    { id: "students", label: "Students", icon: Users },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "messages", label: "Messages", icon: Mail },
  ];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f0f6ff] text-[#1d1d1f] font-sans pb-12">
      <div className="pointer-events-none absolute inset-0 liquid-canvas" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="relative z-10 border-b border-white/45 bg-white/40 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white font-bold text-base shadow shadow-primary/20">
              ES
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground font-display">EdSynapse</span>
          </Link>

          <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-primary/10 bg-white/60 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Console
          </span>

          <button
            onClick={handleSignOut}
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-xs font-bold text-white transition-all hover:bg-rose-700 active:scale-[0.97]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1200px] px-6 py-10 space-y-8">
        {/* Banner */}
        <div className="border border-white/60 bg-white/45 backdrop-blur-md p-6 rounded-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
            Platform Administration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage every teacher, student, and course — and respond to support messages.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <button
              key={s.label}
              onClick={() => setTab(s.tab)}
              className="group flex items-center gap-4 rounded-3xl border border-white/70 bg-white/45 p-5 text-left shadow-lg backdrop-blur-xl transition-all hover:scale-[1.02] hover:bg-white/60"
            >
              <div
                className="flex w-12 h-12 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ backgroundColor: s.color }}
              >
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-foreground tabular-nums">{s.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/60 bg-white/40 p-1.5 backdrop-blur-md w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                tab === t.id
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.id === "messages" && openMessages > 0 && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-extrabold text-white">
                  {openMessages}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && (
          <OverviewTab
            teachers={teachers}
            students={students}
            courses={courses}
            threads={threads}
            onOpenMessages={() => setTab("messages")}
          />
        )}
        {tab === "teachers" && (
          <UserTable role="teacher" users={teachers} onChange={refresh} />
        )}
        {tab === "students" && (
          <UserTable role="student" users={students} onChange={refresh} />
        )}
        {tab === "courses" && <CoursesTab courses={courses} onChange={refresh} />}
        {tab === "messages" && <MessagesTab threads={threads} onChange={refresh} />}
      </main>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab({
  teachers,
  students,
  courses,
  threads,
  onOpenMessages,
}: {
  teachers: PlatformUserDTO[];
  students: PlatformUserDTO[];
  courses: AdminCourse[];
  threads: SupportThreadDTO[];
  onOpenMessages: () => void;
}) {
  const suspended = [...teachers, ...students].filter((u) => u.status === "suspended").length;
  const totalEnrollments = courses.reduce((n, c) => n + c.studentCount, 0);
  const recent = threads.slice(0, 3);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-white/70 bg-white/45 p-6 shadow-lg backdrop-blur-xl space-y-4">
        <h3 className="text-sm font-bold text-foreground font-display uppercase tracking-wider">
          Platform Health
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Total Accounts" value={teachers.length + students.length} />
          <Metric label="Suspended" value={suspended} />
          <Metric label="Active Courses" value={courses.length} />
          <Metric label="Enrollments" value={totalEnrollments} />
        </div>
      </div>

      <div className="rounded-3xl border border-white/70 bg-white/45 p-6 shadow-lg backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground font-display uppercase tracking-wider">
            Recent Messages
          </h3>
          <button onClick={onOpenMessages} className="text-xs font-bold text-primary hover:underline">
            View all
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground">No messages yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((t) => (
              <button
                key={t.id}
                onClick={onOpenMessages}
                className="flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-white/60 p-3 text-left transition hover:bg-white"
              >
                <div className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary">
                  {t.userInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{t.userName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {t.messages[t.messages.length - 1]?.body ?? ""}
                  </p>
                </div>
                {t.unreadForAdmin && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white/60 p-4">
      <div className="text-2xl font-black text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

// ── Users (Teachers / Students) ───────────────────────────────────────────────
function UserTable({
  role,
  users,
  onChange,
}: {
  role: "teacher" | "student";
  users: PlatformUserDTO[];
  onChange: () => void | Promise<void>;
}) {
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const metricLabel = role === "teacher" ? "Courses" : "Enrolled";

  const toggleStatus = async (u: PlatformUserDTO) => {
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: u.status === "active" ? "suspended" : "active" }),
    });
    await onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${role}s...`}
            className="h-11 w-64 rounded-2xl border border-primary/15 bg-white/70 pl-9 pr-4 text-xs outline-none focus:border-primary focus:bg-white"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/45 shadow-lg backdrop-blur-xl">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/40 px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          <span>Account</span>
          <span className="hidden sm:block w-20 text-center">{metricLabel}</span>
          <span className="w-28 text-right">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-muted-foreground">No {role}s found.</p>
        ) : (
          filtered.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/30 px-5 py-3.5 last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary">
                  {u.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-foreground truncate">{u.name}</p>
                    {u.status === "suspended" && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-rose-700">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{u.email} · {u.joined}</p>
                </div>
              </div>

              <span className="hidden sm:block w-20 text-center text-sm font-bold text-foreground tabular-nums">
                {u.metric}
              </span>

              <div className="flex w-28 items-center justify-end gap-1.5">
                <button
                  onClick={() => toggleStatus(u)}
                  title={u.status === "active" ? "Suspend account" : "Restore account"}
                  className={cn(
                    "flex w-8 h-8 items-center justify-center rounded-xl border transition-all active:scale-95",
                    u.status === "active"
                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  )}
                >
                  {u.status === "active" ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Courses ───────────────────────────────────────────────────────────────────
function CoursesTab({
  courses,
  onChange,
}: {
  courses: AdminCourse[];
  onChange: () => void | Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AdminCourse | null>(null);

  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/courses/${id}`, { method: "DELETE", credentials: "include" });
    setConfirmDelete(null);
    await onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="h-11 w-64 rounded-2xl border border-primary/15 bg-white/70 pl-9 pr-4 text-xs outline-none focus:border-primary focus:bg-white"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/45 shadow-lg backdrop-blur-xl">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/40 px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          <span>Course</span>
          <span className="hidden sm:block w-20 text-center">Students</span>
          <span className="w-16 text-right">Action</span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-muted-foreground">No courses found.</p>
        ) : (
          filtered.map((course) => (
            <div
              key={course.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/30 px-5 py-3.5 last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold shadow-sm"
                  style={{ backgroundColor: course.color }}
                >
                  {course.name.substring(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{course.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {course.subject} · <span className="font-mono">{course.code}</span> · {course.lessonCount} lessons · {course.ownerName}
                  </p>
                </div>
              </div>

              <span className="hidden sm:block w-20 text-center text-sm font-bold text-foreground tabular-nums">
                {course.studentCount}
              </span>

              <div className="flex w-16 items-center justify-end">
                <button
                  onClick={() => setConfirmDelete(course)}
                  title="Delete course"
                  className="flex w-8 h-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition-all hover:bg-rose-100 active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} title="Delete course?">
          <p className="text-xs text-muted-foreground">
            Permanently remove <strong className="text-foreground">{confirmDelete.name}</strong> and all its
            lessons. Enrolled students will lose access. This cannot be undone.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="h-11 flex-1 rounded-2xl border border-primary/10 bg-white/70 text-xs font-bold text-foreground hover:bg-white"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(confirmDelete.id)}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Messages ──────────────────────────────────────────────────────────────────
function MessagesTab({
  threads,
  onChange,
}: {
  threads: SupportThreadDTO[];
  onChange: () => void | Promise<void>;
}) {
  const [activeId, setActiveId] = useState<string | null>(threads[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = threads.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    if (!active?.unreadForAdmin) return;
    (async () => {
      await fetch(`/api/admin/support/${active.id}`, { method: "PATCH", credentials: "include" });
      await onChange();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !reply.trim()) return;
    await fetch(`/api/admin/support/${active.id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    });
    setReply("");
    await onChange();
  };

  if (threads.length === 0) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/45 p-12 text-center shadow-lg backdrop-blur-xl">
        <Mail className="mx-auto w-8 h-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-bold text-foreground">No messages</p>
        <p className="text-xs text-muted-foreground">Teacher and student messages will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Thread list */}
      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/45 shadow-lg backdrop-blur-xl">
        {threads.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={cn(
              "flex w-full items-center gap-3 border-b border-white/30 p-3.5 text-left transition-all last:border-0",
              activeId === t.id ? "bg-primary/10" : "hover:bg-white/50"
            )}
          >
            <div className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary">
              {t.userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-foreground truncate">{t.userName}</p>
                <span className="rounded-full bg-primary/5 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-primary">
                  {t.userRole}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {t.messages[t.messages.length - 1]?.body ?? ""}
              </p>
            </div>
            {t.unreadForAdmin && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
          </button>
        ))}
      </div>

      {/* Conversation */}
      <div className="flex flex-col rounded-3xl border border-white/70 bg-white/45 shadow-lg backdrop-blur-xl">
        {active ? (
          <>
            <div className="flex items-center gap-3 border-b border-white/40 p-4">
              <div className="flex w-9 h-9 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary">
                {active.userInitials}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{active.userName}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {active.userRole}
                </p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 max-h-[420px] space-y-2 overflow-y-auto p-4 scrollbar-hide">
              {active.messages.map((m) => (
                <div key={m.id} className={cn("flex", m.from === "admin" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-5",
                      m.from === "admin"
                        ? "rounded-tr-sm bg-primary text-white"
                        : "rounded-tl-sm border border-primary/10 bg-white text-foreground"
                    )}
                  >
                    {m.body}
                    <span className={cn("mt-0.5 block text-[9px]", m.from === "admin" ? "text-white/70" : "text-muted-foreground")}>
                      {m.at}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleReply} className="flex items-center gap-2 border-t border-white/40 p-3">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={`Reply to ${active.userName.split(" ")[0]}...`}
                className="h-11 flex-1 rounded-2xl border border-primary/15 bg-white/80 px-4 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!reply.trim()}
                className="flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-xs font-bold text-white transition-all hover:bg-primary/95 active:scale-[0.98] disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-12 text-xs text-muted-foreground">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared modal shell ────────────────────────────────────────────────────────
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="liquid-shell relative w-full max-w-sm overflow-hidden rounded-[34px] p-3 shadow-2xl edsynapse-stagger">
        <div className="rounded-[26px] border border-white/70 bg-[#fbfbfd]/92 p-6 shadow-inner backdrop-blur-2xl">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 flex w-8 h-8 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground transition-all"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <h2 className="mb-4 text-lg font-bold font-display text-foreground">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
