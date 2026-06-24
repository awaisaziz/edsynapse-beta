import { NextResponse } from "next/server"
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

// Update a self-study lesson's topic outline — used to confirm the topics the
// student reviewed/edited after uploading material.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; lessonId: string }> }) {
  try {
    const user = await requireUser("student")
    const { id: courseId, lessonId } = await ctx.params
    await assertSelfStudyOwner(courseId, user.id)

    const lesson = await queryOne<{ id: string }>(`SELECT id FROM lessons WHERE id = $1 AND course_id = $2`, [lessonId, courseId])
    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })

    const body = await req.json()
    const outline = Array.isArray(body.outline)
      ? [...new Set(body.outline.map((t: unknown) => String(t).trim()).filter(Boolean))].slice(0, 20)
      : []

    await query(`UPDATE lessons SET outline = $1::jsonb, updated_at = now() WHERE id = $2`, [
      JSON.stringify(outline),
      lessonId,
    ])
    await query(`UPDATE courses SET updated_at = now() WHERE id = $1`, [courseId])
    const course = await serializeCourse(courseId, { studentId: user.id })
    return NextResponse.json({ course })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] update lesson outline error:", error)
    return NextResponse.json({ error: "Failed to update lesson topics." }, { status: 500 })
  }
}

// Delete a lesson from the student's own self-study space.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; lessonId: string }> }) {
  try {
    const user = await requireUser("student")
    const { id: courseId, lessonId } = await ctx.params
    await assertSelfStudyOwner(courseId, user.id)

    const lesson = await queryOne<{ id: string }>(`SELECT id FROM lessons WHERE id = $1 AND course_id = $2`, [lessonId, courseId])
    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })

    await query(`DELETE FROM lessons WHERE id = $1`, [lessonId])
    await query(`UPDATE courses SET updated_at = now() WHERE id = $1`, [courseId])
    const course = await serializeCourse(courseId, { studentId: user.id })
    return NextResponse.json({ course })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] delete lesson error:", error)
    return NextResponse.json({ error: "Failed to delete lesson." }, { status: 500 })
  }
}
