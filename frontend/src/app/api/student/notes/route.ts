import { NextRequest, NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { generateJSON, groundedContext, GROUNDING_RULE } from "@/lib/llm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

interface NotesShape {
  summary: string
  sections: { heading: string; content: string }[]
  key_concepts: string[]
}

// Generate grounded smart notes for a topic.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("student")
    const body = await req.json()
    const topic = String(body.topic ?? "").trim()
    const courseId: string | null = body.course_id ?? null
    if (!topic) return NextResponse.json({ error: "Topic is required." }, { status: 400 })

    const { context, sources } = await groundedContext(courseId, topic)
    const system = [
      "You are an expert study-notes author. Produce clear, well-structured smart notes.",
      GROUNDING_RULE,
      'Return JSON: {"summary": string, "sections": [{"heading", "content"}], "key_concepts": [string]}.',
      "3-6 sections. Content should be concise but complete, suitable for revision.",
      context ? `\n\nSOURCE MATERIAL:\n${context}` : "\n\n(No source material; use accurate general knowledge.)",
    ].join("\n")

    const notes = await generateJSON<NotesShape>(system, `Topic: ${topic}. Write the notes now.`)
    return NextResponse.json({
      student_id: user.id,
      topic,
      summary: notes.summary ?? "",
      sections: notes.sections ?? [],
      key_concepts: notes.key_concepts ?? [],
      sources,
    })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] notes error:", error)
    return NextResponse.json({ error: "Failed to generate notes." }, { status: 500 })
  }
}
