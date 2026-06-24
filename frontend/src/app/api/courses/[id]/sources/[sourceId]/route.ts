import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Fetch a single source's extracted text for preview in the Course tab. Access
// is allowed to the course owner or any enrolled student.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; sourceId: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId, sourceId } = await ctx.params

    const access = await queryOne(
      `SELECT 1 FROM courses c WHERE c.id = $1 AND (
          c.owner_id = $2 OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $2))`,
      [courseId, user.id],
    )
    if (!access) return NextResponse.json({ error: "No access to course" }, { status: 403 })

    const source = await queryOne<{ id: string; title: string; type: string; content: string }>(
      `SELECT id, title, file_type AS type, content FROM sources WHERE id = $1 AND course_id = $2`,
      [sourceId, courseId],
    )
    if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 })

    return NextResponse.json({ source })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] get source error:", error)
    return NextResponse.json({ error: "Failed to load source." }, { status: 500 })
  }
}

// Publish/unpublish a source — course owner (teacher) only. Unpublished material
// is hidden from students and excluded from RAG grounding.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; sourceId: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId, sourceId } = await ctx.params

    const course = await queryOne<{ owner_id: string }>(`SELECT owner_id FROM courses WHERE id = $1`, [courseId])
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
    if (course.owner_id !== user.id) {
      return NextResponse.json({ error: "Only the course owner can publish material." }, { status: 403 })
    }

    const body = (await req.json()) as { published?: unknown }
    if (typeof body.published !== "boolean") {
      return NextResponse.json({ error: "`published` must be a boolean." }, { status: 400 })
    }

    const updated = await queryOne<{ id: string; published: boolean }>(
      `UPDATE sources SET published = $1 WHERE id = $2 AND course_id = $3 RETURNING id, published`,
      [body.published, sourceId, courseId],
    )
    if (!updated) return NextResponse.json({ error: "Source not found" }, { status: 404 })

    return NextResponse.json({ source: updated })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] update source publish error:", error)
    return NextResponse.json({ error: "Failed to update material." }, { status: 500 })
  }
}
