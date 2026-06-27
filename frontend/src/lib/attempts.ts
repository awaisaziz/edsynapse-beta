/**
 * Shared transform: reconstruct a stored quiz_attempt into a read-only review —
 * each question with its options, the student's pick, the correct answer, and the
 * AI rationale. Used by the student's own report route and the teacher's
 * read-only view of a student's attempt. SERVER ONLY (pure, but lives with db code).
 */

export interface StoredQuestion {
  id: string
  topic?: string
  type: "mcq" | "short_answer"
  prompt: string
  choices?: { label: string; text: string }[]
  correct_label?: string
  model_answer?: string
  rationale: string
}

interface StoredReportItem {
  question_id: string
  correct: boolean
  rationale: string
}

export interface AttemptRow {
  id: string
  topic: string
  score: number
  total: number
  created_at: string
  questions: StoredQuestion[]
  answers: { question_id: string; response?: string; selected_label?: string }[]
  report: StoredReportItem[]
}

export interface ReviewItem {
  question_id: string
  topic: string
  type: "mcq" | "short_answer"
  prompt: string
  options: string[]
  selectedIndex: number
  correctIndex: number
  studentResponse: string
  correctAnswer: string
  correct: boolean | null
  rationale: string
}

export interface AttemptReview {
  id: string
  topic: string
  score: number
  total: number
  created_at: string
  review: ReviewItem[]
}

export function serializeAttemptReview(row: AttemptRow): AttemptReview {
  const answerMap = new Map((row.answers ?? []).map((a) => [a.question_id, a.response ?? a.selected_label ?? ""]))
  const reportMap = new Map((row.report ?? []).map((r) => [r.question_id, r]))

  const review: ReviewItem[] = (row.questions ?? []).map((q) => {
    const response = answerMap.get(q.id) ?? ""
    const rep = reportMap.get(q.id)
    if ((q.type === "mcq" || (!q.type && q.choices)) && q.choices) {
      const options = q.choices.map((c) => `${c.label}. ${c.text}`)
      const selectedIndex = q.choices.findIndex((c) => c.label === response)
      const correctIndex = q.choices.findIndex((c) => c.label === q.correct_label)
      return {
        question_id: q.id,
        topic: q.topic ?? row.topic,
        type: "mcq",
        prompt: q.prompt,
        options,
        selectedIndex,
        correctIndex,
        studentResponse: selectedIndex >= 0 ? options[selectedIndex] : "",
        correctAnswer: correctIndex >= 0 ? options[correctIndex] : (q.correct_label ?? ""),
        correct: response === q.correct_label,
        rationale: rep?.rationale || q.rationale,
      }
    }
    return {
      question_id: q.id,
      topic: q.topic ?? row.topic,
      type: "short_answer",
      prompt: q.prompt,
      options: [],
      selectedIndex: -1,
      correctIndex: -1,
      studentResponse: response,
      correctAnswer: q.model_answer ?? "",
      correct: rep?.correct ?? null,
      rationale: rep?.rationale || q.rationale,
    }
  })

  return { id: row.id, topic: row.topic, score: row.score, total: row.total, created_at: row.created_at, review }
}
