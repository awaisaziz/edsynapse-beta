import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireUser, AuthError } from "@/lib/auth"
import { query } from "@/lib/db"
import { generateJSON } from "@/lib/llm"
import { upsertKnowledgeState, getKnowledgeMap, scoreToLevel } from "@/lib/knowledge"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

interface Q {
  id: string
  topic: string
  type: "mcq" | "short_answer"
  prompt: string
  choices?: { label: string; text: string }[]
  correct_label?: string
  model_answer?: string
  rationale: string
}

// Grade a submitted assessment, update the knowledge map, record the attempt.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("student")
    const body = await req.json()
    const assessmentId = String(body.assessment_id ?? `asm_${nanoid(10)}`)
    const topic = String(body.topic ?? "")
    const courseId: string | null = body.course_id ?? null
    const questions: Q[] = Array.isArray(body.questions) ? body.questions : []
    const answers: { question_id: string; response: string }[] = Array.isArray(body.answers) ? body.answers : []
    const answerMap = new Map(answers.map((a) => [a.question_id, a.response ?? ""]))

    const perQuestion: {
      question_id: string
      topic: string
      correct: boolean
      student_response: string
      correct_answer: string
      rationale: string
    }[] = []

    // Collect short answers for a single AI grading call.
    const shortAnswers = questions
      .filter((q) => q.type === "short_answer")
      .map((q) => ({ id: q.id, prompt: q.prompt, model_answer: q.model_answer ?? "", response: answerMap.get(q.id) ?? "" }))

    let saGrades: Record<string, { correct: boolean; feedback: string }> = {}
    if (shortAnswers.length > 0) {
      const system = [
        "You are a fair grader. For each short answer, decide if it demonstrates correct understanding.",
        'Return JSON: {"grades":{"<id>":{"correct":boolean,"feedback":string}}}. Be encouraging but accurate.',
      ].join("\n")
      const graded = await generateJSON<{ grades: Record<string, { correct: boolean; feedback: string }> }>(
        system,
        JSON.stringify(shortAnswers),
      )
      saGrades = graded.grades ?? {}
    }

    for (const q of questions) {
      const response = answerMap.get(q.id) ?? ""
      if (q.type === "mcq") {
        const correct = response === q.correct_label
        const correctText = q.choices?.find((c) => c.label === q.correct_label)
        perQuestion.push({
          question_id: q.id,
          topic: q.topic || topic,
          correct,
          student_response: q.choices?.find((c) => c.label === response)?.text ?? response,
          correct_answer: correctText ? `${correctText.label}. ${correctText.text}` : (q.correct_label ?? ""),
          rationale: q.rationale,
        })
      } else {
        const g = saGrades[q.id] ?? { correct: false, feedback: q.rationale }
        perQuestion.push({
          question_id: q.id,
          topic: q.topic || topic,
          correct: g.correct,
          student_response: response,
          correct_answer: q.model_answer ?? "",
          rationale: g.feedback || q.rationale,
        })
      }
    }

    const correctCount = perQuestion.filter((p) => p.correct).length
    const total = perQuestion.length
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0
    const level = scoreToLevel(pct)

    // Update the knowledge map per real topic. For a single-topic assessment this
    // is one upsert; for a comprehensive (all-topics) assessment each covered
    // topic is scored from its own questions so the map stays accurate.
    const byTopic = new Map<string, { correct: number; total: number }>()
    for (const p of perQuestion) {
      const t = p.topic || topic
      if (!t) continue
      const agg = byTopic.get(t) ?? { correct: 0, total: 0 }
      agg.total += 1
      if (p.correct) agg.correct += 1
      byTopic.set(t, agg)
    }
    for (const [t, agg] of byTopic) {
      const tPct = agg.total > 0 ? Math.round((agg.correct / agg.total) * 100) : 0
      await upsertKnowledgeState({
        studentId: user.id,
        courseId,
        topic: t,
        level: scoreToLevel(tPct),
        evidence: `Assessment: ${agg.correct}/${agg.total} correct (${tPct}%).`,
      })
    }

    await query(
      `INSERT INTO quiz_attempts (id, student_id, course_id, topic, kind, score, total, questions, answers, report)
       VALUES ($1, $2, $3, $4, 'assessment', $5, $6, $7::jsonb, $8::jsonb, $9::jsonb)`,
      [`qa_${nanoid(14)}`, user.id, courseId, topic, correctCount, total, JSON.stringify(questions), JSON.stringify(answers), JSON.stringify(perQuestion)],
    )

    const map = await getKnowledgeMap(user.id, courseId)
    return NextResponse.json({
      assessment_id: assessmentId,
      topic,
      student_id: user.id,
      score: pct,
      correct: correctCount,
      total,
      per_question: perQuestion,
      updated_status: { topic, level, evidence: `${correctCount}/${total} correct.` },
      knowledge_map: map,
    })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] grade error:", error)
    return NextResponse.json({ error: "Failed to grade assessment." }, { status: 500 })
  }
}
