import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { issueToken } from "@/lib/authTokens"
import { sendEmail, renderActionEmail, appBaseUrl, logDevLink } from "@/lib/email"
import { clientIp, isLoginBlocked, recordFailedLogin } from "@/lib/rateLimit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Start a password reset. Always responds with the same generic success so it
 * never reveals whether an email is registered. When the account exists and is
 * active, we email a single-use, 1-hour reset link. Rate-limited (reusing the
 * login limiter) to stop enumeration / email-bombing.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email ?? "").trim().toLowerCase()
    const ip = clientIp(req)

    const generic = NextResponse.json({
      ok: true,
      message: "If an account exists for that email, a reset link is on its way.",
    })

    if (!email) return generic
    if (await isLoginBlocked(email, ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429 },
      )
    }
    // Count this request against the limiter regardless of outcome.
    await recordFailedLogin(email, ip)

    const user = await queryOne<{ id: string; name: string; status: string }>(
      `SELECT id, name, status FROM users WHERE email = $1`,
      [email],
    )
    if (!user || user.status === "suspended") return generic

    try {
      const token = await issueToken(user.id, "reset")
      const link = `${appBaseUrl(req)}/reset-password?token=${token}`
      logDevLink("password reset", link)
      await sendEmail({
        to: email,
        subject: "Reset your EdSynapse password",
        html: renderActionEmail({
          heading: "Reset your password",
          body: "We received a request to reset your password. Click below to choose a new one.",
          buttonLabel: "Reset password",
          buttonUrl: link,
          footnote: "This link expires in 1 hour. If you didn't request this, you can ignore this email — your password won't change.",
        }),
      })
    } catch (e) {
      console.error("[v0] reset email error:", e)
    }

    return generic
  } catch (error) {
    console.error("[v0] forgot-password error:", error)
    // Still generic — don't leak internals.
    return NextResponse.json({ ok: true, message: "If an account exists for that email, a reset link is on its way." })
  }
}
