-- 004 — User profiles + onboarding.
-- Additive + idempotent (safe to re-run). Builds on 001/002/003.
--
-- Adds first-class profile fields captured during a required post-signup
-- onboarding step (role-specific) and editable later in Settings. The existing
-- `institution` column is reused for the user's university/school.

-- ── Name parts + bio ──────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name varchar(80) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  varchar(80) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio        text        NOT NULL DEFAULT '';

-- ── Academic context ──────────────────────────────────────────────────────────
-- education_level: student level OR teacher teaching level (high_school|undergraduate|masters)
-- field:           student program/major OR teacher department/subject area
-- title:           teacher title/role (Professor, Instructor, TA, …); empty for students
ALTER TABLE users ADD COLUMN IF NOT EXISTS education_level varchar(20)  NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS field           varchar(160) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS title           varchar(80)  NOT NULL DEFAULT '';

-- ── Learning preferences (default the tutor; student-facing) ───────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_modality varchar(10)  NOT NULL DEFAULT 'text';
ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_pace     varchar(15)  NOT NULL DEFAULT 'methodical';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_modality_check;
ALTER TABLE users ADD CONSTRAINT users_modality_check
  CHECK (learning_modality IN ('visual', 'text', 'audio', 'all'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pace_check;
ALTER TABLE users ADD CONSTRAINT users_pace_check
  CHECK (learning_pace IN ('deep', 'methodical', 'regular'));

-- ── Onboarding flag ───────────────────────────────────────────────────────────
-- New signups default to false and are routed through /onboarding. Existing,
-- admin, and seed accounts are backfilled to true so they skip it.
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;
UPDATE users SET onboarded = true WHERE onboarded = false;
