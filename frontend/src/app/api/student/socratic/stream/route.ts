import { NextRequest } from "next/server"
import { nanoid } from "nanoid"
import { requireUser, AuthError } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"
import { groundedContext, streamSocraticReply, updateTutorMemory, EMPTY_MEMORY, type TutorMemory } from "@/lib/llm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Streaming Socratic tutor grounded in course material. Server-Sent style NDJSON
// over fetch: each line is `data: {json}`.
export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireUser("student")
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 401
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status })
  }

  const body = await req.json()
  const topic = String(body.topic ?? "this topic")
  // Storage key for the persisted conversation.
  const topicKey = String(body.topic_key ?? topic)
  const message = String(body.message ?? "")
  const courseId: string | null = body.course_id ?? null
  const profile = body.profile ?? { modality: "text", pace: "methodical" }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      try {
        const { context, sources } = await groundedContext(courseId, `${topic}: ${message}`)
        send({ type: "sources", sources })

        // Load recent history + durable memory for this student+topic.
        const existing = await queryOne<{
          id: string
          messages: { role: "user" | "assistant"; content: string }[]
          memory: TutorMemory
        }>(
          `SELECT id, messages, memory FROM tutor_sessions WHERE student_id = $1 AND course_id IS NOT DISTINCT FROM $2 AND topic = $3
            ORDER BY updated_at DESC LIMIT 1`,
          [user!.id, courseId, topicKey],
        )
        const history = Array.isArray(existing?.messages) ? existing!.messages : []
        const memory: TutorMemory = existing?.memory && typeof existing.memory === "object"
          ? { summary: existing.memory.summary ?? "", facts: Array.isArray(existing.memory.facts) ? existing.memory.facts : [] }
          : EMPTY_MEMORY

        let full = ""
        for await (const delta of streamSocraticReply({
          topic,
          message,
          context,
          history,
          modality: profile.modality ?? "text",
          pace: profile.pace ?? "methodical",
          memory,
        })) {
          full += delta
          send({ type: "delta", text: delta })
        }

        send({ type: "done" })

        // Persist the exchange and refresh durable memory.
        const newMessages = [...history, { role: "user", content: message }, { role: "assistant", content: full }].slice(-20)
        const newMemory = await updateTutorMemory({ topic, prior: memory, userMessage: message, assistantMessage: full })
        if (existing) {
          await query(`UPDATE tutor_sessions SET messages = $1::jsonb, memory = $2::jsonb, updated_at = now() WHERE id = $3`, [
            JSON.stringify(newMessages),
            JSON.stringify(newMemory),
            existing.id,
          ])
        } else {
          await query(
            `INSERT INTO tutor_sessions (id, student_id, course_id, topic, messages, memory) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
            [`tut_${nanoid(14)}`, user!.id, courseId, topicKey, JSON.stringify(newMessages), JSON.stringify(newMemory)],
          )
        }
      } catch (err) {
        console.error("[v0] Socratic stream error:", err)
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
