import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { query, queryOne } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { serializeCourse } from "@/lib/courses"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Join a class by its invite code.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("student")
    const body = await req.json()
    const code = String(body.code ?? "").trim().toUpperCase()
    if (!code) return NextResponse.json({ error: "Class code is required." }, { status: 400 })

    const course = await queryOne<{ id: string }>(
      `SELECT id FROM courses WHERE upper(code) = $1 AND kind = 'class'`,
      [code],
    )
    if (!course) return NextResponse.json({ error: `No class found for "${code}".` }, { status: 404 })

    await query(
      `INSERT INTO enrollments (id, course_id, student_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (course_id, student_id) DO NOTHING`,
      [`enr_${nanoid(14)}`, course.id, user.id],
    )
    const serialized = await serializeCourse(course.id, { onlyPublishedMaterials: true, studentId: user.id })
    return NextResponse.json({ course: serialized })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] join class error:", error)
    return NextResponse.json({ error: "Failed to join class." }, { status: 500 })
  }
}
