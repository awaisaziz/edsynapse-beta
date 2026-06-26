"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/ui/AppShell";
import { QuizCard } from "@/components/ui/QuizCard";
import { cacheReport } from "@/lib/assessmentStore";
import {
  studentApi,
  type Course,
  type Assessment,
  type AssessmentQuestion,
  type AttemptDetail,
  type StrengthsGaps,
} from "@/lib/edsynapseApi";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Send,
  Eye,
  CheckCircle,
  History,
  Plus,
  CheckCircle2,
  XCircle,
  ChevronDown,
  BookOpen,
  Layers,
} from "lucide-react";

type ServerAttempt = {
  id: string;
  course_id: string;
  topic: string;
  kind: string;
  score: number;
  total: number;
  created_at: string;
};

export default function AssessmentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [attempts, setAttempts] = useState<ServerAttempt[]>([]);
  const [loadError, setLoadError] = useState("");

  // Active attempt state
  const [started, setStarted] = useState(false);
  const [building, setBuilding] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showReview, setShowReview] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Expandable past-attempt review.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [strengthsGaps, setStrengthsGaps] = useState<StrengthsGaps | null>(null);

  const courseId = course?.id ?? null;

  // Load strengths & gaps whenever courseId or attempts change
  useEffect(() => {
    if (!courseId) return;
    studentApi
      .getStrengthsGaps(courseId)
      .then(setStrengthsGaps)
      .catch(() => setStrengthsGaps(null));
  }, [courseId, attempts]);

  const getTopicStyle = (topic: string) => {
    // Only apply colored styling if the student has taken at least 1 attempt
    if (attempts.length === 0 || !strengthsGaps) {
      return {
        card: "border-white/70 bg-white/40 hover:bg-white text-foreground hover:border-primary/20",
        iconBg: "bg-primary/10 text-primary",
        arrowColor: "text-primary",
        badge: null,
      };
    }

    const status = strengthsGaps.topics.find(
      (t) => t.topic.toLowerCase() === topic.toLowerCase()
    );

    if (!status) {
      return {
        card: "border-white/70 bg-white/40 hover:bg-white text-foreground hover:border-primary/20",
        iconBg: "bg-primary/10 text-primary",
        arrowColor: "text-primary",
        badge: null,
      };
    }

    switch (status.level) {
      case "strong":
        return {
          card: "border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-950 hover:border-emerald-500/40",
          iconBg: "bg-emerald-500/20 text-emerald-700",
          arrowColor: "text-emerald-700",
          badge: "Strong",
        };
      case "moderate":
        return {
          card: "border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/15 text-amber-950 hover:border-amber-500/40",
          iconBg: "bg-amber-500/20 text-amber-700",
          arrowColor: "text-amber-700",
          badge: "Moderate",
        };
      case "needs_improvement":
        return {
          card: "border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/15 text-rose-950 hover:border-rose-500/40",
          iconBg: "bg-rose-500/20 text-rose-700",
          arrowColor: "text-rose-700",
          badge: "Needs Focus",
        };
      default:
        return {
          card: "border-white/70 bg-white/40 hover:bg-white text-foreground hover:border-primary/20",
          iconBg: "bg-primary/10 text-primary",
          arrowColor: "text-primary",
          badge: null,
        };
    }
  };
  // Assessment topics come only from PUBLISHED lessons/weeks — a student is
  // assessed on what the teacher has released. Across all published weeks, e.g.
  // week 1 (4 topics) + week 2 (3 topics) = 7 topics here. Dedupe because the
  // same title can repeat across outlines (which would also duplicate keys).
  const topics = [
    ...new Set(course?.lessons.filter((l) => l.published).flatMap((l) => l.outline) ?? []),
  ];

  // Load the course and its attempt history.
  useEffect(() => {
    studentApi
      .getCourseByCode(code)
      .then(({ course }) => setCourse(course))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load course."));
  }, [code]);

  const reloadAttempts = useCallback(() => {
    if (!courseId) return;
    studentApi
      .listAttempts()
      .then(({ attempts }) =>
        setAttempts(attempts.filter((a) => a.course_id === courseId && a.kind === "assessment")),
      )
      .catch(() => setAttempts([]));
  }, [courseId]);

  useEffect(() => {
    reloadAttempts();
  }, [reloadAttempts]);

  const startNewAssessment = async (topic: string) => {
    if (!courseId) return;
    setSelectedTopic(topic);
    setBuilding(true);
    setStarted(true);
    setAnswers({});
    setCurrentIdx(0);
    setShowReview(false);
    try {
      const a = await studentApi.createAssessment(courseId, topic);
      setAssessment(a);
      setQuestions(a.questions);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't build the assessment.");
      setStarted(false);
    } finally {
      setBuilding(false);
    }
  };

  // Comprehensive assessment spanning every topic in the course.
  const startComprehensiveAssessment = async () => {
    if (!courseId || topics.length === 0) return;
    setSelectedTopic("Comprehensive Review");
    setBuilding(true);
    setStarted(true);
    setAnswers({});
    setCurrentIdx(0);
    setShowReview(false);
    try {
      const a = await studentApi.createComprehensiveAssessment(courseId, topics);
      setAssessment(a);
      setQuestions(a.questions);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't build the assessment.");
      setStarted(false);
    } finally {
      setBuilding(false);
    }
  };

  // Open/close a past attempt and lazy-load its full reviewed breakdown.
  const toggleAttempt = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await studentApi.getAttempt(id);
      setDetail(d);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load that attempt.");
      setExpandedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSelectAnswer = (ans: string) => {
    const question = questions[currentIdx];
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: ans }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) setCurrentIdx((p) => p + 1);
    else setShowReview(true);
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx((p) => p - 1);
  };

  const handleSubmitAssessment = async () => {
    if (!assessment || !courseId) return;
    setSubmitting(true);
    try {
      const formatted = questions.map((q) => {
        const raw = answers[q.id] ?? "";
        if (q.type === "mcq" && q.choices) {
          const idx = parseInt(raw, 10);
          if (!isNaN(idx) && q.choices[idx]) {
            return { question_id: q.id, response: q.choices[idx].label };
          }
        }
        return { question_id: q.id, response: raw };
      });

      const report = await studentApi.gradeAssessment(
        assessment.id,
        courseId,
        selectedTopic,
        questions,
        formatted,
      );
      const cached = cacheReport({ code, courseId, topic: selectedTopic, report, questions });
      router.push(`/student/class/${code}/results?report=${cached.id}`);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't grade your assessment.");
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentIdx];
  const progressPercent = questions.length ? (Object.keys(answers).length / questions.length) * 100 : 0;
  const bestPct =
    attempts.length > 0
      ? Math.max(...attempts.map((a) => (a.total > 0 ? Math.round((a.score / a.total) * 100) : 0)))
      : 0;

  return (
    <AppShell role="student">
      <div className="max-w-3xl mx-auto space-y-6">
        {loadError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-500/5 p-4 text-xs font-semibold text-rose-600">
            {loadError}
          </div>
        )}

        {/* ── ATTEMPT HISTORY LANDING ──────────────────────────── */}
        {!started && (
          <div className="space-y-6 edsynapse-stagger">
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-white/60 bg-white/45 backdrop-blur-md">
              <Link
                href={`/student/class/${code}`}
                className="p-2 rounded-xl hover:bg-white/40 transition-colors border border-transparent hover:border-white/50 text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-base font-bold text-foreground font-display">
                  {course?.name ?? "Formal Assessment"}
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  AI-generated, grounded in your course material
                </p>
              </div>
            </div>

            {/* Overview: attempt count */}
            <div className="liquid-panel rounded-3xl p-6 flex items-center gap-4">
              <div className="flex w-14 h-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/15">
                <History className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground font-display leading-none">{attempts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {attempts.length === 1 ? "attempt taken" : "attempts taken"} on this course
                </p>
              </div>
            </div>

            {/* Topic picker to start a new assessment */}
            <div className="liquid-panel rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground font-display">Start a new assessment</h2>
              </div>
              {topics.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  This course has no topics yet. Topics appear once lessons are published or material is added.
                </p>
              ) : (
                <>
                {topics.length > 1 && (
                  <button
                    type="button"
                    onClick={startComprehensiveAssessment}
                    className="flex w-full items-center justify-between gap-2 p-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-blue-500/5 hover:from-primary/15 text-left transition-all active:scale-[0.98] shadow-sm"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <Layers className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-foreground">Comprehensive assessment</span>
                        <span className="block text-[10px] text-muted-foreground">
                          Mixed questions across all {topics.length} topics
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0 text-primary" />
                  </button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {topics.map((topic) => {
                    const style = getTopicStyle(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => startNewAssessment(topic)}
                        className={`flex items-center justify-between gap-2 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] shadow-sm ${style.card}`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className={`flex w-8 h-8 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}>
                            <BookOpen className="w-4 h-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold">{topic}</span>
                            {style.badge && (
                              <span className="inline-block mt-0.5 text-[9px] font-extrabold uppercase tracking-wider opacity-75">
                                {style.badge}
                              </span>
                            )}
                          </span>
                        </span>
                        <ArrowRight className={`w-4 h-4 shrink-0 ${style.arrowColor}`} />
                      </button>
                    );
                  })}
                </div>
                </>
              )}
            </div>

            {/* Past attempts list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/30 pb-2">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider font-display">
                  Previous Attempts
                </h2>
                {attempts.length > 0 && (
                  <span className="text-xs text-muted-foreground font-semibold">Best: {bestPct}%</span>
                )}
              </div>

              {attempts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-primary/15 bg-white/20 p-8 text-center">
                  <p className="text-sm font-bold text-foreground">No attempts yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Take your first assessment to track your progress on this course&apos;s material.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {attempts.map((a, i) => {
                    const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
                    const passed = pct >= 60;
                    const isOpen = expandedId === a.id;
                    return (
                      <div
                        key={a.id}
                        className="rounded-2xl border border-white/70 bg-white/45 backdrop-blur-sm shadow-sm overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleAttempt(a.id)}
                          className="group flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-white/40"
                        >
                          <div
                            className={`flex w-11 h-11 shrink-0 items-center justify-center rounded-2xl border ${
                              passed
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}
                          >
                            {passed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground font-display truncate">
                              {(() => {
                                const topics = a.topic ? a.topic.split(",").map(t => t.trim()).filter(Boolean) : [];
                                return topics.length > 1 ? `${topics[0]} +${topics.length - 1} more` : a.topic || `Attempt ${attempts.length - i}`;
                              })()}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(a.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}{" "}
                              ·{" "}
                              {new Date(a.created_at).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-black text-foreground font-mono leading-none">{pct}%</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {a.score}/{a.total} correct
                            </p>
                          </div>

                          <ChevronDown
                            className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>

                        {isOpen && (
                          <div className="border-t border-white/50 bg-white/30 p-4 space-y-4 edsynapse-stagger">
                            {detailLoading || !detail ? (
                              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                                <div className="w-7 h-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                                <p className="text-xs font-semibold text-muted-foreground">Loading your answers…</p>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Question-by-question review
                                  </p>
                                  <Link
                                    href={`/student/class/${code}/report/${a.id}`}
                                    className="flex items-center gap-1.5 rounded-xl border border-primary/15 bg-white/70 px-3 py-1.5 text-[11px] font-bold text-primary transition-all hover:bg-white active:scale-[0.97]"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    View report
                                  </Link>
                                </div>
                                {a.topic && (
                                  <div className="flex flex-wrap gap-1.5 bg-white/40 p-3 rounded-2xl border border-primary/5">
                                    <div className="w-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                      Topics Covered
                                    </div>
                                    {a.topic.split(",").map((t) => t.trim()).filter(Boolean).map((t, idx) => (
                                      <span key={idx} className="inline-flex items-center rounded-lg bg-primary/10 border border-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {detail.review.map((r, idx) => (
                                  <QuizCard
                                    key={r.question_id}
                                    index={idx}
                                    question={r.prompt}
                                    type={r.type}
                                    options={r.type === "mcq" ? r.options : undefined}
                                    selectedAnswer={
                                      r.type === "mcq"
                                        ? r.selectedIndex >= 0
                                          ? String(r.selectedIndex)
                                          : ""
                                        : r.studentResponse
                                    }
                                    correctAnswer={
                                      r.type === "mcq" ? String(r.correctIndex) : r.correctAnswer
                                    }
                                    onSelectAnswer={() => {}}
                                    showResults={true}
                                    explanation={r.rationale}
                                  />
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ACTIVE ASSESSMENT ────────────────────────────────── */}
        {started && (
          <>
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl border border-white/60 bg-white/45 backdrop-blur-md gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStarted(false)}
                  className="p-2 rounded-xl hover:bg-white/40 transition-colors border border-transparent hover:border-white/50 text-muted-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-base font-bold text-foreground font-display">{course?.name ?? "Assessment"}</h1>
                  <p className="text-[10px] text-muted-foreground">Topic: {selectedTopic}</p>
                </div>
              </div>
            </div>

            {building ? (
              <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-10 h-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                <p className="text-sm font-bold">Building your assessment…</p>
                <p className="text-xs text-muted-foreground">Grounded in: {selectedTopic}</p>
              </div>
            ) : (
              <>
                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wide px-1">
                    <span>Progress</span>
                    <span>
                      {Object.keys(answers).length} of {questions.length} Answered ({Math.round(progressPercent)}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-white/45 backdrop-blur-sm border border-white/70 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-blue-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {!showReview && currentQuestion ? (
                  <div className="space-y-6">
                    <QuizCard
                      index={currentIdx}
                      question={currentQuestion.prompt}
                      options={currentQuestion.choices?.map((c) => `${c.label}. ${c.text}`)}
                      type={currentQuestion.type}
                      selectedAnswer={answers[currentQuestion.id] || ""}
                      onSelectAnswer={handleSelectAnswer}
                      showResults={false}
                    />

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handlePrev}
                        disabled={currentIdx === 0}
                        className="flex items-center gap-1.5 text-xs font-bold px-4 py-3 border border-primary/10 rounded-2xl bg-white/40 text-muted-foreground hover:bg-white hover:text-foreground disabled:opacity-30 disabled:pointer-events-none active:scale-[0.98] transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-1.5 text-xs font-bold px-5 py-3 bg-primary text-white rounded-2xl hover:bg-primary/95 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                      >
                        <span>{currentIdx === questions.length - 1 ? "Review Answers" : "Next Question"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="liquid-panel rounded-3xl p-6 md:p-8 space-y-6 edsynapse-stagger">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-700">
                        <Eye className="w-5 h-5 text-amber-700" />
                        <h2 className="text-lg font-bold text-foreground font-display">Review Your Assessment</h2>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Review all answers before submitting. Click any question to return and edit your response.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {questions.map((q, idx) => {
                        const isAnswered = answers[q.id] !== undefined && answers[q.id] !== "";
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              setCurrentIdx(idx);
                              setShowReview(false);
                            }}
                            className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] ${
                              isAnswered
                                ? "border-emerald-200 bg-emerald-500/5 text-emerald-800"
                                : "border-amber-200 bg-amber-500/5 text-amber-800"
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider">Question {idx + 1}</span>
                            <span className="text-sm font-extrabold">{isAnswered ? "Answered" : "Empty"}</span>
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${
                                isAnswered ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                              }`}
                            >
                              {isAnswered ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between border-t border-white/30 pt-6">
                      <button
                        type="button"
                        onClick={() => setShowReview(false)}
                        className="flex items-center gap-1 text-xs font-bold px-4 py-3 border border-primary/10 rounded-2xl bg-white/40 text-muted-foreground hover:bg-white hover:text-foreground active:scale-[0.98] transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Go Back to Quiz</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl text-sm font-semibold hover:brightness-115 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <Send className="w-4 h-4" />
                        <span>Submit Assessment</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-2xl flex flex-col gap-4 text-center edsynapse-stagger">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground font-display">Submit your assessment?</h3>
              <p className="text-xs text-muted-foreground">
                Once submitted, the AI tutor will grade your responses and update your strengths &amp; gaps.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl border border-primary/10 bg-white/60 text-xs font-bold text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleSubmitAssessment}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-xs font-bold text-white hover:bg-primary/95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{submitting ? "Grading…" : "Submit"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
