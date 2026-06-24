import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { query, queryOne } from "@/lib/db";

/**
 * Custom email/password auth on Aurora.
 * - Passwords hashed with scrypt + per-user salt.
 * - Sessions are opaque tokens stored in the `sessions` table, referenced by an
 *   httpOnly cookie. Identity is always derived server-side from this session.
 */

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = "edsynapse_session";
const SESSION_TTL_DAYS = 30;

/**
 * TEMPORARY dev-only auth bypass (used while real sign-in is being built out).
 * When `NEXT_PUBLIC_DEV_AUTH_BYPASS=true`, requests with no valid session are
 * resolved to the most-recent active user of the role named in the
 * `tg_dev_role` cookie (set by the middleware from `?as=teacher|student`).
 * Remove this and the matching middleware branch once auth is wired up.
 */
const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";
export const DEV_ROLE_COOKIE = "tg_dev_role";

export type Role = "teacher" | "student" | "admin";

export type LearningModality = "visual" | "text" | "audio" | "all";
export type LearningPace = "deep" | "methodical" | "regular";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  institution: string;
  status: "active" | "suspended";
  firstName: string;
  lastName: string;
  bio: string;
  educationLevel: string;
  field: string;
  title: string;
  learningModality: LearningModality;
  learningPace: LearningPace;
  onboarded: boolean;
  emailVerified: boolean;
}

/**
 * Validate a password against the signup policy: at least 8 characters with at
 * least one letter, one number, and one special character. Returns an error
 * message, or null when valid. Single source of truth for register + profile.
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(password)) return "Password must include a letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a special character.";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}

/** Create a session row + set the httpOnly cookie. */
export async function createSession(userId: string): Promise<string> {
  const token = nanoid(40);
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [token, userId, expires.toISOString()],
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await query(`DELETE FROM sessions WHERE token = $1`, [token]);
    store.delete(SESSION_COOKIE);
  }
}

type UserRow = Omit<
  SessionUser,
  "firstName" | "lastName" | "educationLevel" | "learningModality" | "learningPace" | "emailVerified"
> & {
  first_name: string;
  last_name: string;
  education_level: string;
  learning_modality: LearningModality;
  learning_pace: LearningPace;
  email_verified: boolean;
};

const USER_COLUMNS = `u.id, u.email, u.name, u.role, u.institution, u.status,
            u.first_name, u.last_name, u.bio, u.education_level, u.field, u.title,
            u.learning_modality, u.learning_pace, u.onboarded, u.email_verified`;

function mapUserRow(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    institution: row.institution,
    status: row.status,
    firstName: row.first_name,
    lastName: row.last_name,
    bio: row.bio,
    educationLevel: row.education_level,
    field: row.field,
    title: row.title,
    learningModality: row.learning_modality,
    learningPace: row.learning_pace,
    onboarded: row.onboarded,
    emailVerified: row.email_verified,
  };
}

/**
 * TEMPORARY: resolve a stand-in user for the dev auth bypass — the most-recent
 * active user matching the `tg_dev_role` cookie (defaults to teacher).
 */
async function getDevBypassUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const role = (store.get(DEV_ROLE_COOKIE)?.value as Role) || "teacher";
  const allowed: Role[] = ["teacher", "student", "admin"];
  const wanted = allowed.includes(role) ? role : "teacher";
  const row = await queryOne<UserRow>(
    `SELECT ${USER_COLUMNS}
       FROM users u
      WHERE u.role = $1 AND u.status = 'active'
      ORDER BY u.created_at DESC
      LIMIT 1`,
    [wanted],
  );
  return row ? mapUserRow(row) : null;
}

/** Resolve the logged-in user from the session cookie, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return DEV_AUTH_BYPASS ? getDevBypassUser() : null;
  }
  const row = await queryOne<UserRow & { expires_at: string }>(
    `SELECT ${USER_COLUMNS}, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = $1`,
    [token],
  );
  if (!row) {
    return DEV_AUTH_BYPASS ? getDevBypassUser() : null;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await query(`DELETE FROM sessions WHERE token = $1`, [token]);
    return DEV_AUTH_BYPASS ? getDevBypassUser() : null;
  }
  // Suspended accounts are treated as logged-out everywhere.
  if (row.status === "suspended") return null;
  return mapUserRow(row);
}

/** Throw-style guard for route handlers. Returns the user or throws a Response. */
export async function requireUser(role?: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError(401, "Not authenticated");
  }
  if (role && user.role !== role) {
    throw new AuthError(403, `Requires ${role} role`);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
