-- ── Per-source publish control ────────────────────────────────────────────────
-- Teachers control which uploaded materials reach students. An unpublished
-- source is hidden from students' material list AND excluded from RAG grounding,
-- so the tutor/quizzes/notes never draw on it. Defaults to TRUE so all existing
-- material stays visible; teachers can unpublish what they want to withhold.
ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT true;
