import { getChatClient, CHAT_MODEL } from "@/lib/openai";
import { retrieve, retrieveReranked, buildContext, type RetrievedChunk } from "@/lib/rag";

/** Durable, per learner+topic memory the tutor carries across chat resets. */
export type TutorMemory = { summary: string; facts: string[] };

export const EMPTY_MEMORY: TutorMemory = { summary: "", facts: [] };

/**
 * High-level LLM helpers for EdSynapse. All generation is grounded in retrieved
 * course material when available, with a clear fallback when it is not.
 */

const GROUNDING_RULE = `Ground every statement in the provided SOURCE MATERIAL when it is present.
If the source material does not cover something, rely on accurate general knowledge but never contradict the sources.
Do not invent citations.`;

/**
 * Shared authoring rule for quiz/assessment generation. Ensures math renders
 * nicely (LaTeX with $-delimiters, picked up by the Markdown/KaTeX renderer) and
 * that multiple-choice distractors are genuinely distinct — exactly one correct.
 */
const QUIZ_AUTHORING_RULE = `Write every question prompt and answer choice in GitHub-flavored Markdown.
Render ALL mathematical notation in LaTeX delimited ONLY with dollar signs ($...$ inline, $$...$$ display): write $\\mathbb{R}^d$, $h_{w,b}$, $w \\in \\mathbb{R}^d$, $b \\in \\mathbb{R}$ — never plain text like 'Rd' or 'R^d'.
Never use \\( \\) or \\[ \\] delimiters. Use \\{ and \\} for set braces (e.g. $\\{0, 1\\}$).
For every multiple-choice question the four options MUST be mutually distinct and non-overlapping: exactly ONE is correct and the other three are plausible but clearly incorrect distractors. No duplicate options, no two options that mean the same thing, and avoid 'all/none of the above' unless genuinely warranted. Vary which label (A-D) is correct across questions.`;

export { QUIZ_AUTHORING_RULE };

/**
 * True when a multiple-choice question's options are all meaningfully distinct
 * (case- and whitespace-insensitive). Used to validate generated quizzes so we
 * never present a student with duplicate/overlapping answer choices. Non-MCQ or
 * empty choice lists are considered valid.
 */
export function choicesAreDistinct(choices?: { label: string; text: string }[]): boolean {
  if (!choices || choices.length < 2) return true;
  const normalized = choices.map((c) => (c.text ?? "").toLowerCase().replace(/\s+/g, " ").trim());
  if (normalized.some((t) => t === "")) return false;
  return new Set(normalized).size === normalized.length;
}

/** Generate a JSON object from a system+user prompt, parsed and typed. */
export async function generateJSON<T>(
  system: string,
  user: string,
  opts?: { temperature?: number; maxTokens?: number },
): Promise<T> {
  const res = await getChatClient().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: opts?.temperature ?? 0.4,
    ...(opts?.maxTokens ? { max_tokens: opts.maxTokens } : {}),
  });

  const choice = res.choices[0];
  let content = choice?.message?.content ?? "{}";

  // If the model ran out of tokens the JSON will be incomplete. Attempt a
  // best-effort repair before surfacing a useful error to the caller.
  if (choice?.finish_reason === "length") {
    const repaired = repairTruncatedJSON(content);
    if (repaired !== null) {
      content = repaired;
    } else {
      throw new Error(
        `LLM output was truncated before JSON could be completed ` +
        `(finish_reason=length, ${content.length} chars). ` +
        `Increase maxTokens or reduce the number of topics.`,
      );
    }
  }

  return JSON.parse(content) as T;
}

/**
 * Attempt to close a truncated JSON string so it can be parsed.
 * Handles the most common case: the last string value was cut mid-character.
 * Returns the repaired string or null if it can't be fixed safely.
 */
