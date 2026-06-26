import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { issueToken } from "@/lib/authTokens"
import { sendEmail, renderActionEmail, appBaseUrl, logDevLink } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Re-send the email-verification link. Works two ways:
 * - Logged-out: pass `{ email }` (used by the sign-in page when a user is blocked
 *   for being unverified). Responds generically so it can't be used to probe
 *   which addresses have accounts.
 * - Signed-in: no body — resends for the current user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const bodyEmail = String(body?.email ?? "").trim().toLowerCase()

    let target: { id: string; email: string; first_name: string | null; email_verified: boolean } | null = null

    if (bodyEmail) {
      target = await queryOne(
        `SELECT id, email, first_name, email_verified FROM users WHERE email = $1`,
        [bodyEmail],
      )
    } else {
      const user = await requireUser()
      target = await queryOne(
        `SELECT id, email, first_name, email_verified FROM users WHERE id = $1`,
        [user.id],
      )
    }

    if (target && !target.email_verified) {
      const token = await issueToken(target.id, "verify")
      const link = `${appBaseUrl(req)}/verify-email?token=${token}`
      logDevLink("verify email", link)
      await sendEmail({
        to: target.email,
        subject: "Confirm your EdSynapse email",
        html: renderActionEmail({
          heading: "Confirm your email",
          body: `Hi ${target.first_name || "there"}, here's a fresh link to activate your EdSynapse account. Confirm your email and you're in.`,
          buttonLabel: "Activate my account",
          buttonUrl: link,
          footnote: "This link expires in 24 hours. If you didn't request this, you can safely ignore it.",
        }),
      })
    }

    // Generic response — never reveal whether an account exists or is already verified.
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] resend-verification error:", error)
    return NextResponse.json({ error: "Failed to send verification email." }, { status: 500 })
  }
}
