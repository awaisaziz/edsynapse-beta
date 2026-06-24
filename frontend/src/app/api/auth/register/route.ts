import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { query, queryOne } from "@/lib/db"
import { hashPassword, createSession, validatePassword, type Role } from "@/lib/auth"
import { issueToken } from "@/lib/authTokens"
import { sendEmail, renderActionEmail, appBaseUrl, logDevLink } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email ?? "").trim().toLowerCase()
    const password = String(body.password ?? "")
    // Accept first/last name; fall back to splitting a legacy `name` field.
    const firstName = String(body.firstName ?? "").trim()
    const lastName = String(body.lastName ?? "").trim()
    const name = `${firstName} ${lastName}`.trim() || String(body.name ?? "").trim()
    const role = body.role === "teacher" ? "teacher" : "student"
    const institution = String(body.institution ?? "").trim()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 })
    }
    const pwError = validatePassword(password)
    if (pwError) {
      return NextResponse.json({ error: pwError }, { status: 400 })
    }

    const existing = await queryOne(`SELECT id FROM users WHERE email = $1`, [email])
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })
    }

    const id = `usr_${nanoid(16)}`
    const password_hash = await hashPassword(password)
    await query(
      `INSERT INTO users (id, email, password_hash, name, first_name, last_name, role, institution, onboarded)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
      [id, email, password_hash, name, firstName, lastName, role as Role, institution],
    )

    // Fire off an email-verification link. Failure here must not block signup —
    // the user can request a new link later from Settings.
    try {
      const token = await issueToken(id, "verify")
      const link = `${appBaseUrl(req)}/verify-email?token=${token}`
      logDevLink("verify email", link)
      await sendEmail({
        to: email,
        subject: "Verify your EdSynapse email",
        html: renderActionEmail({
          heading: "Welcome to EdSynapse",
          body: `Hi ${firstName || "there"}, confirm your email address to secure your account and enable password recovery.`,
          buttonLabel: "Verify email",
          buttonUrl: link,
          footnote: "This link expires in 24 hours. If you didn't sign up, ignore this email.",
        }),
      })
    } catch (e) {
      console.error("[v0] verification email error:", e)
    }

    await createSession(id)
    return NextResponse.json(
      { user: { id, email, name, firstName, lastName, role, institution, onboarded: false } },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] register error:", error)
    return NextResponse.json({ error: "Registration failed." }, { status: 500 })
  }
}
