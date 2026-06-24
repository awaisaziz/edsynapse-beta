-- 014 — Course-scoped roles (course membership RBAC).
-- Additive + idempotent (safe to re-run). Builds on 001 (enrollments) + 002
-- (course_assistants).
--
-- Model change: a person's access to a course is decided PER COURSE, not by
-- their global users.role. Everyone joins a class with the same student join
-- code (enrollments row); the owner can then promote a member to 'assistant'
-- (teacher-level access scoped to that one course). The same person can be a
-- student in one course and an assistant in another.
--
-- Single source of truth: exactly one membership row per (course, student) —
-- enrollments already has UNIQUE(course_id, student_id) — carrying the role.
-- The course owner stays authoritative via courses.owner_id (owners are not
-- enrolled). This replaces the old email-invite course_assistants table.

-- ── Per-course membership role ────────────────────────────────────────────────
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS role varchar(12) NOT NULL DEFAULT 'student';
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_role_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_role_check
  CHECK (role IN ('student', 'assistant'));

-- ── Migrate existing teaching assistants ──────────────────────────────────────
-- Only assistants that already have an account (user_id set) can be carried over
-- as course members; pending email-only invites are dropped with the old table.
INSERT INTO enrollments (id, course_id, student_id, role)
SELECT 'enr_' || ca.id, ca.course_id, ca.user_id, 'assistant'
  FROM course_assistants ca
 WHERE ca.user_id IS NOT NULL
ON CONFLICT (course_id, student_id)
  DO UPDATE SET role = 'assistant';

-- ── Retire the email-invite TA table ──────────────────────────────────────────
DROP TABLE IF EXISTS course_assistants;
