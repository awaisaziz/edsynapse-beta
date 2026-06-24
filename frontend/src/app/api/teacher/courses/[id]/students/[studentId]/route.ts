import { NextRequest, NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import { requireCourseStaff } from "@/lib/courses"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Teacher (or TA) view of one enrolled student's record in a course: their
// quiz/assessment attempt history plus per-topic mastery (strong / moderate /
// weak). Read-only.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; studentId: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId, studentId } = await ctx.params
    await requireCourseStaff(user.id, courseId)

    // Confirm the student is actually enrolled in this course before exposing data.
    const enrolled = await queryOne(
      `SELECT 1 FROM enrollments WHERE course_id = $1 AND student_id = $2`,
      [courseId, studentId],
    )
    if (!enrolled) return NextResponse.json({ error: "Student is not enrolled in this course" }, { status: 404 })

    const [student, { rows: attempts }, { rows: topics }] = await Promise.all([
      queryOne<{ id: string; name: string; email: string }>(
        `SELECT id, name, email FROM users WHERE id = $1`,
        [studentId],
      ),
      query<{
        id: string
        topic: string
        kind: string
        score: number
        total: number
        created_at: string
      }>(
        `SELECT id, topic, kind, score, total, created_at
           FROM quiz_attempts
          WHERE student_id = $1 AND course_id = $2
          ORDER BY created_at DESC
          LIMIT 100`,
        [studentId, courseId],
      ),
      query<{ topic: string; level: string }>(
        `SELECT topic, level FROM knowledge_states
          WHERE student_id = $1 AND course_id = $2
          ORDER BY topic ASC`,
        [studentId, courseId],
      ),
    ])

    return NextResponse.json({
      student: student ?? { id: studentId, name: "Unknown", email: "" },
      attempts: attempts.map((a) => ({
        id: a.id,
        topic: a.topic,
        kind: a.kind,
        score: a.score,
        total: a.total,
        created_at: a.created_at,
      })),
      strong: topics.filter((t) => t.level === "strong").map((t) => t.topic),
      moderate: topics.filter((t) => t.level === "moderate").map((t) => t.topic),
      weak: topics.filter((t) => t.level === "needs_improvement").map((t) => t.topic),
    })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] teacher student detail error:", error)
    return NextResponse.json({ error: "Failed to load student record." }, { status: 500 })
  }
}
