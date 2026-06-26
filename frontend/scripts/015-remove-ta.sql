-- 015 — Remove the teaching-assistant (TA) concept entirely.
-- Additive + idempotent (safe to re-run).
--
-- TAs were modeled as enrollments.role = 'assistant' (introduced in 014). The
-- feature has been removed: every course member is simply a student, and
-- teacher-level access to a course is the course owner (courses.owner_id) only.
-- Drop the now-unused membership role column and its CHECK constraint.

ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_role_check;
ALTER TABLE enrollments DROP COLUMN IF EXISTS role;
