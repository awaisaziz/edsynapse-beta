"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, AlertTriangle, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/ui/AppShell";
import { teacherApi, type Course, type CourseAnalytics } from "@/lib/edsynapseApi";

const LEVEL_TONE: Record<string, string> = {
  strong: "#22C55E",
  moderate: "#F59E0B",
  needs_improvement: "#EF4444",
};

interface TopicGap {
  topic: string;
  strong: number;
  moderate: number;
  needs: number;
  total: number;
  gapScore: number; // 0 (mastered) → 1 (struggling)
}

/**
 * Course Pulse — the teacher counterpart to the student Knowledge Map. Pick a
 * class and see, topic by topic, where the cohort is strong and where students
 * are falling behind, ranked so the biggest gaps surface first.
 */
function CoursePulseInner() {
  // Optional deep link: ?course=<id> pre-selects that course (e.g. opened from a
  // specific course page's "Course Pulse" button) instead of the first one.
  const preferredCourseId = useSearchParams().get("course");
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  // The selected course's actual outline topics — Course Pulse only tracks topics
  // that are part of the course, so renamed/stray mastery rows don't inflate the
  // count. null = not loaded yet (don't filter).
  const [outlineTopics, setOutlineTopics] = useState<Set<string> | null>(null);

  useEffect(() => {
    teacherApi
      .listCourses()
      .then(({ courses }) => {
        // Only active courses surface here — archived ones are hidden.
        const active = courses.filter((c) => !c.archived);
        setCourses(active);
        const preferred = preferredCourseId ? active.find((c) => c.id === preferredCourseId) : null;
        setSelectedId(preferred?.id ?? active[0]?.id ?? null);
      })
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));
  }, [preferredCourseId]);

  const loadAnalytics = useCallback((courseId: string) => {
    setAnalyticsLoading(true);
    setAnalytics(null);
    teacherApi
      .getAnalytics(courseId)
      .then(setAnalytics)
      .catch(() => setAnalytics({ course_id: courseId, students: [], topics: [] }))
      .finally(() => setAnalyticsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedId) loadAnalytics(selectedId);
  }, [selectedId, loadAnalytics]);

  // Load the course's outline topics so we can scope the pulse to real course
  // topics (the cohort's knowledge_states can hold stray/renamed topics).
  useEffect(() => {
    if (!selectedId) {
      setOutlineTopics(null);
      return;
    }
    let cancelled = false;
    teacherApi
      .getCourse(selectedId)
      .then(({ course }) => {
        if (!cancelled) setOutlineTopics(new Set(course.lessons.flatMap((l) => l.outline)));
      })
      .catch(() => { if (!cancelled) setOutlineTopics(null); });
    return () => { cancelled = true; };
  }, [selectedId]);

  // Aggregate the per-(topic, level) rows into one row per topic, then rank by a
  // gap score so the topics the cohort struggles with most come first.
  const gaps = useMemo<TopicGap[]>(() => {
    if (!analytics) return [];
    const byTopic = new Map<string, { strong: number; moderate: number; needs: number }>();
    for (const t of analytics.topics) {
      // Skip mastery rows for topics no longer in the course outline.
      if (outlineTopics && !outlineTopics.has(t.topic)) continue;
      const e = byTopic.get(t.topic) ?? { strong: 0, moderate: 0, needs: 0 };
      const n = Number(t.n) || 0;
      if (t.level === "strong") e.strong += n;
      else if (t.level === "moderate") e.moderate += n;
      else e.needs += n;
      byTopic.set(t.topic, e);
    }
    return [...byTopic.entries()]
      .map(([topic, c]) => {
        const total = c.strong + c.moderate + c.needs;
        const gapScore = total ? (c.needs + c.moderate * 0.5) / total : 0;
        return { topic, ...c, total, gapScore };
      })
      .sort((a, b) => b.gapScore - a.gapScore || b.needs - a.needs);
  }, [analytics, outlineTopics]);

  const studentCount = analytics?.students.length ?? 0;
  const needsAttention = gaps.filter((g) => g.needs > 0).length;
  const selectedCourse = courses.find((c) => c.id === selectedId) ?? null;

  return (
    <AppShell role="teacher">
      <div className="space-y-6">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-display leading-tight">Course Pulse</h1>
              <p className="text-xs text-muted-foreground">See which topics your class is struggling with most.</p>
            </div>
          </div>

          {/* Course picker */}
          {courses.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="pulse-course" className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Course</label>
              <select
                id="pulse-course"
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="rounded-xl border border-primary/15 bg-white/70 px-3.5 py-2 text-xs font-bold text-foreground transition focus:border-primary"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {coursesLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your classes…
          </div>
        ) : courses.length === 0 ? (
          <EmptyPanel
            icon={Users}
            title="No active classes yet"
            hint="Create a course and invite students — their topic mastery will show up here."
          />
        ) : analyticsLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Reading the cohort’s pulse…
          </div>
        ) : studentCount === 0 ? (
          <EmptyPanel
            icon={Users}
            title="No students enrolled yet"
            hint={`Share the code ${selectedCourse?.code ?? ""} so students can join ${selectedCourse?.name ?? "this class"}.`}
          />
        ) : gaps.length === 0 ? (
          <EmptyPanel
            icon={Activity}
            title="No mastery data yet"
            hint="Once students take diagnostics or assessments, topic gaps will appear here."
          />
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard icon={Users} label="Students" value={`${studentCount}`} />
              <StatCard icon={Activity} label="Topics tracked" value={`${gaps.length}`} />
              <StatCard
                icon={AlertTriangle}
                label="Need attention"
                value={`${needsAttention}`}
                tone={needsAttention > 0 ? "#EF4444" : undefined}
              />
            </div>

            {/* Ranked topic gaps */}
            <div className="liquid-panel rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground font-display">
                    Topic gaps — weakest first
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Each bar shows the cohort split across strong / moderate / needs improvement.
                  </p>
                </div>
                <Legend />
              </div>

              <div className="space-y-3.5">
                {gaps.map((g) => (
                  <div key={g.topic} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="min-w-0 flex-1 truncate font-bold text-foreground">{g.topic}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                        {g.needs > 0 && (
                          <span className="text-rose-600">{g.needs} struggling</span>
                        )}
                        {g.needs > 0 && " · "}
                        {g.total} student{g.total === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-black/5">
                      {(["strong", "moderate", "needs_improvement"] as const).map((lvl) => {
                        const v = lvl === "needs_improvement" ? g.needs : lvl === "moderate" ? g.moderate : g.strong;
                        return v > 0 ? (
                          <div
                            key={lvl}
                            style={{ width: `${(v / g.total) * 100}%`, backgroundColor: LEVEL_TONE[lvl] }}
                            title={`${v} ${lvl.replace("_", " ")}`}
                          />
                        ) : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function CoursePulsePage() {
  // useSearchParams() requires a Suspense boundary to keep this route from
  // bailing out of static rendering at build time.
  return (
    <Suspense fallback={null}>
      <CoursePulseInner />
    </Suspense>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/45 p-4 shadow-sm backdrop-blur-xl">
      <Icon className={cn("mb-2 size-4", !tone && "text-primary")} style={tone ? { color: tone } : undefined} />
      <p className="text-xl font-black text-foreground" style={tone ? { color: tone } : undefined}>
        {value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function Legend() {
  return (
    <div className="hidden items-center gap-3 text-[10px] font-bold text-muted-foreground sm:flex">
      {(
        [
          ["strong", "Strong"],
          ["moderate", "Moderate"],
          ["needs_improvement", "Needs work"],
        ] as const
      ).map(([lvl, label]) => (
        <span key={lvl} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: LEVEL_TONE[lvl] }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function EmptyPanel({ icon: Icon, title, hint }: { icon: typeof Users; title: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/45 p-12 text-center backdrop-blur-xl">
      <Icon className="mx-auto mb-3 size-8 text-primary/60" />
      <p className="text-sm font-bold text-foreground font-display">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
