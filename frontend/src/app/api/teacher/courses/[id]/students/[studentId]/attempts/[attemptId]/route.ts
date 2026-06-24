import { NextRequest, NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { queryOne } from "@/lib/db"
import { requireCourseStaff } from "@/lib/courses"
import { serializeAttemptReview, type AttemptRow } from "@/lib/attempts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Read-only reconstruction of one of a student's attempts for the teacher/TA:
// every question with its options, the student's response, the correct answer,
// and the AI rationale. Scoped to the course + student so a teacher can only see
// attempts belonging to a student enrolled in a course they staff.
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; studentId: string; attemptId: string }> },
) {
  try {
    const user = await requireUser()
    const { id: courseId, studentId, attemptId } = await ctx.params
    await requireCourseStaff(user.id, courseId)

    const row = await queryOne<AttemptRow>(
      `SELECT id, topic, score, total, created_at, questions, answers, report
         FROM quiz_attempts
        WHERE id = $1 AND student_id = $2 AND course_id = $3`,
      [attemptId, studentId, courseId],
    )
    if (!row) return NextResponse.json({ error: "Attempt not found." }, { status: 404 })

    return NextResponse.json(serializeAttemptReview(row))
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] teacher attempt review error:", error)
    return NextResponse.json({ error: "Failed to load attempt." }, { status: 500 })
  }
}
