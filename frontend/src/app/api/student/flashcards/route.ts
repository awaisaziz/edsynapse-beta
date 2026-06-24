import { NextRequest, NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { generateJSON, groundedContext, GROUNDING_RULE } from "@/lib/llm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Generate grounded flashcards for a topic.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("student")
    const body = await req.json()
    const topic = String(body.topic ?? "").trim()
    const courseId: string | null = body.course_id ?? null
    if (!topic) return NextResponse.json({ error: "Topic is required." }, { status: 400 })

    const { context } = await groundedContext(courseId, topic)
    const system = [
      "You create high-quality study flashcards (question/answer pairs).",
      GROUNDING_RULE,
      'Return JSON: {"flashcards":[{"front": string, "back": string}]}. Create 8-12 cards.',
      "Fronts are concise prompts; backs are complete but succinct answers.",
      context ? `\n\nSOURCE MATERIAL:\n${context}` : "\n\n(No source material; use accurate general knowledge.)",
    ].join("\n")

    const result = await generateJSON<{ flashcards: { front: string; back: string }[] }>(
      system,
      `Topic: ${topic}. Generate the flashcards now.`,
    )
    return NextResponse.json({ student_id: user.id, topic, flashcards: result.flashcards ?? [] })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] flashcards error:", error)
    return NextResponse.json({ error: "Failed to generate flashcards." }, { status: 500 })
  }
}
