-- Email verification, password reset, and login rate limiting.
-- Idempotent: safe to re-run.

-- Whether the user has proven ownership of their email address.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

-- Single-use, expiring tokens for email verification and password reset.
-- We store only a SHA-256 hash of the token; the raw token lives only in the
-- emailed link, so a DB leak does not let an attacker complete a reset.
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('verify', 'reset')),
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_tokens_user_kind_idx ON auth_tokens (user_id, kind);

-- Failed-login ledger for rate limiting. We record only failures (and clear the
-- relevant rows on a successful login), keyed by both email and client IP so we
-- can throttle credential-stuffing against either dimension.
CREATE TABLE IF NOT EXISTS login_attempts (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_email_idx ON login_attempts (email, created_at);
CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON login_attempts (ip, created_at);
