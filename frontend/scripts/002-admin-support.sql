-- 002 — Admin console, support threads, and teaching assistants.
-- Additive + idempotent (safe to re-run). Builds on 001-init-schema.sql.

-- ── Users: admin role + account status ───────────────────────────────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('teacher', 'student', 'admin'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS status varchar(12) NOT NULL DEFAULT 'active';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'suspended'));

-- ── Support threads (one teacher/student ↔ admin conversation) ────────────────
CREATE TABLE IF NOT EXISTS support_threads (
  id               text PRIMARY KEY,
  user_id          text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unread_for_admin boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_threads_user ON support_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_support_threads_updated ON support_threads(updated_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id         text PRIMARY KEY,
  thread_id  text NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  author     varchar(8) NOT NULL CHECK (author IN ('user', 'admin')),
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_messages_thread ON support_messages(thread_id);

-- ── Teaching assistants (co-teacher access to a course) ───────────────────────
CREATE TABLE IF NOT EXISTS course_assistants (
  id         text PRIMARY KEY,
  course_id  text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id    text REFERENCES users(id) ON DELETE SET NULL, -- null until the invitee has an account
  email      varchar(255) NOT NULL,
  status     varchar(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, email)
);
CREATE INDEX IF NOT EXISTS idx_course_assistants_course ON course_assistants(course_id);
CREATE INDEX IF NOT EXISTS idx_course_assistants_user ON course_assistants(user_id);
