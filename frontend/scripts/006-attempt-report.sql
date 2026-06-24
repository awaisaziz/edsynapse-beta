-- ── Graded per-question report on quiz attempts ───────────────────────────────
-- Stores the AI-graded breakdown (correctness + rationale per question) at grade
-- time so a past attempt can be re-opened and reviewed without re-grading. The
-- `questions`/`answers` columns already capture the raw quiz; `report` captures
-- the verdict (needed for short-answer correctness, which isn't deterministic).
ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS report JSONB NOT NULL DEFAULT '[]'::jsonb;
