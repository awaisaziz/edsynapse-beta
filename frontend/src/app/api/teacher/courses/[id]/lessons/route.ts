import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { query } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { serializeCourse, requireCourseStaff } from "@/lib/courses"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Create a lesson.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId } = await ctx.params
    await requireCourseStaff(user.id, courseId)
    const body = await req.json()
    const title = String(body.title ?? "").trim() || "Untitled Lesson"
    const outline: string[] = Array.isArray(body.outline) ? body.outline.map(String) : []
    const published = Boolean(body.published)

    const { rows } = await query<{ next: number }>(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next FROM lessons WHERE course_id = $1`,
      [courseId],
    )
    const position = rows[0]?.next ?? 1
    const lessonId = `les_${nanoid(14)}`
    await query(
      `INSERT INTO lessons (id, course_id, position, title, outline, published)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [lessonId, courseId, position, title, JSON.stringify(outline), published],
    )
    await query(`UPDATE courses SET updated_at = now() WHERE id = $1`, [courseId])
    const course = await serializeCourse(courseId)
    return NextResponse.json({ course, lessonId }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] create lesson error:", error)
    return NextResponse.json({ error: "Failed to create lesson." }, { status: 500 })
  }
}

// Update a lesson (title/outline/published).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId } = await ctx.params
    await requireCourseStaff(user.id, courseId)
    const body = await req.json()
    const lessonId = String(body.lessonId ?? "")
    if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 })

    const fields: string[] = []
    const values: unknown[] = []
    let i = 1
    if (typeof body.title === "string") { fields.push(`title = $${i++}`); values.push(body.title) }
    if (Array.isArray(body.outline)) { fields.push(`outline = $${i++}::jsonb`); values.push(JSON.stringify(body.outline.map(String))) }
    if (typeof body.published === "boolean") { fields.push(`published = $${i++}`); values.push(body.published) }
    if (fields.length > 0) {
      values.push(lessonId, courseId)
      await query(
        `UPDATE lessons SET ${fields.join(", ")}, updated_at = now() WHERE id = $${i++} AND course_id = $${i}`,
        values,
      )
      // Publishing a lesson is the single publish control: cascade its state to
      // every material attached to the lesson so they reach students (and the
      // RAG/tutor) together. Unpublishing the lesson hides them again.
      if (typeof body.published === "boolean") {
        await query(
          `UPDATE sources SET published = $1 WHERE lesson_id = $2 AND course_id = $3`,
          [body.published, lessonId, courseId],
        )
      }
      await query(`UPDATE courses SET updated_at = now() WHERE id = $1`, [courseId])
    }
    const course = await serializeCourse(courseId)
    return NextResponse.json({ course })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] update lesson error:", error)
    return NextResponse.json({ error: "Failed to update lesson." }, { status: 500 })
  }
}

// Delete a lesson.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId } = await ctx.params
    await requireCourseStaff(user.id, courseId)
    const { searchParams } = new URL(req.url)
    const lessonId = searchParams.get("lessonId")
    if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 })
    await query(`DELETE FROM lessons WHERE id = $1 AND course_id = $2`, [lessonId, courseId])
    const course = await serializeCourse(courseId)
    return NextResponse.json({ course })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] delete lesson error:", error)
    return NextResponse.json({ error: "Failed to delete lesson." }, { status: 500 })
  }
}
