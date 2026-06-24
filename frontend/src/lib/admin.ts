import { query, queryOne } from "@/lib/db"
import { relativeTime } from "@/lib/courses"

/** Server-side helpers for the admin console + support threads. */

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  )
}

export function formatJoined(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", year: "numeric" })
}

export interface PlatformUserDTO {
  id: string
  name: string
  email: string
  initials: string
  role: "teacher" | "student" | "admin"
  status: "active" | "suspended"
  joined: string
  metric: number
}

export interface SupportMessageDTO {
  id: string
  from: "user" | "admin"
  body: string
  at: string
}

export interface SupportThreadDTO {
  id: string
  userId: string
  userName: string
  userInitials: string
  userRole: "teacher" | "student" | "admin"
  messages: SupportMessageDTO[]
  lastAt: number
  unreadForAdmin: boolean
}

/** One support thread with its messages. */
export async function serializeThread(threadId: string): Promise<SupportThreadDTO | null> {
  // Thread header and its messages both key only on threadId — fetch concurrently.
  const [t, { rows }] = await Promise.all([
    queryOne<{
      id: string
      user_id: string
      unread_for_admin: boolean
      updated_at: string
      name: string
      role: string
    }>(
      `SELECT st.id, st.user_id, st.unread_for_admin, st.updated_at, u.name, u.role
         FROM support_threads st JOIN users u ON u.id = st.user_id
        WHERE st.id = $1`,
      [threadId],
    ),
    query<{ id: string; author: string; body: string; created_at: string }>(
      `SELECT id, author, body, created_at FROM support_messages WHERE thread_id = $1 ORDER BY created_at ASC`,
      [threadId],
    ),
  ])
  if (!t) return null
  return {
    id: t.id,
    userId: t.user_id,
    userName: t.name,
    userInitials: initialsOf(t.name),
    userRole: t.role as "teacher" | "student" | "admin",
    messages: rows.map((m) => ({
      id: m.id,
      from: m.author as "user" | "admin",
      body: m.body,
      at: relativeTime(m.created_at),
    })),
    lastAt: new Date(t.updated_at).getTime(),
    unreadForAdmin: t.unread_for_admin,
  }
}
