import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireUser, AuthError, getSessionUser, type LearningModality, type LearningPace } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MODALITIES: LearningModality[] = ["visual", "text", "audio", "all"]
const PACES: LearningPace[] = ["deep", "methodical", "regular"]
const EDU_LEVELS = ["high_school", "undergraduate", "masters"]

/**
 * Update the logged-in user's profile. Backs both the onboarding step and the
 * Settings page. When `onboarded: true` is sent (onboarding completion), the
 * role-specific required fields are enforced server-side.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))

    const firstName = String(body.firstName ?? user.firstName ?? "").trim()
    const lastName = String(body.lastName ?? user.lastName ?? "").trim()
    const bio = String(body.bio ?? user.bio ?? "").trim()
    const institution = String(body.institution ?? user.institution ?? "").trim()
    const field = String(body.field ?? user.field ?? "").trim()
    const title = String(body.title ?? user.title ?? "").trim()
    const educationLevel = String(body.educationLevel ?? user.educationLevel ?? "").trim()
    const modality = MODALITIES.includes(body.learningModality)
      ? (body.learningModality as LearningModality)
      : user.learningModality
    const pace = PACES.includes(body.learningPace) ? (body.learningPace as LearningPace) : user.learningPace
    const completingOnboarding = body.onboarded === true

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First and last name are required." }, { status: 400 })
    }
    if (educationLevel && !EDU_LEVELS.includes(educationLevel)) {
      return NextResponse.json({ error: "Invalid education level." }, { status: 400 })
    }

    // Enforce role-specific required fields only when finishing onboarding.
    if (completingOnboarding) {
      if (user.role === "student") {
        if (!educationLevel) return NextResponse.json({ error: "Education level is required." }, { status: 400 })
        if (!field) return NextResponse.json({ error: "Program / field of study is required." }, { status: 400 })
      } else if (user.role === "teacher") {
        if (!institution) return NextResponse.json({ error: "University / institution is required." }, { status: 400 })
        if (!field) return NextResponse.json({ error: "Department / subject area is required." }, { status: 400 })
        if (!title) return NextResponse.json({ error: "Title / role is required." }, { status: 400 })
      }
    }

    const name = `${firstName} ${lastName}`.trim()
    const onboarded = completingOnboarding ? true : user.onboarded

    await query(
      `UPDATE users
          SET first_name = $1, last_name = $2, name = $3, bio = $4, institution = $5,
              field = $6, title = $7, education_level = $8,
              learning_modality = $9, learning_pace = $10, onboarded = $11, updated_at = now()
        WHERE id = $12`,
      [firstName, lastName, name, bio, institution, field, title, educationLevel, modality, pace, onboarded, user.id],
    )

    const updated = await getSessionUser()
    return NextResponse.json({ user: updated })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[v0] profile update error:", error)
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 })
  }
}
