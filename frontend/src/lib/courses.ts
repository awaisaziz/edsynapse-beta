import { query, queryOne } from "@/lib/db"
import { AuthError } from "@/lib/auth"

/**
 * Server-side course helpers shared across teacher + student routes.
 * Serializes Aurora rows into the shapes the frontend already expects
 * (the Course / CourseLesson DTOs in lib/edsynapseApi.ts).
 */

/**
 * A user's access level within a single course. Decided per course, NOT by the
 * global users.role: the owner (courses.owner_id), or an enrolled member whose
 * enrollments.role is 'assistant' (teacher-level) or 'student'. `null` = no
 * access to that course at all.
 */
export type CourseRole = "owner" | "assistant" | "student"

/** "Staff" = anyone who may act with teacher-level access on the course. */
export function isCourseStaff(role: CourseRole | null): boolean {
  return role === "owner" || role === "assistant"
}

/** Resolve a user's access level for a course, or null if they have none. */
export async function getCourseRole(userId: string, courseId: string): Promise<CourseRole | null> {
  const course = await queryOne<{ owner_id: string }>(`SELECT owner_id FROM courses WHERE id = $1`, [courseId])
  if (!course) return null
  if (course.owner_id === userId) return "owner"
  try {
    const enr = await queryOne<{ role: "student" | "assistant" }>(
      `SELECT role FROM enrollments WHERE course_id = $1 AND student_id = $2`,
      [courseId, userId],
    )
    return enr?.role ?? null
  } catch (e) {
    // Tolerate the pre-migration schema: if enrollments.role doesn't exist yet
    // (014-course-roles.sql not applied), treat any enrollment as a student.
    // Remove this fallback once the migration is applied everywhere.
    if ((e as { code?: string })?.code !== "42703") throw e
    const enr = await queryOne(`SELECT 1 FROM enrollments WHERE course_id = $1 AND student_id = $2`, [courseId, userId])
    return enr ? "student" : null
  }
}

/**
 * Guard for routes needing teacher-level access to a course (owner or
 * assistant). Throws AuthError(404) when the course is missing and (403) when
 * the user is a plain student or unrelated. Returns the resolved role.
 */
export async function requireCourseStaff(userId: string, courseId: string): Promise<CourseRole> {
  const role = await getCourseRole(userId, courseId)
  if (role === null) {
    // Distinguish "no such course" from "not your course" for clearer errors.
    const exists = await queryOne<{ id: string }>(`SELECT id FROM courses WHERE id = $1`, [courseId])
    throw new AuthError(exists ? 403 : 404, exists ? "You don't have access to this course" : "Course not found")
  }
  if (!isCourseStaff(role)) throw new AuthError(403, "Requires teacher access to this course")
  return role
}

/** Guard for the course owner only (e.g. delete course, manage staff). */
export async function requireCourseOwner(userId: string, courseId: string): Promise<void> {
  const role = await getCourseRole(userId, courseId)
  if (role === null) {
    const exists = await queryOne<{ id: string }>(`SELECT id FROM courses WHERE id = $1`, [courseId])
    throw new AuthError(exists ? 403 : 404, exists ? "You don't have access to this course" : "Course not found")
  }
  if (role !== "owner") throw new AuthError(403, "Only the course owner can do this")
}

export interface CourseRow {
  id: string
  owner_id: string
  kind: "class" | "self_study"
  name: string
  subject: string
  description: string
  code: string | null
  color: string
}

export interface SerializedLesson {
  id: string
  lesson: number
  title: string
  outline: string[]
  materials: { id: string; name: string; type: string; published: boolean }[]
  published: boolean
  // Per-student mastery of this lesson's topics (0–100), and how many of its
  // topics the student has been assessed on. Only meaningful when the course is
  // serialized for a specific student (opts.studentId); 0 otherwise.
  progress: number
  topicsAttempted: number
}

// Mastery weights — kept in sync with getKnowledgeMap (src/lib/knowledge.ts).
const MASTERY_WEIGHT: Record<string, number> = {
  strong: 100,
  moderate: 60,
  needs_improvement: 25,
}

export interface SerializedCourse {
  id: string
  name: string
  subject: string
  description: string
  code: string
  color: string
  kind: "class" | "self_study"
  archived: boolean
  studentCount: number
  avgProgress: number
  activeToday: number
  lastUpdated: string
  lessons: SerializedLesson[]
}

