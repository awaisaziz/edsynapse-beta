import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireUser, AuthError } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import { serializeThread } from "@/lib/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function assertThread(threadId: string) {
  const row = await queryOne<{ id: string }>(`SELECT id FROM support_threads WHERE id = $1`, [threadId])
  if (!row) throw new AuthError(404, "Thread not found")
}

// POST { body } → admin reply on the thread; clears unread + bumps updated_at.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser("admin")
    const { id } = await ctx.params
    await assertThread(id)
    const { body } = (await req.json()) as { body?: unknown }
    if (typeof body !== "string" || !body.trim()) {
      return NextResponse.json({ error: "Reply body is required." }, { status: 400 })
    }

    await query(
      `INSERT INTO support_messages (id, thread_id, author, body, created_at)
       VALUES ($1, $2, 'admin', $3, now())`,
      [`msg_${nanoid(14)}`, id, body.trim()],
    )
    await query(
      `UPDATE support_threads SET unread_for_admin = false, updated_at = now() WHERE id = $1`,
      [id],
    )

    const thread = await serializeThread(id)
    return NextResponse.json({ thread })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] admin reply error:", error)
    return NextResponse.json({ error: "Failed to send reply." }, { status: 500 })
  }
}

// PATCH → mark the thread read (clear the admin unread flag).
export async function PATCH(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser("admin")
    const { id } = await ctx.params
    await assertThread(id)
    await query(`UPDATE support_threads SET unread_for_admin = false WHERE id = $1`, [id])
    const thread = await serializeThread(id)
    return NextResponse.json({ thread })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] mark thread read error:", error)
    return NextResponse.json({ error: "Failed to update thread." }, { status: 500 })
  }
}
