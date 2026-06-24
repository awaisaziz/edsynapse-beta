-- ── Archiving courses ─────────────────────────────────────────────────────────
-- A course owner (teacher for a class, student for a self-study space) can archive
-- their course to hide it from the main grid without deleting it. For enrolled
-- students, archiving is per-enrollment so it only hides the class for them — it
-- never affects the teacher or other students.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
