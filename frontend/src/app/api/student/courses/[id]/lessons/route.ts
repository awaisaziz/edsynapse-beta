import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { query, queryOne } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { serializeCourse } from "@/lib/courses"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function assertSelfStudyOwner(courseId: string, studentId: string) {
  const row = await queryOne<{ owner_id: string; kind: string }>(
    `SELECT owner_id, kind FROM courses WHERE id = $1`,
    [courseId],
  )
  if (!row) throw new AuthError(404, "Course not found")
  if (row.owner_id !== studentId || row.kind !== "self_study") {
    throw new AuthError(403, "Not your self-study space")
  }
}

// Create a lesson in the student's own self-study space.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser("student")
    const { id: courseId } = await ctx.params
    await assertSelfStudyOwner(courseId, user.id)
    const body = await req.json()
    const title = String(body.title ?? "").trim() || "Lesson 1"
    const outline: string[] = Array.isArray(body.outline) ? body.outline.map(String) : []

    const { rows } = await query<{ next: number }>(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next FROM lessons WHERE course_id = $1`,
      [courseId],
    )
    const position = rows[0]?.next ?? 1
    const lessonId = `les_${nanoid(14)}`
    await query(
      `INSERT INTO lessons (id, course_id, position, title, outline, published)
       VALUES ($1, $2, $3, $4, $5::jsonb, true)`,
      [lessonId, courseId, position, title, JSON.stringify(outline)],
    )
    // The self-study onboarding flow uploads material to the course before any
    // lesson exists, leaving those sources with lesson_id = NULL. Attach them to
    // this first lesson so it shows as having material (otherwise opening the
    // lesson wrongly prompts the student to upload again).
    if (position === 1) {
      await query(
        `UPDATE sources SET lesson_id = $1 WHERE course_id = $2 AND lesson_id IS NULL`,
        [lessonId, courseId],
      )
    }
    await query(`UPDATE courses SET updated_at = now() WHERE id = $1`, [courseId])
    const course = await serializeCourse(courseId, { studentId: user.id })
    return NextResponse.json({ course, lessonId }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] self-study lesson error:", error)
    return NextResponse.json({ error: "Failed to add lesson." }, { status: 500 })
  }
}
