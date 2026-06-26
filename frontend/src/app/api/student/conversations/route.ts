import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { requireUser } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import { handle, badRequest } from "@/lib/apiHelpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Named conversation threads for the Chat + Discussion tabs. Each thread is a
// tutor_sessions row whose `topic` is prefixed by surface so threads never
// collide with the per-topic Learning tutor sessions in the same table.
const PREFIX: Record<string, string> = {
  chat: "__chat__:",
  tutor: "__tutor__:",
  socratic: "__socr__:",
  discussion: "__disc__:",
}

function prefixFor(surface: string): string | null {
  return PREFIX[surface] ?? null
}

interface ThreadRow {
  topic: string
  title: string | null
  updated_at: string
  preview: string | null
}

// List a course's threads for a surface (most recent first).
export const GET = handle(async (req: NextRequest) => {
  const user = await requireUser("student")
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get("course_id")
  const prefix = prefixFor(searchParams.get("surface") ?? "")
  if (!prefix) return badRequest("Unknown surface")

  const { rows } = await query<ThreadRow>(
    `SELECT topic, title, updated_at,
            (messages -> -1 ->> 'content') AS preview
       FROM tutor_sessions
      WHERE student_id = $1 AND course_id IS NOT DISTINCT FROM $2 AND topic LIKE $3
      ORDER BY updated_at DESC`,
    [user.id, courseId, `${prefix}%`],
  )
  return NextResponse.json({
    threads: rows.map((r) => ({
      topic: r.topic,
      title: r.title ?? "Untitled",
      updatedAt: r.updated_at,
      preview: r.preview ?? "",
    })),
  })
})

// Create a new (empty) thread.
export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser("student")
  const body = await req.json()
  const courseId: string | null = body.course_id ?? null
  const prefix = prefixFor(String(body.surface ?? ""))
  if (!prefix) return badRequest("Unknown surface")
  
  let defaultTitle = "New discussion";
  if (prefix === PREFIX.tutor || prefix === PREFIX.chat) {
    defaultTitle = "New tutor chat";
  } else if (prefix === PREFIX.socratic) {
    defaultTitle = "New Socratic chat";
  }
  const title = (typeof body.title === "string" && body.title.trim()) || defaultTitle;
  const topic = `${prefix}${nanoid(12)}`

  await query(
    `INSERT INTO tutor_sessions (id, student_id, course_id, topic, title, messages) VALUES ($1, $2, $3, $4, $5, '[]'::jsonb)`,
    [`tut_${nanoid(14)}`, user.id, courseId, topic, title],
  )
  return NextResponse.json({ thread: { topic, title, updatedAt: new Date().toISOString(), preview: "" } })
})

// Rename a thread.
export const PATCH = handle(async (req: NextRequest) => {
  const user = await requireUser("student")
  const body = await req.json()
  const courseId: string | null = body.course_id ?? null
  const topic = String(body.topic ?? "")
  const title = String(body.title ?? "").trim()
  if (!topic || !title) return badRequest("topic and title are required")

  await query(
    `UPDATE tutor_sessions SET title = $1, updated_at = updated_at
       WHERE student_id = $2 AND course_id IS NOT DISTINCT FROM $3 AND topic = $4`,
    [title, user.id, courseId, topic],
  )
  return NextResponse.json({ ok: true })
})

// Delete a thread entirely.
export const DELETE = handle(async (req: NextRequest) => {
  const user = await requireUser("student")
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get("course_id")
  const topic = searchParams.get("topic")
  if (!topic) return badRequest("topic is required")

  await query(
    `DELETE FROM tutor_sessions WHERE student_id = $1 AND course_id IS NOT DISTINCT FROM $2 AND topic = $3`,
    [user.id, courseId, topic],
  )
  return NextResponse.json({ ok: true })
})
