import { nanoid } from "nanoid";
import { query, queryOne } from "@/lib/db";

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
}

export interface DiscussionPost {
  id: string;
  body: string;
  createdAt: string;
  author: DiscussionAuthor;
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
  };
}

// Shared SELECT projection that derives each author's role within the course.
const THREAD_SELECT = `
  d.id, d.title, d.body, d.visibility, d.created_at, d.updated_at,
  u.id AS author_id, u.name AS author_name,
  CASE
    WHEN d.author_id = c.owner_id THEN 'teacher'
    ELSE 'student'
  END AS author_role,
  (SELECT count(*) FROM discussion_posts p WHERE p.discussion_id = d.id)::int AS reply_count
  FROM discussions d
  JOIN users u ON u.id = d.author_id
  JOIN courses c ON c.id = d.course_id`;

/** List the threads a viewer is allowed to see, newest activity first. */
export async function listDiscussions(
  courseId: string,
  viewer: { id: string; role: CourseRole },
): Promise<DiscussionThread[]> {
  // Staff see everything; students see public threads plus their own private ones.
  const visibility = isStaff(viewer.role)
    ? ""
    : ` AND (d.visibility = 'public' OR d.author_id = $2)`;
  const params: unknown[] = isStaff(viewer.role) ? [courseId] : [courseId, viewer.id];
  const { rows } = await query<ThreadRow>(
    `SELECT ${THREAD_SELECT}
      WHERE d.course_id = $1${visibility}
      ORDER BY d.updated_at DESC`,
    params,
  );
  return rows.map(toThread);
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
  if (thread.visibility === "private" && !isStaff(viewer.role) && thread.author.id !== viewer.id) {
    return null;
  }

  const { rows: postRows } = await query<{
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    author_name: string;
    author_role: AuthorRole;
  }>(
    `SELECT p.id, p.body, p.created_at,
            u.id AS author_id, u.name AS author_name,
            CASE
              WHEN p.author_id = c.owner_id THEN 'teacher'
              ELSE 'student'
            END AS author_role
       FROM discussion_posts p
       JOIN users u ON u.id = p.author_id
       JOIN discussions d ON d.id = p.discussion_id
       JOIN courses c ON c.id = d.course_id
      WHERE p.discussion_id = $1
      ORDER BY p.created_at ASC`,
    [discussionId],
  );

  return {
    ...thread,
    posts: postRows.map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.created_at,
      author: { id: p.author_id, name: p.author_name, initials: initialsOf(p.author_name), role: p.author_role },
    })),
  };
}

/** Create a new thread; returns its id. */
export async function createDiscussion(params: {
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  visibility: "public" | "private";
}): Promise<string> {
  const id = `dsc_${nanoid(14)}`;
  await query(
    `INSERT INTO discussions (id, course_id, author_id, title, body, visibility)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, params.courseId, params.authorId, params.title, params.body, params.visibility],
  );
  return id;
}

/** Append a reply to a thread and bump the thread's activity time. */
export async function addDiscussionPost(params: {
  discussionId: string;
  authorId: string;
  body: string;
}): Promise<void> {
  await query(
    `INSERT INTO discussion_posts (id, discussion_id, author_id, body)
     VALUES ($1, $2, $3, $4)`,
    [`dpo_${nanoid(14)}`, params.discussionId, params.authorId, params.body],
  );
  await query(`UPDATE discussions SET updated_at = now() WHERE id = $1`, [params.discussionId]);
}
