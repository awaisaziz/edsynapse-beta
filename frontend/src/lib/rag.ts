import { embedBatch, embed, getChatClient, CHAT_MODEL } from "@/lib/openai";
import { query, withTransaction } from "@/lib/db";
import { nanoid } from "nanoid";

/**
 * RAG pipeline: chunk source text, embed, store in pgvector, and retrieve the
 * most relevant chunks for a query at generation time. All grounding for the
 * tutor, notes, quizzes and assessments flows through here.
 */

const MAX_CHARS = 1200;
const OVERLAP = 150;

/** Split text into ~1200-char chunks on paragraph/sentence boundaries. */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + MAX_CHARS, clean.length);
    if (end < clean.length) {
      // Prefer to break at a paragraph or sentence boundary.
      const slice = clean.slice(start, end);
      const para = slice.lastIndexOf("\n\n");
      const sentence = slice.lastIndexOf(". ");
      const breakAt = para > MAX_CHARS * 0.5 ? para : sentence > MAX_CHARS * 0.5 ? sentence + 1 : -1;
      if (breakAt > 0) end = start + breakAt;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    start = end - OVERLAP;
    if (start < 0) start = 0;
    if (end >= clean.length) break;
  }
  return chunks;
}

function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

/** Chunk + embed + store source text. Returns the number of chunks stored. */
export async function ingestSource(params: {
  sourceId: string;
  courseId: string;
  text: string;
}): Promise<number> {
  const chunks = chunkText(params.text);
  if (chunks.length === 0) return 0;

  // Embed in batches of 96 to stay under token/array limits.
  const BATCH = 96;
  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const vecs = await embedBatch(slice);
    embeddings.push(...vecs);
  }

  await withTransaction(async (client) => {
    for (let i = 0; i < chunks.length; i++) {
      await client.query(
        `INSERT INTO source_chunks (source_id, course_id, chunk_index, content, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)`,
        [params.sourceId, params.courseId, i, chunks[i], toVectorLiteral(embeddings[i])],
      );
    }
  });
  return chunks.length;
}

export interface RetrievedChunk {
  content: string;
  source_title: string;
  similarity: number;
}

/**
 * Retrieve the top-k most relevant chunks for a query within a course.
 * Returns [] when the course has no embedded material (ungrounded fallback).
 */
export async function retrieve(params: {
  courseId: string;
  queryText: string;
  k?: number;
}): Promise<RetrievedChunk[]> {
  const k = params.k ?? 6;
  // Only PUBLISHED material is retrievable — count published chunks so a course
  // whose material is all unpublished short-circuits to the ungrounded fallback
  // (no wasted query embedding).
  const { rows: countRows } = await query<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM source_chunks sc JOIN sources s ON s.id = sc.source_id
      WHERE sc.course_id = $1 AND s.published = true`,
    [params.courseId],
  );
  if (Number(countRows[0]?.n ?? 0) === 0) return [];

  const qVec = await embed(params.queryText);
  const { rows } = await query<RetrievedChunk>(
    `SELECT sc.content,
            s.title AS source_title,
            1 - (sc.embedding <=> $1::vector) AS similarity
       FROM source_chunks sc
       JOIN sources s ON s.id = sc.source_id
      WHERE sc.course_id = $2 AND sc.embedding IS NOT NULL AND s.published = true
      ORDER BY sc.embedding <=> $1::vector
      LIMIT $3`,
    [toVectorLiteral(qVec), params.courseId, k],
  );
  return rows;
}

/**
 * Retrieve with a lightweight LLM re-ranker. Pulls a larger candidate set by
 * cosine similarity, then asks the model to score each candidate's relevance to
 * the query and returns the top-k reordered. This "cross-encoder style" second
 * stage is used system-wide via groundedContext() to improve grounding precision
 * for the tutor, Socratic tutor, quiz/assessment generation, flashcards, notes,
 * and the discussion bot. Falls back to plain cosine order on any failure or
 * when there is no material.
 */
export async function retrieveReranked(params: {
  courseId: string;
  queryText: string;
  k?: number;
  candidates?: number;
}): Promise<RetrievedChunk[]> {
  const k = params.k ?? 6;
  const candidateCount = params.candidates ?? Math.max(k * 3, 18);
  const candidates = await retrieve({ courseId: params.courseId, queryText: params.queryText, k: candidateCount });
  if (candidates.length <= k) return candidates;

  try {
    const passages = candidates
      .map((c, i) => `[${i}] (source: ${c.source_title})\n${c.content.slice(0, 600)}`)
      .join("\n\n");
    const system = [
      "You are a precise relevance re-ranker for a retrieval system.",
      "Score how well each numbered passage helps answer or discuss the QUERY, on a 0-10 scale (10 = directly on point).",
      'Return JSON only: {"scores": [{"i": <passage index>, "score": <0-10>}]}. Include every passage index exactly once.',
    ].join("\n");
    const userPrompt = `QUERY:\n${params.queryText}\n\nPASSAGES:\n${passages}`;
    const res = await getChatClient().chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}") as {
      scores?: { i: number; score: number }[];
    };
    const scores = Array.isArray(parsed.scores) ? parsed.scores : [];
    if (scores.length === 0) return candidates.slice(0, k);
    const scoreById = new Map<number, number>();
    for (const s of scores) {
      if (typeof s.i === "number" && typeof s.score === "number") scoreById.set(s.i, s.score);
    }
    return candidates
      .map((c, i) => ({ chunk: c, score: scoreById.get(i) ?? -1 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((r) => r.chunk);
  } catch {
    return candidates.slice(0, k);
  }
}

/** Build a grounded context block + citation list from retrieved chunks. */
export function buildContext(chunks: RetrievedChunk[]): { context: string; sources: { title: string; text: string }[] } {
  if (chunks.length === 0) return { context: "", sources: [] };
  const context = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.source_title}]\n${c.content}`)
    .join("\n\n---\n\n");
  const sources = chunks.map((c) => ({ title: c.source_title, text: c.content.slice(0, 240) }));
  return { context, sources };
}
