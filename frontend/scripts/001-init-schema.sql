-- EdSynapse core schema (Aurora PostgreSQL)
-- Idempotent: safe to re-run.

-- pgvector for RAG grounding (embeddings). If the extension is unavailable on
-- the cluster, source_chunks.embedding falls back gracefully (see 002).
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Users & sessions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          VARCHAR(120) NOT NULL,
  role          VARCHAR(10) NOT NULL CHECK (role IN ('teacher', 'student')),
  institution   VARCHAR(160) DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ── Courses (teacher classes) + self-study sets (student-owned) ───────────────
CREATE TABLE IF NOT EXISTS courses (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        VARCHAR(12) NOT NULL DEFAULT 'class' CHECK (kind IN ('class', 'self_study')),
  name        VARCHAR(160) NOT NULL,
  subject     VARCHAR(120) DEFAULT '',
  description  TEXT DEFAULT '',
  code        VARCHAR(20) UNIQUE,           -- join code for classes; null for self-study
  color       VARCHAR(16) DEFAULT '#0066cc',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courses_owner ON courses(owner_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);

-- ── Lessons / topics within a course ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  id          TEXT PRIMARY KEY,
  course_id   TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position    INT NOT NULL DEFAULT 1,
  title       VARCHAR(200) NOT NULL,
  outline     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- string[] of subpoints
  published   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);

-- ── Enrollments (students ↔ classes) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id          TEXT PRIMARY KEY,
  course_id   TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);

-- ── Source material + RAG chunks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sources (
  id          TEXT PRIMARY KEY,
  course_id   TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id   TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  file_type   VARCHAR(16) NOT NULL DEFAULT 'text',  -- pdf|docx|xlsx|text
  content     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sources_course ON sources(course_id);

CREATE TABLE IF NOT EXISTS source_chunks (
  id          BIGSERIAL PRIMARY KEY,
  source_id   TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  course_id   TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(1536),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chunks_course ON source_chunks(course_id);
CREATE INDEX IF NOT EXISTS idx_chunks_source ON source_chunks(source_id);
-- Approximate nearest-neighbour index for cosine similarity retrieval.
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON source_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ── Knowledge map (per student, per topic, scoped to a course) ────────────────
CREATE TABLE IF NOT EXISTS knowledge_states (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   TEXT REFERENCES courses(id) ON DELETE CASCADE,
  topic       VARCHAR(200) NOT NULL,
  level       VARCHAR(20) NOT NULL DEFAULT 'needs_improvement'
              CHECK (level IN ('strong', 'moderate', 'needs_improvement')),
  evidence    TEXT DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id, topic)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_student ON knowledge_states(student_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_course ON knowledge_states(course_id);

-- ── Quiz / assessment attempts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   TEXT REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id   TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  topic       VARCHAR(200) NOT NULL DEFAULT '',
  kind        VARCHAR(16) NOT NULL DEFAULT 'assessment'
              CHECK (kind IN ('diagnostic', 'assessment')),
  score       INT NOT NULL DEFAULT 0,
  total       INT NOT NULL DEFAULT 0,
  questions   JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers     JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_course ON quiz_attempts(course_id);

-- ── Tutor chat sessions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutor_sessions (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   TEXT REFERENCES courses(id) ON DELETE CASCADE,
  topic       VARCHAR(200) NOT NULL DEFAULT '',
  messages    JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tutor_student ON tutor_sessions(student_id);
