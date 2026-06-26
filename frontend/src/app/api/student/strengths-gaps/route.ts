import { NextRequest, NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { getKnowledgeMap } from "@/lib/knowledge"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// The signed-in student's strengths & gaps (optionally scoped to ?course_id=).
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser("student")
    const courseId = new URL(req.url).searchParams.get("course_id")
    const map = await getKnowledgeMap(user.id, courseId)
    return NextResponse.json({ student_id: user.id, ...map })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] strengths & gaps error:", error)
    return NextResponse.json({ error: "Failed to load strengths & gaps." }, { status: 500 })
  }
}
