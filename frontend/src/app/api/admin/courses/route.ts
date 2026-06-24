import { NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { query } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export interface AdminCourseDTO {
  id: string
  name: string
  subject: string
  code: string
  color: string
  ownerName: string
  studentCount: number
  lessonCount: number
}

interface CourseRow {
  id: string
  name: string
  subject: string
  code: string | null
  color: string
  owner_name: string
  student_count: string
  lesson_count: string
}

// GET → every course platform-wide with owner + counts.
export async function GET() {
  try {
    await requireUser("admin")
    const { rows } = await query<CourseRow>(
      `SELECT c.id, c.name, c.subject, c.code, c.color,
              u.name AS owner_name,
              (SELECT count(*) FROM enrollments e WHERE e.course_id = c.id)::text AS student_count,
              (SELECT count(*) FROM lessons l WHERE l.course_id = c.id)::text AS lesson_count
         FROM courses c
         JOIN users u ON u.id = c.owner_id
        ORDER BY c.created_at DESC`,
    )
    const courses: AdminCourseDTO[] = rows.map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      code: c.code ?? "",
      color: c.color,
      ownerName: c.owner_name,
      studentCount: Number(c.student_count),
      lessonCount: Number(c.lesson_count),
    }))
    return NextResponse.json({ courses })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] list courses error:", error)
    return NextResponse.json({ error: "Failed to load courses." }, { status: 500 })
  }
}
