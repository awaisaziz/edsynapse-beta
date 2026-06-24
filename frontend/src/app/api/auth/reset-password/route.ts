import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { hashPassword, validatePassword } from "@/lib/auth"
import { consumeToken } from "@/lib/authTokens"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Complete a password reset. Consumes a single-use reset token, sets the new
 * password (subject to the same policy as signup), and revokes all existing
 * sessions for the account so any attacker who had access is logged out.
 * Verifying via the emailed link also proves email ownership, so we mark the
 * email verified.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = String(body.token ?? "")
    const password = String(body.password ?? "")

    const pwError = validatePassword(password)
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 })

    const userId = await consumeToken(token, "reset")
    if (!userId) {
      return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 })
    }

    const password_hash = await hashPassword(password)
    await query(`UPDATE users SET password_hash = $1, email_verified = true WHERE id = $2`, [password_hash, userId])
    // Invalidate every session — force a fresh login with the new password.
    await query(`DELETE FROM sessions WHERE user_id = $1`, [userId])

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[v0] reset-password error:", error)
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 })
  }
}
