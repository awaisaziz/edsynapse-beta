import { NextResponse, type NextRequest } from "next/server"

const SESSION_COOKIE = "edsynapse_session"

// TEMPORARY dev-only auth bypass — see src/lib/auth.ts. When enabled, no session
// is required; visiting any page with `?as=teacher|student` pins the role used
// by the bypass. Remove this block once real sign-in is wired up.
const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true"
const DEV_ROLE_COOKIE = "tg_dev_role"

/**
 * Lightweight gate: redirect unauthenticated users away from protected areas.
 * Cookie presence only (no DB on the edge). Role checks + real session
 * validation happen server-side in pages/route handlers via requireUser().
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Dev bypass: never redirect, and let `?as=teacher|student` pin the role.
  if (DEV_AUTH_BYPASS) {
    const as = req.nextUrl.searchParams.get("as")
    const res = NextResponse.next()
    if (as === "teacher" || as === "student" || as === "admin") {
      res.cookies.set(DEV_ROLE_COOKIE, as, { path: "/", sameSite: "lax" })
    }
    return res
  }

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value)

  const isProtected =
    pathname.startsWith("/student") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/admin")
  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = "/sign-in"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // The public pages (landing, /sign-in, /sign-up) are intentionally always
  // accessible — even with a session cookie present. Auth only takes effect when
  // the user actually signs in/up; we don't bounce anyone off the auth pages.
  return NextResponse.next()
}

export const config = {
  matcher: ["/student/:path*", "/teacher/:path*", "/admin", "/admin/:path*"],
}
