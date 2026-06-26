"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StrengthsGapsChart } from "@/components/ui/StrengthsGapsChart";
import { type StrengthsGapsTopic, type TopicMastery } from "@/lib/strengthsGaps";
import { studentApi, type Course, type TopicStatus } from "@/lib/edsynapseApi";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  ArrowDownUp,
  Trophy,
} from "lucide-react";

const LEVEL_SCORE: Record<TopicMastery, number> = {
  strong: 88,
  moderate: 60,
  needs_improvement: 32,
};

function toChartTopic(t: TopicStatus, i: number): StrengthsGapsTopic {
  return {
    id: `km_${i}`,
    topic: t.topic,
    status: t.level,
    score: LEVEL_SCORE[t.level],
    lastAttempted: "—",
    quizAttempts: 0,
  };
}

function StrengthsGapsInner() {
  const router = useRouter();
  // Optional deep link: ?course=<id> pre-selects that course (e.g. opened from a
  // class page's "Strengths & Gaps" button) instead of defaulting to the first.
  const preferredCourseId = useSearchParams().get("course");
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<StrengthsGapsTopic[]>([]);
  const [overall, setOverall] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load enrolled courses, then default to the first one.
  useEffect(() => {
    studentApi
      .listCourses()
      .then(({ courses }) => {
        // Only active courses surface here — archived ones are hidden.
        const active = courses.filter((c) => !c.archived);
        setCourses(active);
        const preferred = preferredCourseId ? active.find((c) => c.id === preferredCourseId) : null;
        setActiveCourse(preferred ?? active[0] ?? null);
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [preferredCourseId]);

  // Load the strengths & gaps for the active course.
  useEffect(() => {
    if (!activeCourse) {
      setTopics([]);
      setOverall(0);
      return;
    }
    studentApi
      .getStrengthsGaps(activeCourse.id)
      .then((km) => {
        setTopics(km.topics.map(toChartTopic));
        setOverall(Math.round(km.overall_mastery));
      })
      .catch(() => {
        setTopics([]);
        setOverall(0);
      });
  }, [activeCourse]);

  const recommendedTopic = useMemo(() => {
    const weak = topics.filter((t) => t.status === "needs_improvement");
    const moderate = topics.filter((t) => t.status === "moderate");
    return weak[0] ?? moderate[0] ?? topics[0] ?? null;
  }, [topics]);

  // Concept breakdown ordering. Default puts the weakest topics on top (lowest
  // mastery first) so the student immediately sees what to work on next; the
  // toggle flips it to strongest-first.
  const [weakestFirst, setWeakestFirst] = useState(true);
  const sortedTopics = useMemo(() => {
    const byScore = [...topics].sort((a, b) => a.score - b.score);
    return weakestFirst ? byScore : byScore.reverse();
  }, [topics, weakestFirst]);

  const handleAction = (topicId: string, actionType: "tutor" | "quiz" | "review" | "assessment") => {
    const topic = topics.find((t) => t.id === topicId);
    if (!topic || !activeCourse) return;
    const code = activeCourse.code;
    const queryTopic = encodeURIComponent(topic.topic);
    if (actionType === "tutor") {
      router.push(`/student/class/${code}?topic=${queryTopic}&mode=chat`);
    } else if (actionType === "quiz") {
      router.push(`/student/class/${code}/quiz?topic=${queryTopic}`);
    } else if (actionType === "review") {
      router.push(`/student/class/${code}?tab=notes&topic=${queryTopic}`);
    } else if (actionType === "assessment") {
      router.push(`/student/class/${code}/assessment`);
    }
  };

  return (
    <AppShell role="student">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground font-display tracking-tight">Strengths &amp; Gaps</h1>
            <p className="text-xs text-muted-foreground">
              A real-time diagnosis of your concept mastery, updated as you study.
            </p>
          </div>

          {courses.length > 0 && (
            <select
              value={activeCourse?.id ?? ""}
              onChange={(e) => setActiveCourse(courses.find((c) => c.id === e.target.value) ?? null)}
              className="rounded-xl border border-primary/15 bg-white/60 px-3.5 py-2 text-xs font-bold text-foreground"
              aria-label="Select course"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="py-24 flex justify-center">
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : !activeCourse ? (
          <div className="liquid-panel rounded-3xl p-10 text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-base font-bold text-foreground font-display">No courses yet</h2>
              <p className="text-xs text-muted-foreground">
                Join a class or start a self-study course to begin building your strengths &amp; gaps.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/student/self-study/new")}
                className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/95 active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start self-study</span>
              </button>
              <button
                type="button"
                onClick={() => router.push("/student")}
                className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-white/60 px-5 py-3 text-xs font-bold text-foreground transition-all hover:bg-white active:scale-[0.98]"
              >
                <span>Join a class</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : topics.length === 0 ? (
          <div className="liquid-panel rounded-3xl p-10 text-center space-y-2">
            <h2 className="text-base font-bold text-foreground font-display">No mastery data yet</h2>
            <p className="text-xs text-muted-foreground">
              Take a diagnostic quiz or chat with the tutor in <span className="font-bold">{activeCourse.name}</span> and your
              concept mastery will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Top Section: Overall score and suggestion card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="liquid-panel rounded-3xl p-6 flex flex-col sm:flex-row lg:flex-col items-center justify-between gap-6 lg:col-span-1">
                <div className="space-y-2 text-center sm:text-left lg:text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Overall Mastery
                  </span>
                  <h2 className="text-lg font-bold text-foreground font-display">{activeCourse.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    Updated automatically as you chat with the AI and complete quizzes.
                  </p>
                </div>

                <div className="relative flex items-center justify-center p-2 rounded-2xl bg-white/45 border border-white/60 shadow-inner">
                  <ProgressRing value={overall} size={120} strokeWidth={10} textClassName="text-lg font-extrabold text-primary" />
                </div>
              </div>

              {recommendedTopic && (
                <div className="liquid-panel rounded-3xl p-6 lg:col-span-2 flex flex-col justify-between gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wide">AI Study Recommendation</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                        <h3 className="text-base font-bold text-foreground font-display">
                          Prioritize: {recommendedTopic.topic}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                        This concept is currently your weakest area. Review it with the tutor or take a quick diagnostic to
                        strengthen your mastery.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleAction(recommendedTopic.id, "tutor")}
                      className="flex items-center gap-1 text-xs font-bold px-4 py-3 bg-primary text-white rounded-2xl hover:bg-primary/95 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                    >
                      <span>Launch AI Tutor Session</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAction(recommendedTopic.id, "quiz")}
                      className="flex items-center gap-1 text-xs font-bold px-4 py-3 bg-white/60 hover:bg-white text-foreground rounded-2xl border border-primary/10 active:scale-[0.98] transition-all"
                    >
                      <span>Take Diagnostic Quiz</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAction(recommendedTopic.id, "assessment")}
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-3 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 rounded-2xl border border-emerald-500/20 active:scale-[0.98] transition-all"
                    >
                      <Trophy className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Take Assessment</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Topic Breakdown List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/30 pb-2">
                <h3 className="text-sm font-bold text-foreground font-display uppercase tracking-wider">
                  Concept Mastery Breakdown
                </h3>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setWeakestFirst((v) => !v)}
                    title="Reverse the order"
                    className="flex items-center gap-1.5 rounded-xl border border-primary/15 bg-white/60 px-2.5 py-1.5 text-xs font-bold text-foreground transition-all hover:bg-white active:scale-[0.97]"
                  >
                    <ArrowDownUp className="w-3.5 h-3.5" />
                    <span>{weakestFirst ? "Weakest first" : "Strongest first"}</span>
                  </button>
                  <span className="hidden text-xs text-muted-foreground font-semibold sm:flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {topics.length} topics mapped
                  </span>
                </div>
              </div>

              <StrengthsGapsChart topics={sortedTopics} onAction={handleAction} showActions={true} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function StrengthsGapsPage() {
  // useSearchParams() requires a Suspense boundary to keep this route from
  // bailing out of static rendering at build time.
  return (
    <Suspense fallback={null}>
      <StrengthsGapsInner />
    </Suspense>
  );
}
