import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireUser, AuthError } from "@/lib/auth"
import { serializeCourse, requireCourseStaff, requireCourseOwner } from "@/lib/courses"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    await requireCourseStaff(user.id, id)
    const course = await serializeCourse(id)
    return NextResponse.json({ course })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] get course error:", error)
    return NextResponse.json({ error: "Failed to load course." }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    await requireCourseStaff(user.id, id)
    const body = await req.json()
    const fields: string[] = []
    const values: unknown[] = []
    let i = 1
    for (const key of ["name", "subject", "description", "color"] as const) {
      if (typeof body[key] === "string") {
        fields.push(`${key} = $${i++}`)
        values.push(body[key])
      }
    }
    if (typeof body.archived === "boolean") {
      fields.push(`archived = $${i++}`)
      values.push(body.archived)
    }
    if (fields.length > 0) {
      values.push(id)
      await query(`UPDATE courses SET ${fields.join(", ")}, updated_at = now() WHERE id = $${i}`, values)
    }
    const course = await serializeCourse(id)
    return NextResponse.json({ course })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] update course error:", error)
    return NextResponse.json({ error: "Failed to update course." }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    await requireCourseOwner(user.id, id)
    await query(`DELETE FROM courses WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] delete course error:", error)
    return NextResponse.json({ error: "Failed to delete course." }, { status: 500 })
  }
}
