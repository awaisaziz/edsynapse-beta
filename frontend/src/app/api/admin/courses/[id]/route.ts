import { NextRequest, NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// DELETE → admin override: remove any course platform-wide.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser("admin")
    const { id } = await ctx.params
    const course = await queryOne<{ id: string }>(`SELECT id FROM courses WHERE id = $1`, [id])
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 })
    await query(`DELETE FROM courses WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] admin delete course error:", error)
    return NextResponse.json({ error: "Failed to delete course." }, { status: 500 })
  }
}
