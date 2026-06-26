import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/auth";
import {
  resolveCourseRole,
  isMember,
  getDiscussion,
  addDiscussionPost,
  updateDiscussion,
  deleteDiscussion,
  updateDiscussionPost,
  deleteDiscussionPost,
} from "@/lib/discussions";

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

// Edit a thread (title, body, visibility) or a reply post (body).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; discussionId: string }> }) {
  try {
    const user = await requireUser();
    const { id: courseId, discussionId } = await ctx.params;
    const role = await resolveCourseRole(courseId, user.id);
    if (!isMember(role)) return NextResponse.json({ error: "No access to this course." }, { status: 403 });

    const body = (await req.json()) as { postId?: unknown; title?: unknown; body?: unknown; visibility?: unknown };
    const postId = typeof body.postId === "string" ? body.postId : null;

    if (postId) {
      // Edit a reply post
      const replyBody = String(body.body ?? "").trim();
      if (!replyBody) return NextResponse.json({ error: "Reply body is required." }, { status: 400 });
      const ok = await updateDiscussionPost(postId, user.id, replyBody.slice(0, 5000));
      if (!ok) return NextResponse.json({ error: "Failed to update reply (or not authorized)." }, { status: 403 });
    } else {
      // Edit thread
      const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : undefined;
      const threadBody = typeof body.body === "string" ? body.body.trim().slice(0, 5000) : undefined;
      const visibility = body.visibility === "private" || body.visibility === "public" ? body.visibility : undefined;

      const ok = await updateDiscussion(courseId, discussionId, { id: user.id, role }, { title, body: threadBody, visibility });
      if (!ok) return NextResponse.json({ error: "Failed to update thread (or not authorized)." }, { status: 403 });
    }

    const thread = await getDiscussion(courseId, discussionId, { id: user.id, role });
    return NextResponse.json({ thread });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[v0] update discussion error:", error);
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }
}

// Delete a thread or a reply post.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; discussionId: string }> }) {
  try {
    const user = await requireUser();
    const { id: courseId, discussionId } = await ctx.params;
    const role = await resolveCourseRole(courseId, user.id);
    if (!isMember(role)) return NextResponse.json({ error: "No access to this course." }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId") || searchParams.get("post_id");

    if (postId) {
      // Delete reply post
      const ok = await deleteDiscussionPost(courseId, discussionId, postId, { id: user.id, role });
      if (!ok) return NextResponse.json({ error: "Failed to delete reply (or not authorized)." }, { status: 403 });
    } else {
      // Delete thread
      const ok = await deleteDiscussion(courseId, discussionId, { id: user.id, role });
      if (!ok) return NextResponse.json({ error: "Failed to delete thread (or not authorized)." }, { status: 403 });
    }

    // Return the updated thread if a reply was deleted, or null/empty if the thread was deleted.
    if (postId) {
      const thread = await getDiscussion(courseId, discussionId, { id: user.id, role });
      return NextResponse.json({ thread });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[v0] delete discussion error:", error);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}
