import { NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { query } from "@/lib/db"
import { serializeThread, type SupportThreadDTO } from "@/lib/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET → all support threads, serialized, newest activity first.
export async function GET() {
  try {
    await requireUser("admin")
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM support_threads ORDER BY updated_at DESC`,
    )
    const threads = (
      await Promise.all(rows.map((r) => serializeThread(r.id)))
    ).filter((t): t is SupportThreadDTO => t !== null)
    return NextResponse.json({ threads })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] list support threads error:", error)
    return NextResponse.json({ error: "Failed to load support threads." }, { status: 500 })
  }
}
