import { NextRequest, NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import { initialsOf, formatJoined, type PlatformUserDTO } from "@/lib/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface UserRow {
  id: string
  name: string
  email: string
  role: "teacher" | "student" | "admin"
  status: "active" | "suspended"
  created_at: string
  metric: string
}

// PATCH { status } → update an account's status; returns the updated PlatformUserDTO.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireUser("admin")
    const { id } = await ctx.params
    if (id === admin.id) {
      return NextResponse.json({ error: "You cannot change your own status." }, { status: 400 })
    }
    const { status } = (await req.json()) as { status?: unknown }
    if (status !== "active" && status !== "suspended") {
      return NextResponse.json({ error: "Status must be 'active' or 'suspended'." }, { status: 400 })
    }

    const updated = await queryOne<UserRow>(
      `UPDATE users SET status = $1, updated_at = now()
        WHERE id = $2
      RETURNING id, name, email, role, status, created_at,
                CASE
                  WHEN role = 'teacher' THEN (SELECT count(*) FROM courses c WHERE c.owner_id = users.id)
                  WHEN role = 'student' THEN (SELECT count(*) FROM enrollments e WHERE e.student_id = users.id)
                  ELSE 0
                END::text AS metric`,
      [status, id],
    )
    if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 })

    const user: PlatformUserDTO = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      initials: initialsOf(updated.name),
      role: updated.role,
      status: updated.status,
      joined: formatJoined(updated.created_at),
      metric: Number(updated.metric),
    }
    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] update user status error:", error)
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 })
  }
}
