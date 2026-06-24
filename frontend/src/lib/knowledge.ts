import { nanoid } from "nanoid"
import { query } from "@/lib/db"

export type Level = "strong" | "moderate" | "needs_improvement"

export function scoreToLevel(pct: number): Level {
  if (pct >= 75) return "strong"
  if (pct >= 45) return "moderate"
  return "needs_improvement"
}

/** Upsert a student's mastery level for a topic within a course. */
export async function upsertKnowledgeState(params: {
  studentId: string
  courseId: string | null
  topic: string
  level: Level
  evidence: string
}): Promise<void> {
  await query(
    `INSERT INTO knowledge_states (id, student_id, course_id, topic, level, evidence, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (student_id, course_id, topic)
     DO UPDATE SET level = EXCLUDED.level, evidence = EXCLUDED.evidence, updated_at = now()`,
    [`kns_${nanoid(12)}`, params.studentId, params.courseId, params.topic, params.level, params.evidence],
  )
}

export interface TopicStatus {
  topic: string
  level: Level
  evidence: string
}

/** Read a student's full knowledge map, optionally scoped to a course. */
export async function getKnowledgeMap(
  studentId: string,
  courseId?: string | null,
): Promise<{ topics: TopicStatus[]; overall_mastery: number }> {
  const params: unknown[] = [studentId]
  let where = `student_id = $1`
  if (courseId) {
    where += ` AND course_id = $2`
    params.push(courseId)
  }
  const { rows } = await query<TopicStatus>(
    `SELECT topic, level, evidence FROM knowledge_states WHERE ${where} ORDER BY updated_at DESC`,
    params,
  )
  const weight = { strong: 100, moderate: 60, needs_improvement: 25 }
  const overall =
    rows.length === 0 ? 0 : Math.round(rows.reduce((s, r) => s + weight[r.level], 0) / rows.length)
  return { topics: rows, overall_mastery: overall }
}
