import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { serializeCourse } from "@/lib/courses"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Access {
  ownsSelfStudy: boolean
  enrolled: boolean
}

// Resolve how this student relates to the course: owner of a self-study space,
// and/or an enrolled member of a class.
async function resolveAccess(courseId: string, studentId: string): Promise<Access> {
  const owned = await queryOne<{ id: string }>(
    `SELECT id FROM courses WHERE id = $1 AND owner_id = $2 AND kind = 'self_study'`,
    [courseId, studentId],
  )
  const enrolled = await queryOne<{ id: string }>(
    `SELECT id FROM enrollments WHERE course_id = $1 AND student_id = $2`,
    [courseId, studentId],
  )
  return { ownsSelfStudy: !!owned, enrolled: !!enrolled }
}

// Update a student's course: recolor/rename their own self-study space, or
// archive/unarchive (self-study on the course; enrolled classes per-enrollment).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser("student")
    const { id } = await ctx.params
    const { ownsSelfStudy, enrolled } = await resolveAccess(id, user.id)
    if (!ownsSelfStudy && !enrolled) throw new AuthError(404, "Course not found")

    const body = await req.json()

    // Color/name only apply to a student's own self-study space — a class's look
    // belongs to its teacher.
    if (ownsSelfStudy) {
      const fields: string[] = []
      const values: unknown[] = []
      let i = 1
      for (const key of ["name", "color"] as const) {
        if (typeof body[key] === "string") {
          fields.push(`${key} = $${i++}`)
          values.push(body[key])
        }
      }
      if (fields.length > 0) {
        values.push(id)
        await query(`UPDATE courses SET ${fields.join(", ")}, updated_at = now() WHERE id = $${i}`, values)
      }
    }

    // Archive flag: on the course for self-study, on the enrollment for classes.
    if (typeof body.archived === "boolean") {
      if (ownsSelfStudy) {
        await query(`UPDATE courses SET archived = $1, updated_at = now() WHERE id = $2`, [body.archived, id])
      } else {
        await query(
          `UPDATE enrollments SET archived = $1 WHERE course_id = $2 AND student_id = $3`,
          [body.archived, id, user.id],
        )
      }
    }

    const course = await serializeCourse(id, { onlyPublishedMaterials: true, studentId: user.id })
    // Reflect the per-student archive state for an enrolled (non-owned) class.
    if (course && !ownsSelfStudy && typeof body.archived === "boolean") course.archived = body.archived
    return NextResponse.json({ course })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] student update course error:", error)
    return NextResponse.json({ error: "Failed to update course." }, { status: 500 })
  }
}

// Delete a personal self-study space and all its content (cascades to lessons,
// sources, chunks, attempts, materials). Enrolled classes cannot be deleted by a
// student — they can archive them instead.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser("student")
    const { id } = await ctx.params
    const owned = await queryOne<{ id: string }>(
      `SELECT id FROM courses WHERE id = $1 AND owner_id = $2 AND kind = 'self_study'`,
      [id, user.id],
    )
    if (!owned) throw new AuthError(403, "You can only delete your own self-study spaces.")
    await query(`DELETE FROM courses WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] student delete course error:", error)
    return NextResponse.json({ error: "Failed to delete course." }, { status: 500 })
  }
}
