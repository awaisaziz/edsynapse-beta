import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireUser, AuthError } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import { serializeThread } from "@/lib/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Resolve the caller's single support thread id, if any. */
async function findThreadId(userId: string): Promise<string | null> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM support_threads WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [userId],
  )
  return row?.id ?? null
}

// GET → the caller's own support thread (or { thread: null }).
export async function GET() {
  try {
    const user = await requireUser()
    const threadId = await findThreadId(user.id)
    if (!threadId) return NextResponse.json({ thread: null })
    const thread = await serializeThread(threadId)
    return NextResponse.json({ thread })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] get support thread error:", error)
    return NextResponse.json({ error: "Failed to load support thread." }, { status: 500 })
  }
}

// POST { body } → append a user message, creating the thread on first contact.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { body } = (await req.json()) as { body?: unknown }
    if (typeof body !== "string" || !body.trim()) {
      return NextResponse.json({ error: "Message body is required." }, { status: 400 })
    }
    const text = body.trim()

    let threadId = await findThreadId(user.id)
    if (!threadId) {
      threadId = `thr_${nanoid(14)}`
      await query(
        `INSERT INTO support_threads (id, user_id, unread_for_admin, created_at, updated_at)
         VALUES ($1, $2, true, now(), now())`,
        [threadId, user.id],
      )
    } else {
      await query(
        `UPDATE support_threads SET unread_for_admin = true, updated_at = now() WHERE id = $1`,
        [threadId],
      )
    }

    await query(
      `INSERT INTO support_messages (id, thread_id, author, body, created_at)
       VALUES ($1, $2, 'user', $3, now())`,
      [`msg_${nanoid(14)}`, threadId, text],
    )

    const thread = await serializeThread(threadId)
    return NextResponse.json({ thread })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] post support message error:", error)
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 })
  }
}
