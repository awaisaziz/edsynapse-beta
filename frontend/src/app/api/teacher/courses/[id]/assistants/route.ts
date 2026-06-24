import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { requireCourseOwner, requireCourseStaff } from "@/lib/courses"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface AssistantRow {
  user_id: string
  email: string
  name: string | null
}

function serialize(rows: AssistantRow[]) {
  return rows.map((a) => {
    const display = a.name ?? a.email
    const initials =
      display
        .split(/[\s@.]+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "TA"
    return {
      // id is the user id — assistants are course members promoted in place.
      id: a.user_id,
      name: a.name ?? a.email,
      email: a.email,
      initials,
      status: "active" as const,
    }
  })
}

async function listAssistants(courseId: string) {
  try {
    const { rows } = await query<AssistantRow>(
      `SELECT e.student_id AS user_id, u.email, u.name
         FROM enrollments e
         JOIN users u ON u.id = e.student_id
        WHERE e.course_id = $1 AND e.role = 'assistant'
        ORDER BY u.name ASC`,
      [courseId],
    )
    return serialize(rows)
  } catch (e) {
    // Tolerate pre-migration schema (enrollments.role missing): no TAs yet.
    if ((e as { code?: string })?.code !== "42703") throw e
    return []
  }
}

// List a course's teaching assistants (enrolled members promoted to 'assistant').
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId } = await ctx.params
    // Any staff member (owner or assistant) may view the TA list.
    await requireCourseStaff(user.id, courseId)
    return NextResponse.json({ assistants: await listAssistants(courseId) })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] list assistants error:", error)
    return NextResponse.json({ error: "Failed to load assistants." }, { status: 500 })
  }
}

// Promote an enrolled member to teaching assistant (owner only). The member must
// already have joined the course with the student join code.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId } = await ctx.params
    await requireCourseOwner(user.id, courseId)
    const body = await req.json()
    const userId = String(body.userId ?? "").trim()
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 })

    const { rowCount } = await query(
      `UPDATE enrollments SET role = 'assistant' WHERE course_id = $1 AND student_id = $2`,
      [courseId, userId],
    )
    if (rowCount === 0) {
      return NextResponse.json(
        { error: "That person isn't enrolled in this course. Ask them to join with the class code first." },
        { status: 404 },
      )
    }
    return NextResponse.json({ assistants: await listAssistants(courseId) }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] promote assistant error:", error)
    return NextResponse.json({ error: "Failed to promote assistant." }, { status: 500 })
  }
}

// Demote a teaching assistant back to a regular student (owner only). They stay
// enrolled in the course — only their access level changes.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId } = await ctx.params
    await requireCourseOwner(user.id, courseId)
    const userId = new URL(req.url).searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
    await query(
      `UPDATE enrollments SET role = 'student' WHERE course_id = $1 AND student_id = $2`,
      [courseId, userId],
    )
    return NextResponse.json({ assistants: await listAssistants(courseId) })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] demote assistant error:", error)
    return NextResponse.json({ error: "Failed to remove assistant." }, { status: 500 })
  }
}
