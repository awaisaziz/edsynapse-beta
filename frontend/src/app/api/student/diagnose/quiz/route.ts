import { NextRequest, NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { queryOne } from "@/lib/db"
import { generateJSON, groundedContext, GROUNDING_RULE, QUIZ_AUTHORING_RULE, choicesAreDistinct } from "@/lib/llm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

interface GenQuestion {
  id: string
  topic: string
  prompt: string
  choices: { label: string; text: string }[]
  correct_label: string
  rationale: string
}

// Generate a diagnostic quiz grounded in the course material (if any).
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("student")
    const body = await req.json()
    const topics: string[] = Array.isArray(body.topics) ? body.topics.map(String) : []
    const courseId: string | null = body.course_id ?? null
    if (topics.length === 0) return NextResponse.json({ error: "At least one topic is required." }, { status: 400 })

    // Verify access to the course if one is provided.
    if (courseId) {
      const access = await queryOne(
        `SELECT 1 FROM courses c WHERE c.id = $1 AND (
            c.owner_id = $2 OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $2))`,
        [courseId, user.id],
      )
      if (!access) return NextResponse.json({ error: "No access to course" }, { status: 403 })
    }

    const { context, sources } = await groundedContext(courseId, topics.join(", "))
    // Cap grounding context to keep input tokens (and latency) down.
    const groundedSlice = context.slice(0, 8000)
    const system = [
      "You are an assessment designer creating a short diagnostic quiz to map a student's prior knowledge.",
      GROUNDING_RULE,
      QUIZ_AUTHORING_RULE,
      'Return JSON: {"questions":[{"id","topic","prompt","choices":[{"label":"A","text"}],"correct_label","rationale"}]}.',
      "Create 2 multiple-choice questions per topic, 4 choices each (labels A-D), varied difficulty.",
      groundedSlice ? `\n\nSOURCE MATERIAL:\n${groundedSlice}` : "\n\n(No source material; use accurate general knowledge.)",
    ].join("\n")
    const userPrompt = `Topics: ${topics.join(", ")}. Generate the diagnostic quiz now.`

    // Generate, then verify every question has distinct options. If the model
    // slipped in duplicate/overlapping choices, regenerate once with a stronger nudge.
    let result = await generateJSON<{ questions: GenQuestion[] }>(system, userPrompt, { maxTokens: 2000 })
    if (!(result.questions ?? []).every((q) => choicesAreDistinct(q.choices))) {
      result = await generateJSON<{ questions: GenQuestion[] }>(
        `${system}\n\nIMPORTANT: A previous attempt produced duplicate answer choices. Ensure all four options for every question are clearly different, with exactly one correct.`,
        userPrompt,
        { maxTokens: 2000 },
      )
    }
    return NextResponse.json({
      student_id: user.id,
      topics,
      course_id: courseId,
      questions: result.questions ?? [],
      grounded: sources.length > 0,
    })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] diagnose quiz error:", error)
    return NextResponse.json({ error: "Failed to generate diagnostic." }, { status: 500 })
  }
}
