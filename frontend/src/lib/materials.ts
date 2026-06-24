import { nanoid } from "nanoid"
import { query, queryOne } from "@/lib/db"
import { generateJSON, groundedContext, GROUNDING_RULE } from "@/lib/llm"

export interface MaterialNotes {
  summary: string
  sections: { heading: string; content: string }[]
  key_concepts: string[]
}

export interface MaterialFlashcard {
  front: string
  back: string
}

export interface MaterialPodcast {
  script: string
}

export interface StudyMaterialVersion {
  version: number
  notes: MaterialNotes
  flashcards: MaterialFlashcard[]
  podcast: MaterialPodcast
  quizAttemptId: string | null
  createdAt: string
}

interface StudyMaterialRow {
  version: number
  notes: MaterialNotes
  flashcards: MaterialFlashcard[]
  podcast: MaterialPodcast
  quiz_attempt_id: string | null
  created_at: string
}

function serialize(row: StudyMaterialRow): StudyMaterialVersion {
  return {
    version: row.version,
    notes: row.notes,
    flashcards: row.flashcards,
    podcast: row.podcast,
    quizAttemptId: row.quiz_attempt_id,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

/** All saved versions for a student+course+topic, oldest first. */
export async function listMaterialVersions(
  studentId: string,
  courseId: string,
  topic: string,
): Promise<StudyMaterialVersion[]> {
  const { rows } = await query<StudyMaterialRow>(
    `SELECT version, notes, flashcards, podcast, quiz_attempt_id, created_at
       FROM study_materials
      WHERE student_id = $1 AND course_id = $2 AND topic = $3
      ORDER BY version ASC`,
    [studentId, courseId, topic],
  )
  return rows.map(serialize)
}

async function generateNotes(courseId: string | null, topic: string, context: string): Promise<MaterialNotes> {
  const system = [
    "You are an expert study-notes author. Produce clear, well-structured smart notes.",
    GROUNDING_RULE,
    'Return JSON: {"summary": string, "sections": [{"heading", "content"}], "key_concepts": [string]}.',
    "3-6 sections. Content should be concise but complete, suitable for revision.",
    'Write the "summary" and each section\'s "content" in Markdown (use bold, bullet/numbered lists, and tables where helpful). Express all mathematical notation in LaTeX, delimited ONLY with dollar signs: inline math as $...$, display equations as $$...$$. Never write bare notation like R^d or X ⊆ R^d in prose — always wrap it as math, e.g. $\\mathbb{R}^d$ and $X \\subseteq \\mathbb{R}^d$. Never use \\( \\) or \\[ \\] delimiters. Use \\{ and \\} for set braces.',
    "CRITICAL JSON RULE: every backslash in LaTeX must be written as a DOUBLE backslash so the JSON string stays valid — e.g. write \\\\text{sign}, \\\\frac{a}{b}, \\\\mathbb{R}, \\\\big, \\\\in (never a single backslash, which corrupts the output).",
    context ? `\n\nSOURCE MATERIAL:\n${context}` : "\n\n(No source material; use accurate general knowledge.)",
  ].join("\n")
  const notes = await generateJSON<MaterialNotes>(system, `Topic: ${topic}. Write the notes now.`)
  return { summary: notes.summary ?? "", sections: notes.sections ?? [], key_concepts: notes.key_concepts ?? [] }
}

async function generateFlashcards(topic: string, context: string): Promise<MaterialFlashcard[]> {
  const system = [
    "You create high-quality study flashcards (question/answer pairs).",
    GROUNDING_RULE,
    'Return JSON: {"flashcards":[{"front": string, "back": string}]}. Create 8-12 cards.',
    "Fronts are concise prompts; backs are complete but succinct answers.",
    context ? `\n\nSOURCE MATERIAL:\n${context}` : "\n\n(No source material; use accurate general knowledge.)",
  ].join("\n")
  const result = await generateJSON<{ flashcards: MaterialFlashcard[] }>(system, `Topic: ${topic}. Generate the flashcards now.`)
  return result.flashcards ?? []
}

async function generatePodcast(topic: string, context: string): Promise<MaterialPodcast> {
  const system = [
    "You write short, engaging spoken-word audio lecture scripts for a study podcast.",
    GROUNDING_RULE,
    'Return JSON: {"script": string}. One narrator, 4-6 short paragraphs, conversational tone.',
    context ? `\n\nSOURCE MATERIAL:\n${context}` : "\n\n(No source material; use accurate general knowledge.)",
  ].join("\n")
  const result = await generateJSON<MaterialPodcast>(system, `Topic: ${topic}. Write the podcast script now.`)
  return { script: result.script ?? "" }
}

/**
 * Returns the latest saved version for this topic, generating + saving a new
 * one only if none exists yet, or if the student has completed an assessment
 * for this topic since the last saved version.
 */
export async function getOrGenerateMaterials(
  studentId: string,
  courseId: string,
  topic: string,
): Promise<StudyMaterialVersion> {
  const latest = await queryOne<StudyMaterialRow>(
    `SELECT version, notes, flashcards, podcast, quiz_attempt_id, created_at
       FROM study_materials
      WHERE student_id = $1 AND course_id = $2 AND topic = $3
      ORDER BY version DESC LIMIT 1`,
    [studentId, courseId, topic],
  )

  // The newest assessment that covers this topic — either a single-topic assessment
  // (topic matches) or a comprehensive one whose questions include this topic. This
  // is what decides whether to regenerate: AI runs on first view, then only once
  // per assessment taken after the latest saved revision (otherwise we serve cache).
  const latestAttempt = await queryOne<{ id: string; created_at: string }>(
    `SELECT id, created_at FROM quiz_attempts
      WHERE student_id = $1 AND course_id = $2 AND kind = 'assessment'
        AND (topic = $3 OR questions @> $4::jsonb)
      ORDER BY created_at DESC LIMIT 1`,
    [studentId, courseId, topic, JSON.stringify([{ topic }])],
  )

  const needsRegen = !latest || (latestAttempt && new Date(latestAttempt.created_at) > new Date(latest.created_at))
  if (!needsRegen && latest) return serialize(latest)

  const { context } = await groundedContext(courseId, topic)
  const [notes, flashcards, podcast] = await Promise.all([
    generateNotes(courseId, topic, context),
    generateFlashcards(topic, context),
    generatePodcast(topic, context),
  ])

  const version = (latest?.version ?? 0) + 1
  const id = `mat_${nanoid(14)}`
  try {
    const row = await queryOne<StudyMaterialRow>(
      `INSERT INTO study_materials (id, student_id, course_id, topic, version, notes, flashcards, podcast, quiz_attempt_id)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)
       RETURNING version, notes, flashcards, podcast, quiz_attempt_id, created_at`,
      [
        id,
        studentId,
        courseId,
        topic,
        version,
        JSON.stringify(notes),
        JSON.stringify(flashcards),
        JSON.stringify(podcast),
        latestAttempt?.id ?? null,
      ],
    )
    return serialize(row!)
  } catch (e) {
    // Race: a concurrent request for the same topic generated this version first
    // (this one ran ~10s of LLM calls before inserting). Unique-violation (23505)
    // → just return whatever version is now the latest instead of failing.
    if ((e as { code?: string })?.code !== "23505") throw e
    const winner = await queryOne<StudyMaterialRow>(
      `SELECT version, notes, flashcards, podcast, quiz_attempt_id, created_at
         FROM study_materials
        WHERE student_id = $1 AND course_id = $2 AND topic = $3
        ORDER BY version DESC LIMIT 1`,
      [studentId, courseId, topic],
    )
    if (winner) return serialize(winner)
    throw e
  }
}
