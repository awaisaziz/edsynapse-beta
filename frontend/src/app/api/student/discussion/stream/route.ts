import { NextRequest } from "next/server"
import { nanoid } from "nanoid"
import { requireUser, AuthError } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import { rerankedContext, streamDiscussionReply } from "@/lib/llm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// One persisted Socratic discussion per student+course, keyed by this sentinel
// topic so it never collides with the per-topic tutor chats in the same table.
const DISCUSSION_TOPIC = "__discussion__"

// Streaming Socratic discussion bot. Scoped to a whole course's material via the
// LLM re-ranker, persisted to tutor_sessions. NDJSON over fetch: `data: {json}`.
export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireUser("student")
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 401
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status })
  }

  const body = await req.json()
  const message = String(body.message ?? "")
  const courseId: string | null = body.course_id ?? null
  const courseName = String(body.course_name ?? "this course")
  // Storage key for this discussion thread. Defaults to the legacy single-thread
  // sentinel; the Discussion tab now passes a per-thread "__disc__:<id>" key.
  const topicKey = String(body.topic_key ?? DISCUSSION_TOPIC)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      try {
        // Re-ranked retrieval over the whole course, biased by recent dialogue.
        const { context, sources } = await rerankedContext(courseId, message)
        send({ type: "sources", sources })

        const existing = await queryOne<{
          id: string
          messages: { role: "user" | "assistant"; content: string }[]
        }>(
          `SELECT id, messages FROM tutor_sessions
             WHERE student_id = $1 AND course_id IS NOT DISTINCT FROM $2 AND topic = $3
             ORDER BY updated_at DESC LIMIT 1`,
          [user!.id, courseId, topicKey],
        )
        const history = Array.isArray(existing?.messages) ? existing!.messages : []

        let full = ""
        for await (const delta of streamDiscussionReply({ courseName, message, context, history })) {
          full += delta
          send({ type: "delta", text: delta })
        }

        send({ type: "done" })

        const newMessages = [
          ...history,
          { role: "user", content: message },
          { role: "assistant", content: full },
        ].slice(-30)
        if (existing) {
          await query(`UPDATE tutor_sessions SET messages = $1::jsonb, updated_at = now() WHERE id = $2`, [
            JSON.stringify(newMessages),
            existing.id,
          ])
        } else {
          await query(
            `INSERT INTO tutor_sessions (id, student_id, course_id, topic, messages) VALUES ($1, $2, $3, $4, $5::jsonb)`,
            [`tut_${nanoid(14)}`, user!.id, courseId, topicKey, JSON.stringify(newMessages)],
          )
        }
      } catch (err) {
        console.error("[v0] discussion stream error:", err)
        send({ type: "error", message: (err as Error).message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
