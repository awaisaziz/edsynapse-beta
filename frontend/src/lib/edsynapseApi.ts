/**
 * EdSynapse — typed client for the Next.js API routes (same-origin /api/*).
 *
 * Identity is derived server-side from the session cookie. The client never
 * passes student_id / teacher_id; the backend resolves the signed-in user.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    credentials: "include",
  });
  if (!res.ok) throw new Error((await safeError(res)) || `Request failed (${res.status})`);
  return res.json();
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    credentials: "include",
  });
  if (!res.ok) throw new Error((await safeError(res)) || `Request failed (${res.status})`);
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error((await safeError(res)) || `Request failed (${res.status})`);
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { credentials: "include" });
  if (!res.ok) throw new Error((await safeError(res)) || `Request failed (${res.status})`);
  return res.json();
}

async function postForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { method: "POST", body: form, credentials: "include" });
  if (!res.ok) throw new Error((await safeError(res)) || `Request failed (${res.status})`);
  return res.json();
}

async function safeError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error ?? "";
  } catch {
    return "";
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TopicStatus {
  topic: string;
  level: "strong" | "moderate" | "needs_improvement";
  evidence: string;
}

export interface StrengthsGaps {
  student_id: string;
  topics: TopicStatus[];
  overall_mastery: number;
}

export interface DiagnosticQuestion {
  id: string;
  topic: string;
  prompt: string;
  choices: { label: string; text: string }[];
  correct_label: string;
  rationale: string;
}

export interface DiagnosticQuiz {
  topics: string[];
  questions: DiagnosticQuestion[];
}

export interface SmartNotes {
  topic: string;
  summary: string;
  sections: { heading: string; content: string; subsections?: unknown[] }[];
  key_concepts: string[];
  sources: { title: string; locator: string; text: string }[];
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardsResponse {
  topic: string;
  flashcards: Flashcard[];
}

export interface Podcast {
  script: string;
}

export interface StudyMaterialVersion {
  version: number;
  notes: { summary: string; sections: { heading: string; content: string }[]; key_concepts: string[] };
  flashcards: Flashcard[];
  podcast: Podcast;
  quizAttemptId: string | null;
  createdAt: string;
}

export interface StudyMaterialsResponse {
  topic: string;
  latest: StudyMaterialVersion;
  versions: StudyMaterialVersion[];
}

export interface AssessmentQuestion {
  id: string;
  topic: string;
  type: "mcq" | "short_answer";
  prompt: string;
  choices?: { label: string; text: string }[] | null;
  correct_label?: string | null;
  model_answer?: string | null;
  rationale: string;
}

export interface Assessment {
  id: string;
  topic: string;
  questions: AssessmentQuestion[];
}

export interface GradeReport {
  assessment_id: string;
  topic: string;
  score: number;
  correct: number;
  total: number;
  per_question: {
    question_id: string;
    correct: boolean;
    student_response: string;
    correct_answer: string;
    rationale: string;
  }[];
  updated_status: TopicStatus;
  knowledge_map: StrengthsGaps;
}

export interface AttemptReviewItem {
  question_id: string;
  topic: string;
  type: "mcq" | "short_answer";
  prompt: string;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  studentResponse: string;
  correctAnswer: string;
  correct: boolean | null;
  rationale: string;
}

export interface AttemptDetail {
  id: string;
  topic: string;
  score: number;
  total: number;
  created_at: string;
  review: AttemptReviewItem[];
}

export interface AttemptSummary {
  id: string;
  topic: string;
  kind: string;
  score: number;
  total: number;
  created_at: string;
}

// A teacher/TA's read-only view of one student's record within a course.
export interface StudentRecord {
  student: { id: string; name: string; email: string };
  attempts: AttemptSummary[];
  strong: string[];
  moderate: string[];
  weak: string[];
}

export interface LearningProfile {
  modality: "visual" | "text" | "audio";
  pace: "deep" | "methodical";
}

export interface CourseMaterial {
  id: string;
  name: string;
  type: string;
  published: boolean;
}

export interface CourseLesson {
  id: string;
  lesson: number;
  title: string;
  outline: string[];
  materials: CourseMaterial[];
  published: boolean;
  // Per-student mastery of this lesson's topics (0–100) and how many topics the
  // student has been assessed on. Populated on student-facing course payloads;
  // 0 on teacher payloads.
  progress: number;
  topicsAttempted: number;
}

/** Mirrors the server-side SerializedCourse shape (src/lib/courses.ts). */
export interface Course {
  id: string;
  name: string;
  subject: string;
  description: string;
  code: string;
  color: string;
  kind: "class" | "self_study";
  archived: boolean;
  studentCount: number;
  avgProgress: number;
  activeToday: number;
  lastUpdated: string;
  lessons: CourseLesson[];
}

