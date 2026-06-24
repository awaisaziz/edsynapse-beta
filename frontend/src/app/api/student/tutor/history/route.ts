import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { handle } from "@/lib/apiHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoredMessage = { role: "user" | "assistant"; content: string };

// Fetch the persisted tutor chat for a student's course+topic so the right-panel
// conversation survives reloads and revisits.
export const GET = handle(async (req: NextRequest) => {
  const user = await requireUser("student");
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("course_id");
  const topic = searchParams.get("topic") ?? "this topic";

  const row = await queryOne<{ messages: StoredMessage[] }>(
    `SELECT messages FROM tutor_sessions
       WHERE student_id = $1 AND course_id IS NOT DISTINCT FROM $2 AND topic = $3
       ORDER BY updated_at DESC LIMIT 1`,
    [user.id, courseId, topic],
  );

  const messages = Array.isArray(row?.messages) ? row!.messages : [];
  return NextResponse.json({ messages });
});

// "Reset chat": clear the visible conversation but KEEP the durable memory, so
// the tutor still remembers what the learner understands across a reset.
export const DELETE = handle(async (req: NextRequest) => {
  const user = await requireUser("student");
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("course_id");
  const topic = searchParams.get("topic") ?? "this topic";

  await query(
    `UPDATE tutor_sessions SET messages = '[]'::jsonb, updated_at = now()
       WHERE student_id = $1 AND course_id IS NOT DISTINCT FROM $2 AND topic = $3`,
    [user.id, courseId, topic],
  );

  return NextResponse.json({ ok: true });
});
