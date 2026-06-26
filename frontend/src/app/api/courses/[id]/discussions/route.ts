import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/auth";
import { resolveCourseRole, isMember, listDiscussions, createDiscussion, getDiscussion } from "@/lib/discussions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// List discussion threads the signed-in member can see (visibility-filtered).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: courseId } = await ctx.params;
    const role = await resolveCourseRole(courseId, user.id);
    if (!isMember(role)) return NextResponse.json({ error: "No access to this course." }, { status: 403 });

    const threads = await listDiscussions(courseId, { id: user.id, role });
    return NextResponse.json({ threads, role });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[v0] list discussions error:", error);
    return NextResponse.json({ error: "Failed to load discussions." }, { status: 500 });
  }
}

// Start a new thread. Any course member may post; visibility is public or private.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: courseId } = await ctx.params;
    const role = await resolveCourseRole(courseId, user.id);
    if (!isMember(role)) return NextResponse.json({ error: "No access to this course." }, { status: 403 });

    const body = (await req.json()) as { title?: unknown; body?: unknown; visibility?: unknown; recipientId?: unknown; recipient_id?: unknown; anonymous?: unknown };
    const title = String(body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });
    const visibility = body.visibility === "private" ? "private" : "public";
    const recipientId = (typeof body.recipientId === "string" ? body.recipientId : typeof body.recipient_id === "string" ? body.recipient_id : null);
    const anonymous = !!body.anonymous;

    const discussionId = await createDiscussion({
      courseId,
      authorId: user.id,
      title: title.slice(0, 300),
      body: String(body.body ?? "").trim().slice(0, 5000),
      visibility,
      recipientId,
      anonymous,
    });

    const thread = await getDiscussion(courseId, discussionId, { id: user.id, role });
    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[v0] create discussion error:", error);
    return NextResponse.json({ error: "Failed to start the thread." }, { status: 500 });
  }
}
