import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { query } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { serializeCourse, generateCourseCode } from "@/lib/courses"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// List the signed-in teacher's courses.
export async function GET() {
  try {
    const user = await requireUser("teacher")
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM courses WHERE owner_id = $1 AND kind = 'class' ORDER BY created_at DESC`,
      [user.id],
    )
    const courses = await Promise.all(rows.map((r) => serializeCourse(r.id)))
    return NextResponse.json({ courses: courses.filter(Boolean) })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] list courses error:", error)
    return NextResponse.json({ error: "Failed to load courses." }, { status: 500 })
  }
}

// Create a new course.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("teacher")
    const body = await req.json()
    const name = String(body.name ?? "").trim()
    const subject = String(body.subject ?? "").trim() || "General"
    const description = String(body.description ?? "").trim()
    const color = String(body.color ?? "#0066cc")
    if (!name) return NextResponse.json({ error: "Course name is required." }, { status: 400 })

    const id = `crs_${nanoid(14)}`
    const code = await generateCourseCode()
    await query(
      `INSERT INTO courses (id, owner_id, kind, name, subject, description, code, color)
       VALUES ($1, $2, 'class', $3, $4, $5, $6, $7)`,
      [id, user.id, name, subject, description, code, color],
    )
    const course = await serializeCourse(id)
    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] create course error:", error)
    return NextResponse.json({ error: "Failed to create course." }, { status: 500 })
  }
}
