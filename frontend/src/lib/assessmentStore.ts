// Client-side cache for a freshly graded assessment report.
//
// The server persists every attempt (see GET /api/student/attempts) with a
// score/total, which powers the attempt-history list. The full per-question
// GradeReport, however, is only returned once at grading time — so we stash it
// in sessionStorage keyed by attempt id and read it back on the results page.

import type { GradeReport, AssessmentQuestion } from "@/lib/edsynapseApi";

export interface CachedReport {
  id: string;
  code: string;
  courseId: string;
  topic: string;
  date: string;
  report: GradeReport;
  questions: AssessmentQuestion[];
}

const key = (id: string) => `edsynapse_report_${id}`;

export function cacheReport(input: {
  code: string;
  courseId: string;
  topic: string;
  report: GradeReport;
  questions: AssessmentQuestion[];
}): CachedReport {
  const cached: CachedReport = {
    id: `att_${Date.now().toString(36)}`,
    code: input.code,
    courseId: input.courseId,
    topic: input.topic,
    date: new Date().toISOString(),
    report: input.report,
    questions: input.questions,
  };
  try {
    sessionStorage.setItem(key(cached.id), JSON.stringify(cached));
  } catch {
    /* storage unavailable */
  }
  return cached;
}

export function readReport(id: string): CachedReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key(id));
    return raw ? (JSON.parse(raw) as CachedReport) : null;
  } catch {
    return null;
  }
}
