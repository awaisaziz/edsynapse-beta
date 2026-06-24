import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requireUser, AuthError, verifyPassword, destroySession } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Permanently delete the logged-in user's account. Requires the current
 * password as a typed confirmation. ON DELETE CASCADE removes everything owned
 * by the user (courses, lessons, sources, chunks, enrollments, knowledge
 * states, attempts, tutor sessions, support threads, sessions).
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const password = String(body.password ?? "")

    if (!password) {
      return NextResponse.json({ error: "Enter your password to confirm." }, { status: 400 })
    }

    const row = await queryOne<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1`,
      [user.id],
    )
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 })
    }

    await query(`DELETE FROM users WHERE id = $1`, [user.id])
    await destroySession()

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] account delete error:", error)
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 })
  }
}
