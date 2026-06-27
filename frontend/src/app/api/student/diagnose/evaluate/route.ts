import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireUser, AuthError } from "@/lib/auth"
import { query } from "@/lib/db"
import { upsertKnowledgeState, getKnowledgeMap, scoreToLevel } from "@/lib/knowledge"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface IncomingQuestion {
  id: string
  topic: string
  prompt: string
  choices: { label: string; text: string }[]
  correct_label: string
  rationale: string
}

// Evaluate diagnostic answers, update the knowledge map, record the attempt.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("student")
    const body = await req.json()
    const courseId: string | null = body.course_id ?? null
    const questions: IncomingQuestion[] = Array.isArray(body.questions) ? body.questions : []
    const answers: { question_id: string; selected_label: string }[] = Array.isArray(body.answers) ? body.answers : []

    const answerMap = new Map(answers.map((a) => [a.question_id, a.selected_label]))

    // Tally correctness per topic.
    const perTopic = new Map<string, { correct: number; total: number; evidence: string }>()
    for (const q of questions) {
      const t = perTopic.get(q.topic) ?? { correct: 0, total: 0, evidence: q.rationale }
      t.total += 1
      if (answerMap.get(q.id) === q.correct_label) t.correct += 1
      perTopic.set(q.topic, t)
    }

    for (const [topic, t] of perTopic) {
      const pct = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0
      await upsertKnowledgeState({
        studentId: user.id,
        courseId,
        topic,
        level: scoreToLevel(pct),
        evidence: `Diagnostic: ${t.correct}/${t.total} correct.`,
      })
    }

    const totalCorrect = [...perTopic.values()].reduce((s, t) => s + t.correct, 0)
    const totalQ = [...perTopic.values()].reduce((s, t) => s + t.total, 0)
    await query(
      `INSERT INTO quiz_attempts (id, student_id, course_id, topic, kind, score, total, questions, answers)
       VALUES ($1, $2, $3, $4, 'diagnostic', $5, $6, $7::jsonb, $8::jsonb)`,
      [
        `qa_${nanoid(14)}`,
        user.id,
        courseId,
        [...perTopic.keys()].join(", ").slice(0, 200),
        totalCorrect,
        totalQ,
        JSON.stringify(questions),
        JSON.stringify(answers),
      ],
    )

    const map = await getKnowledgeMap(user.id, courseId)
    return NextResponse.json({ student_id: user.id, ...map })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] diagnose evaluate error:", error)
    return NextResponse.json({ error: "Failed to evaluate diagnostic." }, { status: 500 })
  }
}
