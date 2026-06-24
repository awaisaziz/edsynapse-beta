import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireUser, AuthError } from "@/lib/auth"
import { generateJSON, groundedContext, GROUNDING_RULE, QUIZ_AUTHORING_RULE, choicesAreDistinct } from "@/lib/llm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

interface GenAssessmentQuestion {
  id: string
  topic: string
  type: "mcq" | "short_answer"
  prompt: string
  choices?: { label: string; text: string }[]
  correct_label?: string
  model_answer?: string
  rationale: string
}

// Generate a grounded assessment for a topic (mix of MCQ + short answer).
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("student")
    const body = await req.json()
    const courseId: string | null = body.course_id ?? null

    // A comprehensive assessment spans many topics; a standard one targets a single
    // topic. `topics` (plural) marks the comprehensive case.
    const topicList: string[] = Array.isArray(body.topics)
      ? body.topics.map((t: unknown) => String(t).trim()).filter(Boolean)
      : []
    const comprehensive = topicList.length > 1
    const topic = comprehensive ? "Comprehensive Review" : String(body.topic ?? topicList[0] ?? "").trim()
    if (!topic) return NextResponse.json({ error: "Topic is required." }, { status: 400 })

    let context = ""
    let sourceCount = 0
    if (comprehensive) {
      // Pull grounded context for each covered topic, capped to keep the prompt sane.
      const perTopic = await Promise.all(
        topicList.slice(0, 8).map((t) => groundedContext(courseId, t)),
      )
      context = perTopic
        .map((r, i) => (r.context ? `## ${topicList[i]}\n${r.context}` : ""))
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 12000)
      sourceCount = perTopic.reduce((n, r) => n + r.sources.length, 0)
    } else {
      const r = await groundedContext(courseId, topic)
      context = r.context
      sourceCount = r.sources.length
    }

    const system = [
      "You are an assessment designer. Create a balanced formal assessment to verify understanding.",
      GROUNDING_RULE,
      QUIZ_AUTHORING_RULE,
      'Return JSON: {"questions":[{"id","topic","type":"mcq"|"short_answer","prompt","choices":[{"label","text"}],"correct_label","model_answer","rationale"}]}.',
      comprehensive
        ? `Create 10 questions spanning ALL of these topics (set each question's "topic" to the specific one it covers): ${topicList.join(", ")}. Use ~7 MCQ (4 choices, labels A-D, with correct_label) and ~3 short_answer (with model_answer). Always include rationale.`
        : `Create 6 questions: 4 MCQ (4 choices, labels A-D, with correct_label) and 2 short_answer (with model_answer). Set each question's "topic" to "${topic}". Always include rationale.`,
      context ? `\n\nSOURCE MATERIAL:\n${context}` : "\n\n(No source material; use accurate general knowledge.)",
    ].join("\n")

    const userPrompt = comprehensive
      ? `Topics: ${topicList.join(", ")}. Generate the comprehensive assessment now.`
      : `Topic: ${topic}. Generate the assessment now.`

    // Generate, then verify every MCQ has distinct options; regenerate once if not.
    let result = await generateJSON<{ questions: GenAssessmentQuestion[] }>(system, userPrompt)
    if (!(result.questions ?? []).every((q) => choicesAreDistinct(q.choices))) {
      result = await generateJSON<{ questions: GenAssessmentQuestion[] }>(
        `${system}\n\nIMPORTANT: A previous attempt produced duplicate answer choices. Ensure all four options for every MCQ are clearly different, with exactly one correct.`,
        userPrompt,
      )
    }
    return NextResponse.json({
      id: `asm_${nanoid(14)}`,
      topic,
      student_id: user.id,
      course_id: courseId,
      questions: result.questions ?? [],
      grounded: sourceCount > 0,
    })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] assessment generate error:", error)
    return NextResponse.json({ error: "Failed to generate assessment." }, { status: 500 })
  }
}
