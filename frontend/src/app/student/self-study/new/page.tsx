"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import { FileUploadZone } from "@/components/ui/FileUploadZone";
import { studentApi } from "@/lib/edsynapseApi";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Brain,
  FileCheck,
} from "lucide-react";

interface ProposedTopic {
  id: string;
  title: string;
  confirmed: boolean;
}

export default function SelfStudySetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [subjectName, setSubjectName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [topics, setTopics] = useState<ProposedTopic[]>([]);
  const [lessonName, setLessonName] = useState("");
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseCode, setCourseCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [building, setBuilding] = useState(false);

  const handleFilesSelected = (newFiles: File[]) => setFiles((prev) => [...prev, ...newFiles]);
  const handleRemoveFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;
    setTopics((prev) => [...prev, { id: `t-${Date.now()}`, title: newTopicTitle.trim(), confirmed: true }]);
    setNewTopicTitle("");
  };

  const handleToggleTopic = (id: string) =>
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, confirmed: !t.confirmed } : t)));

  const handleDeleteTopic = (id: string) => setTopics((prev) => prev.filter((t) => t.id !== id));

  // Step 2 → 3: create the self-study course, upload material, extract topics.
  const runAnalysis = async () => {
    setStep(3);
    setError("");
    try {
      setAnalysisProgress("Creating your study space...");
      const { course } = await studentApi.createSelfStudy(subjectName.trim());
      setCourseId(course.id);
      setCourseCode(course.code);

      setAnalysisProgress("Uploading and reading your material...");
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      form.append("extractTopics", "true");

      setAnalysisProgress("Identifying key topics and structuring the curriculum...");
      const { topics: extracted } = await studentApi.addSource(course.id, form);

      const proposed: ProposedTopic[] =
        extracted.length > 0
          ? extracted.map((t, i) => ({ id: `t-${i}`, title: t, confirmed: true }))
          : [];
      setTopics(proposed);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      setStep(2);
    }
  };

  const handleStartLearning = async () => {
    if (!courseId || !courseCode) return;
    const confirmed = topics.filter((t) => t.confirmed).map((t) => t.title);
    setBuilding(true);
    setError("");
    try {
      await studentApi.addSelfStudyLesson(courseId, lessonName.trim() || "Lesson 1", confirmed);
      router.push(`/student/class/${courseCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build your space.");
      setBuilding(false);
    }
  };

  return (
    <AppShell role="student">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between border border-white/60 bg-white/40 backdrop-blur-md p-4 rounded-2xl">
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  step === num
                    ? "bg-primary text-white scale-110 shadow-md shadow-primary/20"
                    : step > num
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step > num ? <Check className="w-4 h-4" /> : num}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:inline ${
                  step === num ? "text-foreground font-bold" : "text-muted-foreground"
                }`}
              >
                {num === 1 && "Basic Info"}
                {num === 2 && "Upload Docs"}
                {num === 3 && "AI Analysis"}
                {num === 4 && "Review Topics"}
              </span>
            </div>
          ))}
        </div>

        <div className="liquid-panel rounded-3xl p-6 md:p-8 space-y-6">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 edsynapse-stagger">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground font-display">Create a Self-Study Space</h2>
                <p className="text-xs text-muted-foreground">
                  Give your learning space a name. This could be an exam name, topic, or course code.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. World History AP Review, Organic Chemistry Midterm"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-primary/15 bg-white/40 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 text-sm font-sans"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={!subjectName.trim()}
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-sm font-semibold active:scale-[0.98] transition-all hover:bg-primary/95 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span>Upload Documents</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 edsynapse-stagger">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground font-display">Feed the AI Tutor</h2>
                <p className="text-xs text-muted-foreground">
                  Upload textbooks, lectures, notes, or slides. EdSynapse generates a custom syllabus, flashcards,
                  visual map, and quizzes grounded in them.
                </p>
              </div>

              <FileUploadZone
                onFilesSelected={handleFilesSelected}
                selectedFiles={files}
                onRemoveFile={handleRemoveFile}
              />

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-white/40 transition-all border border-transparent hover:border-white/50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={files.length === 0}
                  onClick={runAnalysis}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-sm font-semibold active:scale-[0.98] transition-all hover:bg-primary/95 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span>Analyze Materials</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6 edsynapse-stagger text-center">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Brain className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground font-display">Analyzing Your Materials</h3>
                <p className="text-sm font-medium text-primary font-sans h-6">{analysisProgress}</p>
                <p className="text-xs text-muted-foreground">
                  EdSynapse is reading your files, embedding them for grounded answers, and extracting topics.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 edsynapse-stagger">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-bold text-foreground font-display">Review AI-Proposed Topics</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  The AI extracted these topics from your material. Check topics to include, remove ones you do not
                  need, or add custom topics.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Lesson name</label>
                <input
                  type="text"
                  placeholder="e.g. Lesson 1, Cell Biology Basics"
                  value={lessonName}
                  onChange={(e) => setLessonName(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-primary/15 bg-white/40 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 text-sm font-sans"
                />
                <p className="text-[11px] text-muted-foreground">
                  The confirmed topics below will live under this lesson.
                </p>
              </div>

              <form onSubmit={handleAddTopic} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom topic..."
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="flex-1 p-3 rounded-xl border border-primary/10 bg-white/40 focus:border-primary focus:bg-white text-xs"
                />
                <button
                  type="submit"
                  disabled={!newTopicTitle.trim()}
                  className="px-4 py-3 bg-primary text-white rounded-xl text-xs font-semibold flex items-center gap-1 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </form>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
                {topics.length === 0 && (
                  <p className="px-1 text-[11px] text-muted-foreground">
                    No topics were extracted. Add your own topics above to get started.
                  </p>
                )}
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-150 ${
                      topic.confirmed
                        ? "border-emerald-200 bg-emerald-500/5 text-foreground"
                        : "border-primary/10 bg-white/20 text-muted-foreground opacity-60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTopic(topic.id)}
                      className="flex items-center gap-3 flex-1 text-left min-w-0"
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                          topic.confirmed
                            ? "bg-emerald-500 border-emerald-600 text-white"
                            : "border-primary/20 bg-white"
                        }`}
                      >
                        {topic.confirmed && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-semibold truncate font-display">{topic.title}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTopic(topic.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-white/40 transition-all border border-transparent hover:border-white/50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={topics.filter((t) => t.confirmed).length === 0 || !lessonName.trim() || building}
                  onClick={handleStartLearning}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl text-sm font-semibold active:scale-[0.98] transition-all hover:brightness-110 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {building ? (
                    <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <span>Build Study Space</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
