import { createHash, randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import { query, queryOne } from "@/lib/db";

/**
 * Single-use, expiring tokens for email verification and password reset.
 * SERVER ONLY.
 *
 * The raw token is returned once (to embed in an emailed link); only its
 * SHA-256 hash is stored, so a DB leak can't be used to verify/reset. Tokens
 * are looked up by hash, checked for expiry + prior use, and consumed atomically.
 */

export type TokenKind = "verify" | "reset";

const TTL_MS: Record<TokenKind, number> = {
  verify: 24 * 60 * 60 * 1000, // 24h
  reset: 60 * 60 * 1000, // 1h — short window for the more sensitive flow
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Issue a fresh token of `kind` for a user, invalidating any earlier unused
 * tokens of the same kind (so only the latest link works). Returns the raw token.
 */
export async function issueToken(userId: string, kind: TokenKind): Promise<string> {
  await query(`DELETE FROM auth_tokens WHERE user_id = $1 AND kind = $2 AND used_at IS NULL`, [userId, kind]);
  const raw = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + TTL_MS[kind]);
  await query(
    `INSERT INTO auth_tokens (id, user_id, kind, token_hash, expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [`tok_${nanoid(16)}`, userId, kind, hashToken(raw), expires.toISOString()],
  );
  return raw;
}

/**
 * Validate and consume a token. Returns the owning user id, or null if the
 * token is unknown, of the wrong kind, expired, or already used. Marks it used
 * so it can't be replayed.
 */
export async function consumeToken(raw: string, kind: TokenKind): Promise<string | null> {
  if (!raw) return null;
  const row = await queryOne<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    `SELECT id, user_id, expires_at, used_at FROM auth_tokens WHERE token_hash = $1 AND kind = $2`,
    [hashToken(raw), kind],
  );
  if (!row || row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  // Atomic consume: only succeeds if still unused, preventing a double-use race.
  const { rowCount } = await query(
    `UPDATE auth_tokens SET used_at = now() WHERE id = $1 AND used_at IS NULL`,
    [row.id],
  );
  if (rowCount === 0) return null;
  return row.user_id;
}
