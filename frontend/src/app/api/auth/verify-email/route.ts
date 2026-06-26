import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { consumeToken } from "@/lib/authTokens"
import { createSession } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Confirm an email address by consuming a single-use verification token. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = String(body.token ?? "")

    const userId = await consumeToken(token, "verify")
    if (!userId) {
      return NextResponse.json({ error: "This verification link is invalid or has expired." }, { status: 400 })
    }

    await query(`UPDATE users SET email_verified = true WHERE id = $1`, [userId])

    // The token proves the user owns this inbox, so log them in here and route
    // them straight into onboarding — no need to re-enter their password.
    await createSession(userId)
    const user = await queryOne<{ role: string; onboarded: boolean }>(
      `SELECT role, onboarded FROM users WHERE id = $1`,
      [userId],
    )
    return NextResponse.json({
      ok: true,
      role: user?.role ?? "student",
      onboarded: Boolean(user?.onboarded),
    })
  } catch (error) {
    console.error("[v0] verify-email error:", error)
    return NextResponse.json({ error: "Failed to verify email." }, { status: 500 })
  }
}
