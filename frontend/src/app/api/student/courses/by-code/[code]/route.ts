import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { serializeCourse } from "@/lib/courses"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Fetch a course the student can access (enrolled class or own self-study), by code.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  try {
    const user = await requireUser("student")
    const { code } = await ctx.params
    const decoded = decodeURIComponent(code).toUpperCase()

    const course = await queryOne<{ id: string; owner_id: string }>(
      `SELECT id, owner_id FROM courses WHERE upper(code) = $1`,
      [decoded],
    )
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })

    // Access: owner (self-study) or enrolled (class).
    const access = await queryOne(
      `SELECT 1 FROM courses c
        WHERE c.id = $1 AND (
          c.owner_id = $2
          OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $2)
        )`,
      [course.id, user.id],
    )
    if (!access) return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 })

    const serialized = await serializeCourse(course.id, { onlyPublishedMaterials: true, studentId: user.id })
    return NextResponse.json({ course: serialized })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] get course by code error:", error)
    return NextResponse.json({ error: "Failed to load course." }, { status: 500 })
  }
}
