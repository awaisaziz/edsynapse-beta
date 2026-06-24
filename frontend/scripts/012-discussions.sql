-- ── Course discussion board (Piazza-style Q&A) ────────────────────────────────
-- Any course member (teacher, TA, or enrolled student) can start a thread and
-- reply. A thread is either `public` (visible to everyone on the course) or
-- `private` (visible only to its author plus the teacher and TAs).
CREATE TABLE IF NOT EXISTS discussions (
  id          text PRIMARY KEY,
  course_id   text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  author_id   text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       varchar(300) NOT NULL,
  body        text NOT NULL DEFAULT '',
  visibility  varchar(10) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_discussions_course ON discussions(course_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS discussion_posts (
  id            text PRIMARY KEY,
  discussion_id text NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  author_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_discussion_posts_thread ON discussion_posts(discussion_id, created_at ASC);
