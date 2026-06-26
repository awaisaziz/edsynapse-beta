import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { query, queryOne } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { requireCourseStaff, getCourseRole, isCourseStaff } from "@/lib/courses"
import { detectFileType, extractText } from "@/lib/fileParsing"
import { ingestSource } from "@/lib/rag"
import { generateJSON } from "@/lib/llm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Remove NUL (0x00) bytes — PostgreSQL TEXT can't store them, and PDF/DOCX text
// extraction occasionally produces them, which otherwise aborts the INSERT.
function stripNul(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.split(String.fromCharCode(0)).join("");
}

// Fallback MIME when the browser doesn't supply one, keyed by our detected type.
function mimeForType(type: string): string {
  switch (type) {
    case "pdf":
      return "application/pdf"
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    default:
      return "text/plain"
  }
}

/**
 * Upload source material to a course (teacher-owned class OR student self-study).
 * Accepts multipart form-data with one or more `files`, and/or a `text` field
 * for pasted content. Parses PDF/DOCX/XLSX/text, stores the source row, and
 * embeds chunks into pgvector for RAG grounding.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId } = await ctx.params

    // Owner (incl. self-study owner) may add material.
    await requireCourseStaff(user.id, courseId)

    // Publish gating: in a class, new material is UNPUBLISHED by default so
    // students can't see it (and the tutor/discussion bots won't ground on it)
    // until the teacher explicitly publishes. Self-study material is owned by
    // the student themselves, so it's published immediately.
    const courseRow = await queryOne<{ kind: "class" | "self_study" }>(
      `SELECT kind FROM courses WHERE id = $1`,
      [courseId],
    )

    const form = await req.formData()
    const lessonId = (form.get("lessonId") as string) || null

    // Self-study material is always published (the student owns it). In a class,
    // material defaults to unpublished — UNLESS it's being added to an already
    // published lesson, in which case it inherits the lesson's published state
    // so a published week always contains published materials.
    let published = courseRow?.kind === "self_study"
    if (!published && lessonId) {
      const les = await queryOne<{ published: boolean }>(
        `SELECT published FROM lessons WHERE id = $1 AND course_id = $2`,
        [lessonId, courseId],
      )
      published = Boolean(les?.published)
    }
    const wantTopics = form.get("extractTopics") === "true"
    // When false, extracted topics are returned for the student to review/edit
    // but NOT written to the lesson outline yet (confirmed via the lessons PATCH).
    const applyTopics = form.get("applyTopics") !== "false"
    const files = form.getAll("files").filter((f): f is File => f instanceof File)
    const pastedText = stripNul((form.get("text") as string) || "")
    const pastedTitle = (form.get("title") as string) || "Pasted notes"

    const ingested: { id: string; title: string; type: string; chunks: number }[] = []
    let combinedText = ""

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const type = detectFileType(file.name, file.type)
      let text = ""
      try {
        text = await extractText(buffer, type)
      } catch (e) {
        console.error("[v0] parse error for", file.name, e)
      }
      // PostgreSQL TEXT columns reject NUL (0x00) bytes, which scanned/encoded
      // PDFs sometimes leave in extracted text (→ "invalid byte sequence for
      // UTF8: 0x00"). Strip them before storing/embedding.
      text = stripNul(text)
      combinedText += `\n\n${text}`
      const sourceId = `src_${nanoid(14)}`
      // Persist the original bytes (+ MIME) so the Course tab can hand the file
      // back in its original format, in addition to the extracted text for RAG.
      const mime = file.type || mimeForType(type)
      await query(
        `INSERT INTO sources (id, course_id, lesson_id, uploaded_by, title, file_type, content, file_data, mime_type, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [sourceId, courseId, lessonId, user.id, file.name, type, text.slice(0, 500000), buffer, mime, published],
      )
      const chunks = text.trim() ? await ingestSource({ sourceId, courseId, text }) : 0
      ingested.push({ id: sourceId, title: file.name, type, chunks })
    }

    if (pastedText.trim()) {
      combinedText += `\n\n${pastedText}`
      const sourceId = `src_${nanoid(14)}`
      await query(
        `INSERT INTO sources (id, course_id, lesson_id, uploaded_by, title, file_type, content, published)
         VALUES ($1, $2, $3, $4, $5, 'text', $6, $7)`,
        [sourceId, courseId, lessonId, user.id, pastedTitle, pastedText.slice(0, 500000), published],
      )
      const chunks = await ingestSource({ sourceId, courseId, text: pastedText })
      ingested.push({ id: sourceId, title: pastedTitle, type: "text", chunks })
    }

    // Optional: extract a curriculum topic list from the uploaded material.
    // Single source → 2-4 topics; multiple sources → 3 per source so coverage
    // scales with how much material was uploaded.
    let topics: string[] = []
    if (wantTopics && combinedText.trim().length > 40) {
      const sourceCount = ingested.length
      const target = sourceCount > 1 ? sourceCount * 3 : "2-4"
      const maxTopics = sourceCount > 1 ? sourceCount * 3 : 4
      try {
        const result = await generateJSON<{ topics: string[] }>(
          [
            "You are a curriculum designer. From the provided study material, extract a clean, ordered list of",
            "the key topics/modules a student should learn. Use concise topic titles (3-7 words).",
            `Return JSON: {"topics": [string]}. Provide ${target} topics.`,
            "Every topic must be directly relevant to and grounded in the uploaded source material — do not invent topics that are not covered. No duplicates or near-duplicates.",
          ].join("\n"),
          combinedText.slice(0, 24000),
        )
        const seen = new Set<string>()
        topics = (Array.isArray(result.topics) ? result.topics : [])
          .map(String)
          .map((t) => t.trim())
          .filter((t) => {
            const key = t.toLowerCase()
            if (!t || seen.has(key)) return false
            seen.add(key)
            return true
          })
          .slice(0, maxTopics)
      } catch (e) {
        console.error("[v0] topic extraction error:", e)
      }
    }

    // When the upload targets a specific lesson, merge any extracted topics into
    // that lesson's outline so the material becomes immediately studyable.
    if (lessonId && topics.length > 0 && applyTopics) {
      const lessonRow = await queryOne<{ outline: string[] }>(
        `SELECT outline FROM lessons WHERE id = $1 AND course_id = $2`,
        [lessonId, courseId],
      )
      if (lessonRow) {
        const existing = Array.isArray(lessonRow.outline) ? lessonRow.outline : []
        const merged = [...existing]
        for (const t of topics) if (!merged.includes(t)) merged.push(t)
        await query(`UPDATE lessons SET outline = $1::jsonb, updated_at = now() WHERE id = $2`, [
          JSON.stringify(merged),
          lessonId,
        ])
      }
    }

    await query(`UPDATE courses SET updated_at = now() WHERE id = $1`, [courseId])
    return NextResponse.json({ sources: ingested, topics })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] source upload error:", error)
    const detail = error instanceof Error ? error.message : String(error)
    // Surface the underlying reason (expired DB token, OpenAI/embedding failure,
    // parse error, …) instead of a blanket message — this is a staff-only route.
    const expired = /ExpiredToken|expired/i.test(detail)
    return NextResponse.json(
      {
        error: expired
          ? "Database session expired. Re-pull your dev env (vercel env pull) and restart, then retry."
          : `Failed to ingest source material: ${detail}`,
      },
      { status: 500 },
    )
  }
}

// List sources for a course. The course owner sees every source
// with its published flag; enrolled students see published ones only.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId } = await ctx.params
    // Any member (student/owner) may list; non-members are rejected.
    // Without this an authed user could list any course's source titles by id.
    const role = await getCourseRole(user.id, courseId)
    if (role === null) {
      const exists = await queryOne(`SELECT 1 FROM courses WHERE id = $1`, [courseId])
      return NextResponse.json({ error: exists ? "No access to course" : "Course not found" }, { status: exists ? 403 : 404 })
    }
    const staff = isCourseStaff(role)
    const { rows } = await query(
      `SELECT id, title, file_type AS type, lesson_id, published
         FROM sources
        WHERE course_id = $1 ${staff ? "" : "AND published = true"}
        ORDER BY created_at DESC`,
      [courseId],
    )
    return NextResponse.json({ sources: rows })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] list sources error:", error)
    return NextResponse.json({ error: "Failed to list sources." }, { status: 500 })
  }
}
