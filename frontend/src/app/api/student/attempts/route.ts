import { NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { query } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Returns the signed-in student's quiz/assessment attempt history.
export async function GET() {
  try {
    const user = await requireUser("student")
    const { rows } = await query(
      `SELECT id, course_id, topic, kind, score, total, created_at
       FROM quiz_attempts
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [user.id],
    )
    return NextResponse.json({
      attempts: rows.map((r) => ({
        id: r.id,
        course_id: r.course_id,
        topic: r.topic,
        kind: r.kind,
        score: r.score,
        total: r.total,
        created_at: r.created_at,
      })),
    })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] attempts error:", error)
    return NextResponse.json({ error: "Failed to load attempts." }, { status: 500 })
  }
}
