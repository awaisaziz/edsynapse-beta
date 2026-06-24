import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { query } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { serializeCourse, generateCourseCode } from "@/lib/courses"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// List the student's classes (enrolled) + self-study spaces (owned).
export async function GET() {
  try {
    const user = await requireUser("student")
    // Enrolled classes carry a per-student archived flag (on the enrollment);
    // owned self-study spaces carry it on the course itself.
    const { rows } = await query<{ id: string; archived: boolean }>(
      `SELECT c.id, e.archived FROM courses c
         JOIN enrollments e ON e.course_id = c.id
        WHERE e.student_id = $1
       UNION
       SELECT id, archived FROM courses WHERE owner_id = $1 AND kind = 'self_study'`,
      [user.id],
    )
    const courses = (
      await Promise.all(
        rows.map(async (r) => {
          const c = await serializeCourse(r.id, { onlyPublishedMaterials: true, studentId: user.id })
          return c ? { ...c, archived: r.archived } : null
        }),
      )
    ).filter(Boolean)
    return NextResponse.json({ courses })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] student courses error:", error)
    return NextResponse.json({ error: "Failed to load courses." }, { status: 500 })
  }
}

// Create a self-study space (student-owned course). Optional initial topics.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("student")
    const body = await req.json()
    const name = String(body.name ?? "").trim() || "Personal Study Space"
    const topics: string[] = Array.isArray(body.topics) ? body.topics.map(String) : []

    const id = `crs_${nanoid(14)}`
    const code = await generateCourseCode("SS")
    await query(
      `INSERT INTO courses (id, owner_id, kind, name, subject, code, color)
       VALUES ($1, $2, 'self_study', $3, 'Self-Study', $4, '#10b981')`,
      [id, user.id, name, code],
    )
    if (topics.length > 0) {
      const lessonId = `les_${nanoid(14)}`
      await query(
        `INSERT INTO lessons (id, course_id, position, title, outline, published)
         VALUES ($1, $2, 1, 'Lesson 1', $3::jsonb, true)`,
        [lessonId, id, JSON.stringify(topics)],
      )
    }
    const course = await serializeCourse(id, { onlyPublishedMaterials: true, studentId: user.id })
    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] create self-study error:", error)
    return NextResponse.json({ error: "Failed to create self-study space." }, { status: 500 })
  }
}
