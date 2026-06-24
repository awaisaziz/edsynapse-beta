-- Versioned study materials (smart notes, flashcards, mind map, podcast) per
-- student + course + topic. A new version is generated only when the student
-- has taken an assessment for that topic since the last version was saved —
-- letting the UI show how materials evolved as the learner closed gaps.
CREATE TABLE IF NOT EXISTS study_materials (
  id              TEXT PRIMARY KEY,
  student_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic           VARCHAR(200) NOT NULL,
  version         INT NOT NULL DEFAULT 1,
  notes           JSONB NOT NULL DEFAULT '{}'::jsonb,
  flashcards      JSONB NOT NULL DEFAULT '[]'::jsonb,
  podcast         JSONB NOT NULL DEFAULT '{}'::jsonb,
  quiz_attempt_id TEXT REFERENCES quiz_attempts(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id, topic, version)
);
CREATE INDEX IF NOT EXISTS idx_study_materials_lookup ON study_materials(student_id, course_id, topic);
