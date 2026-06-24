import { NextRequest, NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { query } from "@/lib/db"
import { requireCourseStaff } from "@/lib/courses"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Cohort analytics for a teacher's course: enrolled students + their mastery.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId } = await ctx.params
    await requireCourseStaff(user.id, courseId)

    type StudentRow = {
      id: string
      name: string
      email: string
      attempts: string
      avg_score: string | null
      last_active: string | null
    }
    // The cohort is enrolled students only (excludes assistants). `roleFilter`
    // is dropped automatically on the pre-migration schema where enrollments.role
    // doesn't exist yet (014-course-roles.sql not applied).
    const cohortQuery = (roleFilter: string) =>
      query<StudentRow>(
        `SELECT u.id, u.name, u.email,
                COUNT(qa.id)::text AS attempts,
                AVG(CASE WHEN qa.total > 0 THEN (qa.score::float / qa.total) * 100 END) AS avg_score,
                MAX(qa.created_at) AS last_active
           FROM enrollments e
           JOIN users u ON u.id = e.student_id
           LEFT JOIN quiz_attempts qa ON qa.student_id = u.id AND qa.course_id = $1
          WHERE e.course_id = $1 ${roleFilter}
          GROUP BY u.id, u.name, u.email
          ORDER BY u.name ASC`,
        [courseId],
      )

    // Cohort roster + topic mastery distribution are independent — fetch concurrently.
    const [{ rows: students }, { rows: topics }] = await Promise.all([
      cohortQuery("AND e.role = 'student'").catch((e: { code?: string }) => {
        if (e?.code !== "42703") throw e
        return cohortQuery("")
      }),
      // Topic-level mastery distribution across the cohort.
      query<{ topic: string; level: string; n: string }>(
        `SELECT topic, level, COUNT(*)::text AS n
           FROM knowledge_states WHERE course_id = $1
          GROUP BY topic, level ORDER BY topic`,
        [courseId],
      ),
    ])

    return NextResponse.json({
      course_id: courseId,
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        attempts: Number(s.attempts),
        avgScore: s.avg_score != null ? Math.round(Number(s.avg_score)) : null,
        lastActive: s.last_active,
      })),
      topics,
    })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] analytics error:", error)
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 })
  }
}
