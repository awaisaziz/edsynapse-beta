"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle, Zap, Trophy, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { studentApi, type Assessment, type GradeReport, type Course } from "@/lib/edsynapseApi";
import { QuizCard } from "@/components/ui/QuizCard";
import Markdown from "@/components/ui/Markdown";

export default function QuizPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const search = useSearchParams();
  const topicParam = search.get("topic") ?? "";

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedTopic, setSelectedTopic] = useState(topicParam);
  const [phase, setPhase] = useState<"select_topic" | "loading" | "quiz" | "result" | "error">(
    topicParam ? "loading" : "select_topic"
  );
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [report, setReport] = useState<GradeReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const courseId = course?.id ?? null;
  const topics = course?.lessons.flatMap((l) => l.outline) ?? [];

  useEffect(() => {
    studentApi
      .getCourseByCode(code)
      .then(({ course }) => setCourse(course))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load course.");
        setPhase("error");
      });
  }, [code]);

  useEffect(() => {
    if (phase !== "loading" || !selectedTopic || !courseId) return;

    studentApi
      .createAssessment(courseId, selectedTopic)
      .then((a) => {
        setAssessment(a);
        setPhase("quiz");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Couldn't build the quiz. Try again.");
        setPhase("error");
      });
  }, [phase, selectedTopic, courseId]);

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setPhase("loading");
  };

  const handleSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!assessment || !courseId) return;
    setSubmitting(true);
    try {
      const formattedAnswers = assessment.questions.map(q => {
        const rawAns = answers[q.id] ?? "";
        // If MCQ and choice index was selected, map to label A/B/C/D
        if (q.type === "mcq" && q.choices) {
          const choiceIndex = parseInt(rawAns, 10);
          if (!isNaN(choiceIndex) && q.choices[choiceIndex]) {
            return { question_id: q.id, response: q.choices[choiceIndex].label };
          }
        }
        return { question_id: q.id, response: rawAns };
      });

      const r = await studentApi.gradeAssessment(
        assessment.id, courseId, selectedTopic, assessment.questions, formattedAnswers
      );
      setReport(r);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't grade your quiz. Try again.");
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f6ff] text-[#1d1d1f] relative overflow-y-auto font-sans pb-12">
      <div className="pointer-events-none absolute inset-0 liquid-canvas" />

      <div className="mx-auto max-w-2xl px-6 py-12 relative z-10 space-y-6">
        <div className="flex items-center justify-between border-b border-white/30 pb-3">
          <Link
            href={`/student/class/${code}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Classroom</span>
          </Link>

          <Link
            href={`/student/class/${code}/results`}
            className="text-xs font-bold text-primary hover:underline"
          >
            Skip to Assessment Results →
          </Link>
        </div>

        {phase === "select_topic" && (
          <div className="liquid-panel rounded-3xl p-6 space-y-6 edsynapse-stagger">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-foreground font-display">
                Select a Topic for your Diagnostic
              </h1>
              <p className="text-xs text-muted-foreground">
                Choose one of the active syllabus topics to launch your short diagnostic quiz.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {topics.length === 0 && (
                <p className="rounded-2xl border border-white/70 bg-white/40 p-4 text-xs text-muted-foreground">
                  This course has no topics yet. Ask your teacher to publish lessons, or add material in self-study mode.
                </p>
              )}
              {topics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleSelectTopic(topic)}
                  className="p-4 rounded-2xl border border-white/70 bg-white/40 hover:bg-white flex items-center justify-between text-left transition-all active:scale-[0.98] shadow-sm font-sans"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{topic}</p>
                      <p className="text-[10px] text-muted-foreground">Adaptive diagnostic</p>
                    </div>
                  </div>
                  <Zap className="w-4 h-4 text-primary" />
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "loading" && (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 edsynapse-stagger">
            <div className="w-10 h-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <div className="space-y-1">
              <p className="text-sm font-bold">Assembling Diagnostic Quiz...</p>
              <p className="text-xs text-muted-foreground">Targeting gaps in: {selectedTopic}</p>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-3xl border border-rose-200 bg-rose-500/5 p-6 text-center space-y-4 edsynapse-stagger">
            <p className="text-sm font-semibold text-rose-600">{error}</p>
            <button
              onClick={() => setPhase("select_topic")}
              className="text-xs font-bold text-primary hover:underline"
            >
              Select different topic
            </button>
          </div>
        )}

        {phase === "quiz" && assessment && (
          <div className="space-y-6 edsynapse-stagger">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <h1 className="text-xl font-bold font-display text-foreground">{selectedTopic}</h1>
              </div>
              <p className="text-xs text-muted-foreground">
                {assessment.questions.length} Questions • Custom AI Diagnostic
              </p>
            </div>

            <div className="space-y-4">
              {assessment.questions.map((q, idx) => (
                <QuizCard
                  key={q.id}
                  index={idx}
                  question={q.prompt}
                  options={q.choices?.map((c) => `${c.label}. ${c.text}`)}
                  type={q.type as "mcq" | "short_answer"}
                  selectedAnswer={answers[q.id] || ""}
                  onSelectAnswer={(val) => handleSelect(q.id, val)}
                  showResults={false}
                />
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!assessment.questions.every((q) => answers[q.id]) || submitting}
              className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-bold text-white transition-all hover:bg-primary/95 disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {submitting ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Trophy className="w-4 h-4" />
                  <span>Submit Quiz</span>
                </>
              )}
            </button>
          </div>
        )}

        {phase === "result" && report && (
          <div className="space-y-6 edsynapse-stagger">
            <div className="liquid-panel rounded-3xl p-6 text-center space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Diagnostic Quiz Result
                </span>
                <p className="text-4xl font-black text-foreground">{Math.round(report.score * 100)}%</p>
                <p className="text-sm font-bold text-primary capitalize">
                  {report.updated_status.level.replace(/_/g, " ")}
                </p>
              </div>
              <Markdown className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {report.updated_status.evidence}
              </Markdown>
            </div>

            <div className="space-y-4">
              {report.per_question.map((r, i) => {
                const q = assessment?.questions.find((q) => q.id === r.question_id);
                return (
                  <div
                    key={r.question_id}
                    className={cn(
                      "p-4 rounded-2xl border flex gap-3 items-start",
                      r.correct ? "border-emerald-200 bg-emerald-500/5" : "border-rose-200 bg-rose-500/5"
                    )}
                  >
                    {r.correct ? (
                      <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                    )}
                    <div className="space-y-1 text-xs">
                      <Markdown className="text-xs font-bold text-foreground">{q?.prompt ?? `Q${i + 1}`}</Markdown>
                      <p className="text-muted-foreground">
                        Your answer: <span className="font-semibold text-foreground">{r.student_response || "—"}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Correct answer: <span className="font-semibold text-foreground">{r.correct_answer}</span>
                      </p>
                      {r.rationale && <Markdown className="text-xs text-foreground/80 leading-relaxed mt-2">{r.rationale}</Markdown>}
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              href={`/student/class/${code}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-bold text-white transition-all hover:bg-primary/95 shadow-lg shadow-primary/20"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Study Workspace</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
