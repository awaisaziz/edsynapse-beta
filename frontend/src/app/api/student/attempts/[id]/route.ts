import { NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { queryOne } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface StoredQuestion {
  id: string
  topic?: string
  type: "mcq" | "short_answer"
  prompt: string
  choices?: { label: string; text: string }[]
  correct_label?: string
  model_answer?: string
  rationale: string
}

interface StoredReport {
  question_id: string
  correct: boolean
  rationale: string
}

// Returns a single past attempt fully reconstructed for review: each question
// with its options, the student's pick, the correct answer, and the AI rationale
// explaining why. MCQ correctness is deterministic; short-answer correctness is
// pulled from the graded report stored at submit time.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser("student")
    const { id } = await params

    const row = await queryOne<{
      id: string
      topic: string
      score: number
      total: number
      created_at: string
      questions: StoredQuestion[]
      answers: { question_id: string; response: string }[]
      report: StoredReport[]
    }>(
      `SELECT id, topic, score, total, created_at, questions, answers, report
         FROM quiz_attempts
        WHERE id = $1 AND student_id = $2`,
      [id, user.id],
    )

    if (!row) return NextResponse.json({ error: "Attempt not found." }, { status: 404 })

    const answerMap = new Map((row.answers ?? []).map((a) => [a.question_id, a.response ?? ""]))
    const reportMap = new Map((row.report ?? []).map((r) => [r.question_id, r]))

    const review = (row.questions ?? []).map((q) => {
      const response = answerMap.get(q.id) ?? ""
      const rep = reportMap.get(q.id)
      if (q.type === "mcq" && q.choices) {
        const options = q.choices.map((c) => `${c.label}. ${c.text}`)
        const selectedIndex = q.choices.findIndex((c) => c.label === response)
        const correctIndex = q.choices.findIndex((c) => c.label === q.correct_label)
        return {
          question_id: q.id,
          topic: q.topic ?? row.topic,
          type: "mcq" as const,
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
        type: "short_answer" as const,
        prompt: q.prompt,
        options: [] as string[],
        selectedIndex: -1,
        correctIndex: -1,
        studentResponse: response,
        correctAnswer: q.model_answer ?? "",
        correct: rep?.correct ?? null,
        rationale: rep?.rationale || q.rationale,
      }
    })

    return NextResponse.json({
      id: row.id,
      topic: row.topic,
      score: row.score,
      total: row.total,
      created_at: row.created_at,
      review,
    })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] attempt detail error:", error)
    return NextResponse.json({ error: "Failed to load attempt." }, { status: 500 })
  }
}
