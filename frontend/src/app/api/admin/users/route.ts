import { NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { query } from "@/lib/db"
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

// GET → every platform user as PlatformUserDTO[], newest first.
export async function GET() {
  try {
    await requireUser("admin")
    const { rows } = await query<UserRow>(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
              CASE
                WHEN u.role = 'teacher' THEN (SELECT count(*) FROM courses c WHERE c.owner_id = u.id)
                WHEN u.role = 'student' THEN (SELECT count(*) FROM enrollments e WHERE e.student_id = u.id)
                ELSE 0
              END::text AS metric
         FROM users u
        ORDER BY u.created_at DESC`,
    )
    const users: PlatformUserDTO[] = rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      initials: initialsOf(u.name),
      role: u.role,
      status: u.status,
      joined: formatJoined(u.created_at),
      metric: Number(u.metric),
    }))
    return NextResponse.json({ users })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] list users error:", error)
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 })
  }
}