/** Generate a human-friendly unique join code, e.g. EDS-4821. */
export async function generateCourseCode(prefix = "EDS"): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`
    const exists = await queryOne(`SELECT 1 FROM courses WHERE code = $1`, [code])
    if (!exists) return code
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}`
}

/**
 * Load a full course with lessons + materials + cohort stats.
 *
 * `onlyPublishedMaterials` filters the per-lesson materials to published ones —
 * pass true for student-facing views so they never see material a teacher has
 * withheld. Teacher views omit it to see (and toggle) every material.
 */
export async function serializeCourse(
  courseId: string,
  opts?: { onlyPublishedMaterials?: boolean; studentId?: string },
): Promise<SerializedCourse | null> {
  // When serializing for a specific student, pull their per-topic mastery so we
  // can compute real per-lesson progress (topic name → level).
  const masteryByTopic = new Map<string, string>()
  if (opts?.studentId) {
    const { rows } = await query<{ topic: string; level: string }>(
      `SELECT topic, level FROM knowledge_states WHERE student_id = $1 AND course_id = $2`,
      [opts.studentId, courseId],
    )
    for (const r of rows) masteryByTopic.set(r.topic, r.level)
  }

  // These four reads are independent (all keyed only on courseId), so run them
  // concurrently instead of paying four sequential round-trips. On the rare
  // not-found case the extra three results are simply discarded.
  const [course, { rows: lessonRows }, { rows: materialRows }, { rows: statRows }] = await Promise.all([
    queryOne<CourseRow & { archived: boolean; updated_at: string }>(
      `SELECT id, owner_id, kind, name, subject, description, code, color, archived, updated_at
         FROM courses WHERE id = $1`,
      [courseId],
    ),
    query<{
      id: string
      position: number
      title: string
      outline: string[]
      published: boolean
    }>(
      `SELECT id, position, title, outline, published
         FROM lessons WHERE course_id = $1 ORDER BY position ASC`,
      [courseId],
    ),
    query<{
      id: string
      lesson_id: string | null
      title: string
      file_type: string
      published: boolean
    }>(
      `SELECT id, lesson_id, title, file_type, published FROM sources WHERE course_id = $1 ORDER BY created_at ASC`,
      [courseId],
    ),
    query<{ student_count: string }>(
      `SELECT count(*)::text AS student_count FROM enrollments WHERE course_id = $1`,
      [courseId],
    ),
  ])

  if (!course) return null
  const studentCount = Number(statRows[0]?.student_count ?? 0)

  // A lesson surfaces ONLY the sources explicitly attached to it (lesson_id ===
  // its id). Course-level uploads (lesson_id NULL) stay unfiled — they live under
  // the Course tab and can be linked to a lesson via "attach from library".
  const lessons: SerializedLesson[] = lessonRows.map((l) => {
    const outline = Array.isArray(l.outline) ? l.outline : []
    // Per-lesson progress: average mastery across the lesson's topics, counting
    // un-attempted topics as 0. A fully-mastered week = 100; untouched = 0.
    let topicsAttempted = 0
    let progress = 0
    if (opts?.studentId && outline.length > 0) {
      let total = 0
      for (const topic of outline) {
        const level = masteryByTopic.get(topic)
        if (level) {
          topicsAttempted++
          total += MASTERY_WEIGHT[level] ?? 0
        }
      }
      progress = Math.round(total / outline.length)
    }
    return {
      id: l.id,
      lesson: l.position,
      title: l.title,
      outline,
      materials: materialRows
        .filter((m) => m.lesson_id === l.id && (!opts?.onlyPublishedMaterials || m.published))
        .map((m) => ({ id: m.id, name: m.title, type: m.file_type, published: m.published })),
      published: l.published,
      progress,
      topicsAttempted,
    }
  })

  return {
    id: course.id,
    name: course.name,
    subject: course.subject,
    description: course.description,
    code: course.code ?? "",
    color: course.color,
    kind: course.kind,
    archived: course.archived,
    studentCount,
    avgProgress: 0,
    activeToday: 0,
    lastUpdated: relativeTime(course.updated_at),
    lessons,
  }
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}
