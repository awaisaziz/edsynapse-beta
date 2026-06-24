import { NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";

/**
 * DB-backed login rate limiting. SERVER ONLY.
 *
 * Vercel runs many short-lived instances, so an in-memory limiter wouldn't hold;
 * we use the Aurora `login_attempts` table (the only shared store) instead. We
 * record failed attempts keyed by email and by client IP, and block once either
 * dimension exceeds its threshold inside the rolling window.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20; // higher: shared NATs/campus networks sit behind one IP

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** True if this email or IP has too many recent failures and should be blocked. */
export async function isLoginBlocked(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const row = await queryOne<{ by_email: string; by_ip: string }>(
    `SELECT
        COUNT(*) FILTER (WHERE email = $1) AS by_email,
        COUNT(*) FILTER (WHERE ip = $2)    AS by_ip
       FROM login_attempts
      WHERE created_at > $3`,
    [email, ip, since],
  );
  const byEmail = Number(row?.by_email ?? 0);
  const byIp = Number(row?.by_ip ?? 0);
  return byEmail >= MAX_PER_EMAIL || byIp >= MAX_PER_IP;
}

export async function recordFailedLogin(email: string, ip: string): Promise<void> {
  await query(`INSERT INTO login_attempts (email, ip) VALUES ($1, $2)`, [email, ip]);
}

/** Clear an email's failures after a successful login. Also prunes old rows. */
export async function clearLoginAttempts(email: string): Promise<void> {
  const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();
  await query(`DELETE FROM login_attempts WHERE email = $1 OR created_at < $2`, [email, cutoff]);
}