/** Ingested source returned by the upload endpoint. */
export interface IngestedSource {
  id: string;
  title: string;
  type: string;
  chunks: number;
}

// ── Student API ──────────────────────────────────────────────────────────────

export const studentApi = {
  listCourses: () => get<{ courses: Course[] }>("/student/courses"),

  joinClass: (code: string) => post<{ course: Course }>("/student/courses/join", { code }),

  getCourseByCode: (code: string) => get<{ course: Course }>(`/student/courses/by-code/${encodeURIComponent(code)}`),

  createSelfStudy: (name: string, topics: string[] = []) =>
    post<{ course: Course }>("/student/courses", { name, topics }),

  addSelfStudyLesson: (courseId: string, title: string, outline: string[] = []) =>
    post<{ course: Course; lessonId: string }>(`/student/courses/${courseId}/lessons`, { title, outline }),

  deleteSelfStudyLesson: (courseId: string, lessonId: string) =>
    del<{ course: Course }>(`/student/courses/${courseId}/lessons/${lessonId}`),

  // Confirm the topic outline a student reviewed/edited after uploading material.
  setSelfStudyLessonTopics: (courseId: string, lessonId: string, outline: string[]) =>
    patch<{ course: Course }>(`/student/courses/${courseId}/lessons/${lessonId}`, { outline }),

  // Recolor/rename a self-study space, or archive/unarchive any of the student's
  // courses (per-enrollment for classes).
  updateCourse: (
    courseId: string,
    patchBody: { name?: string; color?: string; archived?: boolean },
  ) => patch<{ course: Course }>(`/student/courses/${courseId}`, patchBody),

  // Delete a personal self-study space and all its content.
  deleteCourse: (courseId: string) => del<{ ok: true }>(`/student/courses/${courseId}`),

  addSource: (courseId: string, form: FormData) =>
    postForm<{ sources: IngestedSource[]; topics: string[] }>(`/courses/${courseId}/sources`, form),

  deleteSource: (courseId: string, sourceId: string) =>
    del<{ ok: true }>(`/courses/${courseId}/sources/${sourceId}`),

  // All uploaded source material for a course (Course tab).
  listSources: (courseId: string) =>
    get<{ sources: { id: string; title: string; type: string; lesson_id: string | null }[] }>(
      `/courses/${courseId}/sources`,
    ),

  // Extracted text of a single uploaded source, for preview.
  getSource: (courseId: string, sourceId: string) =>
    get<{ source: { id: string; title: string; type: string; content: string } }>(
      `/courses/${courseId}/sources/${sourceId}`,
    ),

  // URL that serves the source back in its original uploaded format.
  sourceDownloadUrl: (courseId: string, sourceId: string, inline = false) =>
    `${BASE}/api/courses/${courseId}/sources/${sourceId}/download${inline ? "?inline=1" : ""}`,

  // Link an already-uploaded course source to a lesson; returns candidate topics
  // to review (same flow as a fresh local upload).
  attachSourceToLesson: (courseId: string, sourceId: string, lessonId: string) =>
    post<{ topics: string[] }>(`/courses/${courseId}/sources/${sourceId}/attach`, { lessonId }),

  diagnoseQuiz: (courseId: string, topics: string[], weakTopics: string[] = []) =>
    post<DiagnosticQuiz>("/student/diagnose/quiz", { course_id: courseId, topics, weak_topics: weakTopics }),

  diagnoseEvaluate: (
    courseId: string,
    topics: string[],
    questions: DiagnosticQuestion[],
    answers: { question_id: string; selected_label: string }[],
  ) => post<StrengthsGaps>("/student/diagnose/evaluate", { course_id: courseId, topics, questions, answers }),

  getStrengthsGaps: (courseId?: string) =>
    get<StrengthsGaps>(`/student/strengths-gaps${courseId ? `?course_id=${courseId}` : ""}`),

  generateNotes: (courseId: string, topic: string) =>
    post<SmartNotes>("/student/notes", { course_id: courseId, topic }),

  generateFlashcards: (courseId: string, topic: string) =>
    post<FlashcardsResponse>("/student/flashcards", { course_id: courseId, topic }),

  getStudyMaterialVersions: (courseId: string, topic: string) =>
    get<{ topic: string; versions: StudyMaterialVersion[] }>(
      `/student/materials?course_id=${encodeURIComponent(courseId)}&topic=${encodeURIComponent(topic)}`,
    ),

  getOrGenerateMaterials: (courseId: string, topic: string) =>
    post<StudyMaterialsResponse>("/student/materials", { course_id: courseId, topic }),

  createAssessment: (courseId: string, topic: string) =>
    post<Assessment>("/student/assess", { course_id: courseId, topic }),

  // Comprehensive assessment spanning every supplied topic.
  createComprehensiveAssessment: (courseId: string, topics: string[]) =>
    post<Assessment>("/student/assess", { course_id: courseId, topics }),

  gradeAssessment: (
    assessmentId: string,
    courseId: string,
    topic: string,
    questions: AssessmentQuestion[],
    answers: { question_id: string; response: string }[],
  ) =>
    post<GradeReport>("/student/assess/grade", {
      assessment_id: assessmentId,
      course_id: courseId,
      topic,
      questions,
      answers,
    }),

  listAttempts: () =>
    get<{ attempts: { id: string; course_id: string; topic: string; kind: string; score: number; total: number; created_at: string }[] }>(
      "/student/attempts",
    ),

  getAttempt: (id: string) => get<AttemptDetail>(`/student/attempts/${encodeURIComponent(id)}`),

  // Persisted right-panel tutor chat for a course+topic.
  getTutorHistory: (courseId: string, topic: string) =>
    get<{ messages: { role: "user" | "assistant"; content: string }[] }>(
      `/student/tutor/history?course_id=${encodeURIComponent(courseId)}&topic=${encodeURIComponent(topic)}`,
    ),

  clearTutorHistory: (courseId: string, topic: string) =>
    del<{ ok: boolean }>(
      `/student/tutor/history?course_id=${encodeURIComponent(courseId)}&topic=${encodeURIComponent(topic)}`,
    ),

  async *tutorStreamFetch(
    courseId: string,
    topic: string,
    message: string,
    history: { role: "user" | "assistant"; content: string }[] = [],
    profile: LearningProfile = { modality: "text", pace: "methodical" },
    signal?: AbortSignal,
    // Optional storage key, distinct from the human-readable `topic`. Surfaces
    // like the course-wide Chat tab pass a sentinel here so their persisted
    // history is separate while `topic` still drives retrieval + the prompt.
    topicKey?: string,
  ): AsyncGenerator<{ type: string; [k: string]: unknown }> {
    const res = await fetch(`${BASE}/api/student/tutor/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, topic, message, history, profile, topic_key: topicKey ?? topic }),
      credentials: "include",
      signal,
    });
    if (!res.ok) throw new Error(`Tutor stream failed: ${res.status}`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            yield JSON.parse(line.slice(6));
          } catch {}
        }
      }
    }
  },

  async *socraticStreamFetch(
    courseId: string,
    topic: string,
    message: string,
    history: { role: "user" | "assistant"; content: string }[] = [],
    profile: LearningProfile = { modality: "text", pace: "methodical" },
    signal?: AbortSignal,
    topicKey?: string,
  ): AsyncGenerator<{ type: string; [k: string]: unknown }> {
    const res = await fetch(`${BASE}/api/student/socratic/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, topic, message, history, profile, topic_key: topicKey ?? topic }),
      credentials: "include",
      signal,
    });
    if (!res.ok) throw new Error(`Socratic stream failed: ${res.status}`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            yield JSON.parse(line.slice(6));
          } catch {}
        }
      }
    }
  },

  // ── Saved conversation threads (Chat + Discussion tabs) ──────────────────────
  listConversations: (courseId: string, surface: "chat" | "tutor" | "socratic" | "discussion") =>
    get<{ threads: { topic: string; title: string; updatedAt: string; preview: string }[] }>(
      `/student/conversations?course_id=${encodeURIComponent(courseId)}&surface=${surface}`,
    ),

  createConversation: (courseId: string, surface: "chat" | "tutor" | "socratic" | "discussion", title?: string) =>
    post<{ thread: { topic: string; title: string; updatedAt: string; preview: string } }>("/student/conversations", {
      course_id: courseId,
      surface,
      title,
    }),


  renameConversation: (courseId: string, topic: string, title: string) =>
    patch<{ ok: boolean }>("/student/conversations", { course_id: courseId, topic, title }),

  deleteConversation: (courseId: string, topic: string) =>
    del<{ ok: boolean }>(
      `/student/conversations?course_id=${encodeURIComponent(courseId)}&topic=${encodeURIComponent(topic)}`,
    ),
};