function repairTruncatedJSON(raw: string): string | null {
  // Strip any trailing partial escape sequences or incomplete unicode.
  let s = raw.trimEnd();

  // Walk the stack to figure out what's open.
  const stack: ("object" | "array")[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("object");
    else if (ch === "[") stack.push("array");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  // If we ended mid-string, close it first (may produce a garbled last field,
  // but the surrounding structure will be valid).
  if (inString) s += '"';

  // Close any open arrays and objects.
  const closers: string[] = [];
  for (let i = stack.length - 1; i >= 0; i--) {
    closers.push(stack[i] === "object" ? "}" : "]");
  }
  s += closers.join("");

  try {
    JSON.parse(s); // validate
    return s;
  } catch {
    return null;
  }
}

/** Retrieve grounding context for a course + query. */
export async function groundedContext(courseId: string | null, queryText: string) {
  if (!courseId) return { context: "", sources: [] as { title: string; text: string }[], chunks: [] as RetrievedChunk[] };
  const chunks = await retrieve({ courseId, queryText });
  const { context, sources } = buildContext(chunks);
  return { context, sources, chunks };
}

/**
 * Retrieve grounding context using the LLM re-ranker — used by the Socratic
 * discussion bot, which scopes its questions tightly to the most relevant
 * course material.
 */
export async function rerankedContext(courseId: string | null, queryText: string) {
  if (!courseId) return { context: "", sources: [] as { title: string; text: string }[], chunks: [] as RetrievedChunk[] };
  const chunks = await retrieveReranked({ courseId, queryText });
  const { context, sources } = buildContext(chunks);
  return { context, sources, chunks };
}

export { GROUNDING_RULE };

/** Stream a grounded tutor reply as raw text deltas. */
export async function* streamTutorReply(params: {
  topic: string;
  message: string;
  context: string;
  history: { role: "user" | "assistant"; content: string }[];
  modality: string;
  pace: string;
  memory?: TutorMemory;
}): AsyncGenerator<string> {
  const system = [
    `You are EdSynapse, a patient, expert AI Tutor helping a student understand "${params.topic}".`,
    `Your primary goal is to teach the course material clearly, directly, and comprehensively when the student asks questions.`,
    `Explain concepts thoroughly with clear definitions, examples, and structured details. Do not withhold facts or answers.`,
    GROUNDING_RULE,
    `Adapt to the learner: modality preference = ${params.modality}, pace = ${params.pace}.`,
    `Explain clearly, check understanding, and encourage. Keep replies focused and not overly long.`,
    `Format your replies in Markdown (headings, bold, bullet/numbered lists, tables where helpful). Write all mathematical notation in LaTeX, delimited ONLY with dollar signs: inline math as $...$ and display equations as $$...$$. Never use \\( \\) or \\[ \\] delimiters. Use \\{ and \\} for set braces (e.g. $Y = \\{0, 1\\}$).`,
    memoryBlock(params.memory),
    params.context
      ? `\n\nSOURCE MATERIAL:\n${params.context}`
      : `\n\n(No specific source material is available for this topic; use accurate general knowledge.)`,
  ]
    .filter(Boolean)
    .join("\n");

  const stream = await getChatClient().chat.completions.create({
    model: CHAT_MODEL,
    stream: true,
    temperature: 0.6,
    messages: [
      { role: "system", content: system },
      ...params.history.slice(-8),
      { role: "user", content: params.message },
    ],
  });

  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/** Stream a Socratic tutor reply in a question-based, guide style. */
export async function* streamSocraticReply(params: {
  topic: string;
  message: string;
  context: string;
  history: { role: "user" | "assistant"; content: string }[];
  modality: string;
  pace: string;
  memory?: TutorMemory;
}): AsyncGenerator<string> {
  const system = [
    `You are EdSynapse's Socratic AI guide helping a student understand "${params.topic}".`,
    `Your style of teaching is conversational, student-centered, and question-driven.`,
    `Act as a guide rather than a lecturer. Instead of providing facts or direct explanations, ask probing, open-ended questions to challenge assumptions, expose logic flaws or contradictions, and help the student discover the truth and understanding for themselves.`,
    `Make the user wonder how to explain or teach the concept to you, so they must think critically and formulate the understanding themselves. Do NOT hand over full explanations or answers. If they ask a direct question, guide them to reason through it or ask what they think the answer is first.`,
    `- Student's Primary Role: Answering, explaining, and debating.`,
    `- Teacher's/Your Primary Role: Probing with questions, challenging logic, and exposing contradictions.`,
    `- Ultimate Cognitive Goal: Exposing logic flaws, improving critical thinking, and checking understanding.`,
    `Keep each reply brief and conversational (typically 2-4 sentences) and always end with a single, clear, probing question.`,
    `Vary how you phrase your questions — be genuinely creative and avoid formulaic openers. Do NOT repeatedly start with "What do you think". Mix it up across turns: pose a concrete scenario or edge case ("Imagine you...", "Suppose..."), challenge directly ("How would you defend...", "What breaks if..."), invite prediction ("What would happen if..."), ask for a counterexample, request an analogy, or have them critique a deliberately flawed claim. Let the question's form fit the idea, and keep the phrasing fresh from one turn to the next.`,
    GROUNDING_RULE,
    `Adapt to the learner: modality preference = ${params.modality}, pace = ${params.pace}.`,
    `Format your replies in Markdown (headings, bold, lists). Write all mathematical notation in LaTeX, delimited ONLY with dollar signs: inline math as $...$ and display equations as $$...$$. Never use \\( \\) or \\[ \\] delimiters.`,
    memoryBlock(params.memory),
    params.context
      ? `\n\nSOURCE MATERIAL:\n${params.context}`
      : `\n\n(No specific source material is available for this topic; use Socratic guiding based on general fundamentals.)`,
  ]
    .filter(Boolean)
    .join("\n");

  const stream = await getChatClient().chat.completions.create({
    model: CHAT_MODEL,
    stream: true,
    temperature: 0.8,
    messages: [
      { role: "system", content: system },
      ...params.history.slice(-8),
      { role: "user", content: params.message },
    ],
  });

  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/**
 * Stream a Socratic discussion reply. Unlike the tutor (which teaches a single
 * topic), the discussion bot probes the learner's *overall* understanding of an
 * entire course, scoped to its material. Its output is Socratic: it leads with
 * questions rather than lectures, builds on the learner's answers, and surfaces
 * gaps — always staying within the bounds of the provided course material.
 */
export async function* streamDiscussionReply(params: {
  courseName: string;
  message: string;
  context: string;
  history: { role: "user" | "assistant"; content: string }[];
}): AsyncGenerator<string> {
  const system = [
    `You are EdSynapse's Socratic discussion partner for the course "${params.courseName}".`,
    `Your goal is to assess and deepen the learner's OVERALL understanding of this course's material through dialogue.`,
    `Stay strictly within the scope of the course material below — do not drift to topics the course does not cover.`,
    GROUNDING_RULE,
    `Be genuinely Socratic: lead with one focused question at a time, build on the learner's previous answer, gently probe assumptions, and ask "why" / "how" / "what if". Do NOT lecture or hand over full explanations; draw the reasoning out of the learner.`,
    `Vary how you phrase your questions — be genuinely creative and avoid formulaic openers. Do NOT repeatedly start with "What do you think". Mix it up across turns: pose a concrete scenario or edge case ("Imagine you...", "Suppose..."), challenge directly ("How would you defend...", "What breaks if..."), invite prediction, ask for a counterexample, request an analogy, or have them critique a deliberately flawed claim. Let the question's form fit the idea, and keep the phrasing fresh from one turn to the next.`,
    `When the learner answers, briefly acknowledge what was correct, surface any gap or misconception with another question, then advance to the next idea. Keep each turn short (2-4 sentences) and end with a question.`,
    `If the learner is clearly stuck, offer a small hint, then re-ask a simpler question.`,
    `Format replies in Markdown. Write all mathematical notation in LaTeX delimited ONLY with dollar signs ($...$ inline, $$...$$ display). Never use \\( \\) or \\[ \\]. Use \\{ and \\} for set braces.`,
    params.context
      ? `\n\nCOURSE MATERIAL (the only scope for this discussion):\n${params.context}`
      : `\n\n(No specific source material is available for this course; keep the discussion to general fundamentals and ask the learner what they want to explore.)`,
  ]
    .filter(Boolean)
    .join("\n");

  const stream = await getChatClient().chat.completions.create({
    model: CHAT_MODEL,
    stream: true,
    temperature: 0.8,
    messages: [
      { role: "system", content: system },
      ...params.history.slice(-10),
      { role: "user", content: params.message },
    ],
  });

  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/** Render the tutor's long-term memory as a system-prompt block. */
function memoryBlock(memory?: TutorMemory): string {
  if (!memory || (!memory.summary && (!memory.facts || memory.facts.length === 0))) return "";
  const facts = memory.facts?.length ? memory.facts.map((f) => `- ${f}`).join("\n") : "";
  return [
    `\n\nWHAT YOU REMEMBER ABOUT THIS LEARNER (persists across sessions — use it to personalize, but do not recite it verbatim):`,
    memory.summary ? `Summary: ${memory.summary}` : "",
    facts ? `Facts:\n${facts}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Merge the latest exchange into the tutor's durable memory. Keeps a short
 * rolling summary plus a small set of stable facts about the learner. Returns
 * the previous memory unchanged on any failure (best-effort, non-blocking).
 */
export async function updateTutorMemory(params: {
  topic: string;
  prior: TutorMemory;
  userMessage: string;
  assistantMessage: string;
}): Promise<TutorMemory> {
  const system = [
    `You maintain a concise, durable memory of a learner for an AI tutor, scoped to the topic "${params.topic}".`,
    `Merge the latest exchange into the existing memory. Keep only durable, useful facts: what the learner understands, what they struggle with, their goals, misconceptions to revisit, and stated preferences. Drop trivia and pleasantries.`,
    `Return JSON: {"summary": string, "facts": string[]}. "summary" is at most 3 sentences. "facts" is at most 8 short bullet strings. Rewrite/condense rather than append blindly.`,
  ].join("\n");

  const user = [
    `EXISTING MEMORY:\n${JSON.stringify(params.prior ?? EMPTY_MEMORY)}`,
    `\nLATEST EXCHANGE:\nLearner: ${params.userMessage}\nTutor: ${params.assistantMessage}`,
    `\nReturn the updated memory JSON now.`,
  ].join("\n");

  try {
    const next = await generateJSON<TutorMemory>(system, user);
    return {
      summary: typeof next.summary === "string" ? next.summary : params.prior?.summary ?? "",
      facts: Array.isArray(next.facts) ? next.facts.filter((f) => typeof f === "string").slice(0, 8) : params.prior?.facts ?? [],
    };
  } catch {
    return params.prior ?? EMPTY_MEMORY;
  }
}
