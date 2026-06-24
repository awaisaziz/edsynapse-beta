import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Stream a source back in its original uploaded format. `?inline=1` opens it in
// the browser (e.g. a PDF viewer); otherwise it downloads as an attachment.
// Access is allowed to the course owner or any enrolled student.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; sourceId: string }> }) {
  try {
    const user = await requireUser()
    const { id: courseId, sourceId } = await ctx.params

    const access = await queryOne(
      `SELECT 1 FROM courses c WHERE c.id = $1 AND (
          c.owner_id = $2 OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $2))`,
      [courseId, user.id],
    )
    if (!access) return NextResponse.json({ error: "No access to course" }, { status: 403 })

    const source = await queryOne<{
      title: string
      mime_type: string | null
      file_data: Buffer | null
      content: string
    }>(`SELECT title, mime_type, file_data, content FROM sources WHERE id = $1 AND course_id = $2`, [sourceId, courseId])
    if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 })

    const inline = new URL(req.url).searchParams.get("inline") === "1"
    const safeName = source.title.replace(/[^\w.\-() ]+/g, "_") || "source"

    // Original bytes when we have them; otherwise fall back to the extracted text
    // (covers pasted notes and sources uploaded before original-format storage).
    const body: Buffer = source.file_data ?? Buffer.from(source.content ?? "", "utf-8")
    const mime = source.file_data ? source.mime_type || "application/octet-stream" : "text/plain; charset=utf-8"
    const filename = source.file_data ? safeName : `${safeName}.txt`

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Content-Length": String(body.length),
        "Cache-Control": "private, max-age=0, no-store",
      },
    })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] download source error:", error)
    return NextResponse.json({ error: "Failed to download source." }, { status: 500 })
  }
}
