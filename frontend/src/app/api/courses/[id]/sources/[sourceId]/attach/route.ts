import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { generateJSON } from "@/lib/llm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Attach an already-uploaded course source to a lesson (the "link from the
// Course library" path in the Learning tab). Sets sources.lesson_id and extracts
// candidate topics from the stored text for the student to review/confirm — the
// same review flow as a fresh local upload (applyTopics=false).
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; sourceId: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId, sourceId } = await ctx.params
    const body = await req.json()
    const lessonId = String(body.lessonId ?? "")
    if (!lessonId) return NextResponse.json({ error: "lessonId is required" }, { status: 400 })

    const course = await queryOne<{ owner_id: string }>(`SELECT owner_id FROM courses WHERE id = $1`, [courseId])
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
    if (course.owner_id !== user.id) {
      return NextResponse.json({ error: "Not allowed to modify this course" }, { status: 403 })
    }

    const lesson = await queryOne<{ published: boolean }>(
      `SELECT published FROM lessons WHERE id = $1 AND course_id = $2`,
      [lessonId, courseId],
    )
    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })

    const source = await queryOne<{ content: string }>(
      `SELECT content FROM sources WHERE id = $1 AND course_id = $2`,
      [sourceId, courseId],
    )
    if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 })

    // Inherit the lesson's publish state so a published week always holds
    // published materials (the single publish control lives on the lesson).
    await query(
      `UPDATE sources SET lesson_id = $1, published = $2 WHERE id = $3 AND course_id = $4`,
      [lessonId, lesson.published, sourceId, courseId],
    )

    // Extract candidate topics from the stored text (best-effort).
    let topics: string[] = []
    const text = source.content ?? ""
    if (text.trim().length > 40) {
      try {
        const result = await generateJSON<{ topics: string[] }>(
          [
            "You are a curriculum designer. From the provided study material, extract a clean, ordered list of",
            "the key topics/modules a student should learn. Use concise topic titles (3-7 words).",
            'Return JSON: {"topics": [string]}. Provide 2-5 topics.',
            "Every topic must be directly relevant to and grounded in the source material — do not invent topics. No duplicates.",
          ].join("\n"),
          text.slice(0, 24000),
        )
        const seen = new Set<string>()
        topics = (Array.isArray(result.topics) ? result.topics : [])
          .map(String)
          .map((t) => t.trim())
          .filter((t) => {
            const key = t.toLowerCase()
            if (!t || seen.has(key)) return false
            seen.add(key)
            return true
          })
          .slice(0, 5)
      } catch (e) {
        console.error("[v0] attach topic extraction error:", e)
      }
    }

    await query(`UPDATE courses SET updated_at = now() WHERE id = $1`, [courseId])
    return NextResponse.json({ topics })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] attach source error:", error)
    return NextResponse.json({ error: "Failed to attach source." }, { status: 500 })
  }
}
