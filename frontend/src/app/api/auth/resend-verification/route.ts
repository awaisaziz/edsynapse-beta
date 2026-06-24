import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { issueToken } from "@/lib/authTokens"
import { sendEmail, renderActionEmail, appBaseUrl, logDevLink } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Re-send the email-verification link for the signed-in user. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const row = await queryOne<{ email_verified: boolean }>(
      `SELECT email_verified FROM users WHERE id = $1`,
      [user.id],
    )
    if (row?.email_verified) return NextResponse.json({ ok: true, alreadyVerified: true })

    const token = await issueToken(user.id, "verify")
    const link = `${appBaseUrl(req)}/verify-email?token=${token}`
    logDevLink("verify email", link)
    await sendEmail({
      to: user.email,
      subject: "Verify your EdSynapse email",
      html: renderActionEmail({
        heading: "Confirm your email",
        body: `Hi ${user.firstName || "there"}, confirm your email address to secure your account and enable password recovery.`,
        buttonLabel: "Verify email",
        buttonUrl: link,
        footnote: "This link expires in 24 hours.",
      }),
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] resend-verification error:", error)
    return NextResponse.json({ error: "Failed to send verification email." }, { status: 500 })
  }
}