// ── Teacher API ───────────────────────────────────────────────────────────────

export interface CourseAnalytics {
  course_id: string;
  students: {
    id: string;
    name: string;
    email: string;
    attempts: number;
    avgScore: number | null;
    lastActive: string | null;
  }[];
  topics: { topic: string; level: string; n: string }[];
}

export const teacherApi = {
  listCourses: () => get<{ courses: Course[] }>("/teacher/courses"),

  createCourse: (name: string, subject = "", description = "") =>
    post<{ course: Course }>("/teacher/courses", { name, subject, description }),

  getCourse: (courseId: string) => get<{ course: Course }>(`/teacher/courses/${courseId}`),

  updateCourse: (
    courseId: string,
    patchBody: { name?: string; description?: string; subject?: string; color?: string; archived?: boolean },
  ) => patch<{ course: Course }>(`/teacher/courses/${courseId}`, patchBody),

  deleteCourse: (courseId: string) => del<{ ok: true }>(`/teacher/courses/${courseId}`),

  addLesson: (courseId: string, title: string, outline: string[] = [], published = false) =>
    post<{ course: Course; lessonId: string }>(`/teacher/courses/${courseId}/lessons`, {
      title,
      outline,
      published,
    }),

  updateLesson: (
    courseId: string,
    lessonId: string,
    patchBody: { title?: string; outline?: string[]; published?: boolean },
  ) => patch<{ course: Course }>(`/teacher/courses/${courseId}/lessons`, { lessonId, ...patchBody }),

  deleteLesson: (courseId: string, lessonId: string) =>
    del<{ course: Course }>(`/teacher/courses/${courseId}/lessons?lessonId=${lessonId}`),

  addSource: (courseId: string, form: FormData) =>
    postForm<{ sources: IngestedSource[]; topics: string[] }>(`/courses/${courseId}/sources`, form),

  // Publish/unpublish an uploaded material: controls whether students see it and
  // whether the tutor grounds on it.
  setSourcePublished: (courseId: string, sourceId: string, published: boolean) =>
    patch<{ source: { id: string; published: boolean } }>(
      `/courses/${courseId}/sources/${sourceId}`,
      { published },
    ),

  deleteSource: (courseId: string, sourceId: string) =>
    del<{ ok: true }>(`/courses/${courseId}/sources/${sourceId}`),

  getAnalytics: (courseId: string) => get<CourseAnalytics>(`/teacher/courses/${courseId}/analytics`),

  // Read-only record of one enrolled student: attempt history + per-topic mastery.
  getStudentRecord: (courseId: string, studentId: string) =>
    get<StudentRecord>(`/teacher/courses/${courseId}/students/${studentId}`),

  // Read-only reconstruction of one of that student's attempts (questions, their
  // answers, correct answers, rationale).
  getStudentAttempt: (courseId: string, studentId: string, attemptId: string) =>
    get<AttemptDetail>(`/teacher/courses/${courseId}/students/${studentId}/attempts/${attemptId}`),

  // Unenroll a student from the course entirely. Owner-only action.
  removeStudent: (courseId: string, studentId: string) =>
    del<{ ok: true }>(`/teacher/courses/${courseId}/students/${studentId}`),
};

