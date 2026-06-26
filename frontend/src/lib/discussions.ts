import { nanoid } from "nanoid";
import { query, queryOne } from "@/lib/db";

// Ensure table schema includes recipient_id and anonymity support
query(`
  ALTER TABLE discussions 
  ADD COLUMN IF NOT EXISTS recipient_id text REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false;

  ALTER TABLE discussion_posts
  ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false;

  CREATE TABLE IF NOT EXISTS discussion_post_upvotes (
    post_id text NOT NULL REFERENCES discussion_posts(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, user_id)
  );
`).catch((err) => {
  console.error("[Discussions Schema] Failed to ensure schema updates:", err);
});

/**
 * Course discussion board (Piazza-style). Access rules:
 *  - Members are the course owner (teacher) and enrolled students.
 *  - Public threads are visible to all members.
 *  - Private threads are visible only to their author plus the teacher.
 * SERVER ONLY.
 */

export type CourseRole = "owner" | "student" | "none";

/** How a user relates to a course — drives both access and visibility filtering. */
export async function resolveCourseRole(courseId: string, userId: string): Promise<CourseRole> {
  const course = await queryOne<{ owner_id: string }>(`SELECT owner_id FROM courses WHERE id = $1`, [courseId]);
  if (!course) return "none";
  if (course.owner_id === userId) return "owner";
  const enr = await queryOne(`SELECT 1 FROM enrollments WHERE course_id = $1 AND student_id = $2`, [courseId, userId]);
  return enr ? "student" : "none";
}

export const isStaff = (role: CourseRole) => role === "owner";
export const isMember = (role: CourseRole) => role !== "none";

export type AuthorRole = "teacher" | "student";

export interface DiscussionAuthor {
  id: string;
  name: string;
  initials: string;
  role: AuthorRole;
}

export interface DiscussionThread {
  id: string;
  title: string;
  body: string;
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
  author: DiscussionAuthor;
  replyCount: number;
  recipient?: { id: string; name: string } | null;
  isAnonymous?: boolean;
}

export interface DiscussionPost {
  id: string;
  body: string;
  createdAt: string;
  author: DiscussionAuthor;
  anonymous?: boolean;
  upvoteCount: number;
  upvotedByMe: boolean;
}

export interface DiscussionDetail extends DiscussionThread {
  posts: DiscussionPost[];
}

