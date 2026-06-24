import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/auth";
import { resolveCourseRole, isMember, getDiscussion, addDiscussionPost } from "@/lib/discussions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A single thread with its replies (visibility-enforced).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; discussionId: string }> }) {
  try {
    const user = await requireUser();
    const { id: courseId, discussionId } = await ctx.params;
    const role = await resolveCourseRole(courseId, user.id);
    if (!isMember(role)) return NextResponse.json({ error: "No access to this course." }, { status: 403 });

    const thread = await getDiscussion(courseId, discussionId, { id: user.id, role });
    if (!thread) return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    return NextResponse.json({ thread });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[v0] get discussion error:", error);
    return NextResponse.json({ error: "Failed to load the thread." }, { status: 500 });
  }
}

// Reply to a thread. Only members who can see the thread may reply.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; discussionId: string }> }) {
  try {
    const user = await requireUser();
    const { id: courseId, discussionId } = await ctx.params;
    const role = await resolveCourseRole(courseId, user.id);
    if (!isMember(role)) return NextResponse.json({ error: "No access to this course." }, { status: 403 });

    // getDiscussion returns null when the thread is hidden from this viewer.
    const existing = await getDiscussion(courseId, discussionId, { id: user.id, role });
    if (!existing) return NextResponse.json({ error: "Thread not found." }, { status: 404 });

    const body = (await req.json()) as { body?: unknown };
    const text = String(body.body ?? "").trim();
    if (!text) return NextResponse.json({ error: "A reply is required." }, { status: 400 });

    await addDiscussionPost({ discussionId, authorId: user.id, body: text.slice(0, 5000) });

    const thread = await getDiscussion(courseId, discussionId, { id: user.id, role });
    return NextResponse.json({ thread });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[v0] reply discussion error:", error);
    return NextResponse.json({ error: "Failed to post the reply." }, { status: 500 });
  }
}
