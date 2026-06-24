import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { verifyPassword, createSession } from "@/lib/auth"
import { clientIp, isLoginBlocked, recordFailedLogin, clearLoginAttempts } from "@/lib/rateLimit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email ?? "").trim().toLowerCase()
    const password = String(body.password ?? "")
    const ip = clientIp(req)

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
    }

    // Throttle credential-stuffing: too many recent failures for this email or
    // IP returns 429 before we even check the password.
    if (await isLoginBlocked(email, ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429 },
      )
    }

    const user = await queryOne<{
      id: string
      email: string
      name: string
      role: string
      institution: string
      status: string
      password_hash: string
    }>(
      `SELECT id, email, name, role, institution, status, password_hash FROM users WHERE email = $1`,
      [email],
    )

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      await recordFailedLogin(email, ip)
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
    }

    if (user.status === "suspended") {
      return NextResponse.json({ error: "This account has been suspended. Contact support." }, { status: 403 })
    }

    // No portal/role is supplied at login: authority is the account's real role
    // in the DB. The client routes by the role returned below, and every
    // protected route re-checks the role server-side via requireUser(role).
    await clearLoginAttempts(email)
    await createSession(user.id)
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, institution: user.institution },
    })
  } catch (error) {
    console.error("[v0] login error:", error)
    return NextResponse.json({ error: "Login failed." }, { status: 500 })
  }
}