function initialsOf(name: string): string {
  return (
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

interface ThreadRow {
  id: string;
  title: string;
  body: string;
  visibility: "public" | "private";
  created_at: string;
  updated_at: string;
  author_id: string;
  author_name: string;
  author_role: AuthorRole;
  reply_count: number;
  recipient_id: string | null;
  recipient_name: string | null;
  anonymous: boolean;
}

function toThread(r: ThreadRow): DiscussionThread {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    visibility: r.visibility,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    author: { id: r.author_id, name: r.author_name, initials: initialsOf(r.author_name), role: r.author_role },
    replyCount: Number(r.reply_count),
    recipient: r.recipient_id ? { id: r.recipient_id, name: r.recipient_name || "" } : null,
    isAnonymous: !!r.anonymous,
  };
}

// Shared SELECT projection that derives each author's role within the course.
const THREAD_SELECT = `
  d.id, d.title, d.body, d.visibility, d.anonymous, d.created_at, d.updated_at, d.recipient_id,
  r.name AS recipient_name,
  u.id AS author_id, u.name AS author_name,
  CASE
    WHEN d.author_id = c.owner_id THEN 'teacher'
    ELSE 'student'
  END AS author_role,
  (SELECT count(*) FROM discussion_posts p WHERE p.discussion_id = d.id)::int AS reply_count
  FROM discussions d
  JOIN users u ON u.id = d.author_id
  JOIN courses c ON c.id = d.course_id
  LEFT JOIN users r ON r.id = d.recipient_id`;

/** List the threads a viewer is allowed to see, newest activity first. */
export async function listDiscussions(
  courseId: string,
  viewer: { id: string; role: CourseRole },
): Promise<DiscussionThread[]> {
  // Staff see everything; students see public threads plus their own private ones.
  const visibility = isStaff(viewer.role)
    ? ""
    : ` AND (d.visibility = 'public' OR d.author_id = $2 OR d.recipient_id = $2)`;
  const params: unknown[] = isStaff(viewer.role) ? [courseId] : [courseId, viewer.id];
  const { rows } = await query<ThreadRow>(
    `SELECT ${THREAD_SELECT}
      WHERE d.course_id = $1${visibility}
      ORDER BY d.updated_at DESC`,
    params,
  );
  
  return rows.map((r) => {
    const thread = toThread(r);
    // Mask student author if anonymous and viewer is not staff and not the author
    if (r.anonymous && !isStaff(viewer.role) && r.author_id !== viewer.id) {
      thread.author = {
        id: "",
        name: "Anonymous Student",
        initials: "AS",
        role: "student",
      };
    }
    return thread;
  });
}

/** A single thread with its replies, or null if it doesn't exist or is hidden from the viewer. */
export async function getDiscussion(
  courseId: string,
  discussionId: string,
  viewer: { id: string; role: CourseRole },
): Promise<DiscussionDetail | null> {
  const row = await queryOne<ThreadRow>(
    `SELECT ${THREAD_SELECT} WHERE d.id = $1 AND d.course_id = $2`,
    [discussionId, courseId],
  );
  if (!row) return null;
  const thread = toThread(row);
  // Enforce private visibility.
  if (thread.visibility === "private" && !isStaff(viewer.role) && thread.author.id !== viewer.id && thread.recipient?.id !== viewer.id) {
    return null;
  }

  // Mask thread author if anonymous and viewer is not teacher and not the author
  if (row.anonymous && !isStaff(viewer.role) && row.author_id !== viewer.id) {
    thread.author = {
      id: "",
      name: "Anonymous Student",
      initials: "AS",
      role: "student",
    };
  }

  const { rows: postRows } = await query<{
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    author_name: string;
    author_role: AuthorRole;
    anonymous: boolean;
    upvote_count: number;
    upvoted_by_me: boolean;
  }>(
    `SELECT p.id, p.body, p.created_at, p.anonymous,
            u.id AS author_id, u.name AS author_name,
            CASE
              WHEN p.author_id = c.owner_id THEN 'teacher'
              ELSE 'student'
            END AS author_role,
            (SELECT COUNT(*) FROM discussion_post_upvotes WHERE post_id = p.id)::int AS upvote_count,
            (SELECT EXISTS(SELECT 1 FROM discussion_post_upvotes WHERE post_id = p.id AND user_id = $2)) AS upvoted_by_me
       FROM discussion_posts p
       JOIN users u ON u.id = p.author_id
       JOIN discussions d ON d.id = p.discussion_id
       JOIN courses c ON c.id = d.course_id
      WHERE p.discussion_id = $1
      ORDER BY p.created_at ASC`,
    [discussionId, viewer.id],
  );

  return {
    ...thread,
    posts: postRows.map((p) => {
      const isAuthor = p.author_id === viewer.id;
      const isViewerStaff = isStaff(viewer.role);
      const author = { id: p.author_id, name: p.author_name, initials: initialsOf(p.author_name), role: p.author_role };
      
      // Mask reply author if anonymous and viewer is not teacher and not the author
      if (p.anonymous && !isViewerStaff && !isAuthor) {
        return {
          id: p.id,
          body: p.body,
          createdAt: p.created_at,
          anonymous: true,
          upvoteCount: Number(p.upvote_count || 0),
          upvotedByMe: !!p.upvoted_by_me,
          author: {
            id: "",
            name: "Anonymous Student",
            initials: "AS",
            role: "student" as AuthorRole,
          },
        };
      }
      return {
        id: p.id,
        body: p.body,
        createdAt: p.created_at,
        anonymous: !!p.anonymous,
        upvoteCount: Number(p.upvote_count || 0),
        upvotedByMe: !!p.upvoted_by_me,
        author,
      };
    }),
  };
}

/** Create a new thread; returns its id. */
export async function createDiscussion(params: {
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  visibility: "public" | "private";
  recipientId?: string | null;
  anonymous?: boolean;
}): Promise<string> {
  const id = `dsc_${nanoid(14)}`;
  await query(
    `INSERT INTO discussions (id, course_id, author_id, title, body, visibility, recipient_id, anonymous)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      params.courseId,
      params.authorId,
      params.title,
      params.body,
      params.visibility,
      params.recipientId || null,
      !!params.anonymous,
    ],
  );
  return id;
}

/** Append a reply to a thread and bump the thread's activity time. */
export async function addDiscussionPost(params: {
  discussionId: string;
  authorId: string;
  body: string;
  anonymous?: boolean;
}): Promise<void> {
  await query(
    `INSERT INTO discussion_posts (id, discussion_id, author_id, body, anonymous)
     VALUES ($1, $2, $3, $4, $5)`,
    [`dpo_${nanoid(14)}`, params.discussionId, params.authorId, params.body, !!params.anonymous],
  );
  await query(`UPDATE discussions SET updated_at = now() WHERE id = $1`, [params.discussionId]);
}

/** Edit thread (title, body, visibility). Author or staff only. */
export async function updateDiscussion(
  courseId: string,
  discussionId: string,
  viewer: { id: string; role: CourseRole },
  updates: { title?: string; body?: string; visibility?: "public" | "private" }
): Promise<boolean> {
  const existing = await queryOne<{ author_id: string }>(
    `SELECT author_id FROM discussions WHERE id = $1 AND course_id = $2`,
    [discussionId, courseId]
  );
  if (!existing) return false;

  const isAuthor = existing.author_id === viewer.id;
  const canEdit = isAuthor || isStaff(viewer.role);
  if (!canEdit) return false;

  const queryParts: string[] = [];
  const params: unknown[] = [];
  let index = 1;

  if (updates.title !== undefined && isAuthor) {
    queryParts.push(`title = $${index++}`);
    params.push(updates.title);
  }
  if (updates.body !== undefined && isAuthor) {
    queryParts.push(`body = $${index++}`);
    params.push(updates.body);
  }
  if (updates.visibility !== undefined && (isAuthor || isStaff(viewer.role))) {
    queryParts.push(`visibility = $${index++}`);
    params.push(updates.visibility);
  }

  if (queryParts.length === 0) return true;

  params.push(discussionId, courseId);
  const result = await query(
    `UPDATE discussions SET ${queryParts.join(", ")}, updated_at = now() 
     WHERE id = $${index++} AND course_id = $${index++}`,
    params
  );
  return result.rowCount > 0;
}

/** Delete thread. Author or staff only. */
export async function deleteDiscussion(
  courseId: string,
  discussionId: string,
  viewer: { id: string; role: CourseRole }
): Promise<boolean> {
  const existing = await queryOne<{ author_id: string }>(
    `SELECT author_id FROM discussions WHERE id = $1 AND course_id = $2`,
    [discussionId, courseId]
  );
  if (!existing) return false;

  const canDelete = existing.author_id === viewer.id || isStaff(viewer.role);
  if (!canDelete) return false;

  await query(`DELETE FROM discussions WHERE id = $1 AND course_id = $2`, [discussionId, courseId]);
  return true;
}

/** Edit a reply post. Author or course staff can update any post. For collaborative wiki answers, if the post is the first reply (oldest post in the thread), any user who has visibility to the thread can edit it. */
export async function updateDiscussionPost(
  courseId: string,
  discussionId: string,
  postId: string,
  viewer: { id: string; role: CourseRole },
  body: string
): Promise<boolean> {
  // Check thread visibility and author info
  const thread = await queryOne<{ author_id: string; visibility: "public" | "private"; recipient_id: string | null }>(
    `SELECT author_id, visibility, recipient_id FROM discussions WHERE id = $1 AND course_id = $2`,
    [discussionId, courseId]
  );
  if (!thread) return false;

  const hasThreadVisibility =
    thread.visibility === "public" ||
    isStaff(viewer.role) ||
    thread.author_id === viewer.id ||
    thread.recipient_id === viewer.id;
  if (!hasThreadVisibility) return false;

  const post = await queryOne<{ author_id: string }>(
    `SELECT author_id FROM discussion_posts WHERE id = $1 AND discussion_id = $2`,
    [postId, discussionId]
  );
  if (!post) return false;

  const isAuthor = post.author_id === viewer.id;
  const isViewerStaff = isStaff(viewer.role);

  // Check if it is the first reply (collaborative "The Answer")
  const firstReply = await queryOne<{ id: string }>(
    `SELECT id FROM discussion_posts WHERE discussion_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [discussionId]
  );
  const isFirstReply = firstReply?.id === postId;

  // Can edit if: author, course owner (staff), or (isFirstReply && user has visibility of thread)
  const canEdit = isAuthor || isViewerStaff || isFirstReply;
  if (!canEdit) return false;

  const result = await query(
    `UPDATE discussion_posts SET body = $1 WHERE id = $2 AND discussion_id = $3`,
    [body, postId, discussionId]
  );
  return result.rowCount > 0;
}

/** Delete a reply post. Author or staff only. */
export async function deleteDiscussionPost(
  courseId: string,
  discussionId: string,
  postId: string,
  viewer: { id: string; role: CourseRole }
): Promise<boolean> {
  const existing = await queryOne<{ author_id: string }>(
    `SELECT author_id FROM discussion_posts WHERE id = $1 AND discussion_id = $2`,
    [postId, discussionId]
  );
  if (!existing) return false;

  const canDelete = existing.author_id === viewer.id || isStaff(viewer.role);
  if (!canDelete) return false;

  await query(`DELETE FROM discussion_posts WHERE id = $1 AND discussion_id = $2`, [postId, discussionId]);
  return true;
}

/** Toggle an upvote on a reply post. */
export async function toggleUpvotePost(
  postId: string,
  userId: string
): Promise<{ upvoted: boolean; count: number }> {
  const existing = await queryOne<{ 1: number }>(
    `SELECT 1 FROM discussion_post_upvotes WHERE post_id = $1 AND user_id = $2`,
    [postId, userId]
  );

  if (existing) {
    await query(`DELETE FROM discussion_post_upvotes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
  } else {
    await query(`INSERT INTO discussion_post_upvotes (post_id, user_id) VALUES ($1, $2)`, [postId, userId]);
  }

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM discussion_post_upvotes WHERE post_id = $1`,
    [postId]
  );
  return {
    upvoted: !existing,
    count: Number(countRow?.count || 0),
  };
}
