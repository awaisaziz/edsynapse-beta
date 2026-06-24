import OpenAI from "openai";

/**
 * Server-side OpenAI client for EdSynapse.
 *
 * Powers both the LLM features (tutor chat, quiz/assessment generation, grading)
 * and the RAG pipeline (embeddings for source material + query-time retrieval).
 * Chat model is OPENAI_MODEL (default gpt-4o-mini); embeddings are fixed to
 * text-embedding-3-small to match the pgvector(1536) column.
 *
 * SERVER ONLY — never import this into a client component. The API key lives in
 * OPENAI_API_KEY (see .env.example); set it in .env.local for dev and in the
 * Vercel project's Environment Variables for deploy.
 */

// Model config in one place so it's easy to swap later.
export const CHAT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
export const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims — matches the pgvector(1536) column

// Lazy singleton — constructing OpenAI without a key throws, so we defer until
// first use to keep `next build` working before the key is configured.
let client: OpenAI | null = null;

/** OpenAI client for chat + embeddings. */
export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local (see .env.example) or the Vercel project env vars.",
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

/** Client for chat/tutor/grading. */
export function getChatClient(): OpenAI {
  return getOpenAI();
}

/** Embed a single string for RAG retrieval. Returns a 1536-dim vector. */
export async function embed(input: string): Promise<number[]> {
  const res = await getOpenAI().embeddings.create({ model: EMBEDDING_MODEL, input });
  return res.data[0].embedding;
}

/** Embed many chunks at once (used when ingesting uploaded source material). */
export async function embedBatch(inputs: string[]): Promise<number[][]> {
  const res = await getOpenAI().embeddings.create({ model: EMBEDDING_MODEL, input: inputs });
  return res.data.map((d) => d.embedding);
}