// ── Discussion board (shared by teacher + student) ───────────────────────────

export type DiscussionVisibility = "public" | "private";
export type DiscussionAuthorRole = "teacher" | "student";
export type CourseRole = "owner" | "student" | "none";

export interface DiscussionAuthor {
  id: string;
  name: string;
  initials: string;
  role: DiscussionAuthorRole;
}

export interface DiscussionThread {
  id: string;
  title: string;
  body: string;
  visibility: DiscussionVisibility;
  createdAt: string;
  updatedAt: string;
  author: DiscussionAuthor;
  replyCount: number;
  recipient?: { id: string; name: string } | null;
  isAnonymous?: boolean;
}

export interface DiscussionPost {
  id: string;
  body: string;
  createdAt: string;
  author: DiscussionAuthor;
  anonymous?: boolean;
  upvoteCount?: number;
  upvotedByMe?: boolean;
}

export interface DiscussionDetail extends DiscussionThread {
  posts: DiscussionPost[];
}

export const discussionApi = {
  list: (courseId: string) =>
    get<{ threads: DiscussionThread[]; role: CourseRole }>(`/courses/${courseId}/discussions`),

  create: (courseId: string, input: { title: string; body: string; visibility: DiscussionVisibility; recipientId?: string | null; anonymous?: boolean }) =>
    post<{ thread: DiscussionDetail }>(`/courses/${courseId}/discussions`, input),

  get: (courseId: string, discussionId: string) =>
    get<{ thread: DiscussionDetail }>(`/courses/${courseId}/discussions/${discussionId}`),

  reply: (courseId: string, discussionId: string, body: string, anonymous?: boolean) =>
    post<{ thread: DiscussionDetail }>(`/courses/${courseId}/discussions/${discussionId}`, { body, anonymous }),

  update: (courseId: string, discussionId: string, input: { title?: string; body?: string; visibility?: DiscussionVisibility }) =>
    patch<{ thread: DiscussionDetail }>(`/courses/${courseId}/discussions/${discussionId}`, input),

  delete: (courseId: string, discussionId: string) =>
    del<{ deleted: boolean }>(`/courses/${courseId}/discussions/${discussionId}`),

  updateReply: (courseId: string, discussionId: string, postId: string, body: string) =>
    patch<{ thread: DiscussionDetail }>(`/courses/${courseId}/discussions/${discussionId}`, { postId, body }),

  deleteReply: (courseId: string, discussionId: string, postId: string) =>
    del<{ thread: DiscussionDetail }>(`/courses/${courseId}/discussions/${discussionId}?postId=${encodeURIComponent(postId)}`),

  upvoteReply: (courseId: string, discussionId: string, postId: string) =>
    patch<{ thread: DiscussionDetail }>(`/courses/${courseId}/discussions/${discussionId}`, { upvotePostId: postId }),
};
