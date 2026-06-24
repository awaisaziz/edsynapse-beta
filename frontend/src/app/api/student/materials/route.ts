import { NextRequest, NextResponse } from "next/server"
import { requireUser, AuthError } from "@/lib/auth"
import { listMaterialVersions, getOrGenerateMaterials } from "@/lib/materials"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// List all saved versions of study materials for a topic.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser("student")
    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get("course_id")
    const topic = searchParams.get("topic")?.trim()
    if (!courseId || !topic) return NextResponse.json({ error: "course_id and topic are required." }, { status: 400 })

    const versions = await listMaterialVersions(user.id, courseId, topic)
    return NextResponse.json({ topic, versions })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] materials list error:", error)
    return NextResponse.json({ error: "Failed to load study materials." }, { status: 500 })
  }
}

// Get the latest version, generating + saving a new one if a new assessment was taken.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser("student")
    const body = await req.json()
    const topic = String(body.topic ?? "").trim()
    const courseId = String(body.course_id ?? "").trim()
    if (!topic || !courseId) return NextResponse.json({ error: "course_id and topic are required." }, { status: 400 })

    const latest = await getOrGenerateMaterials(user.id, courseId, topic)
    const versions = await listMaterialVersions(user.id, courseId, topic)
    return NextResponse.json({ topic, latest, versions })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] materials generate error:", error)
    return NextResponse.json({ error: "Failed to load study materials." }, { status: 500 })
  }
}
