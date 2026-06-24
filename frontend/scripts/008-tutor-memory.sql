-- ── Tutor long-term memory ────────────────────────────────────────────────────
-- Per student+course+topic durable memory that survives a chat "clear". The
-- visible conversation lives in tutor_sessions.messages (short-term, rolling);
-- this column holds what the tutor should remember about the learner long-term:
--   { "summary": string, "facts": string[] }
-- Clearing the chat empties `messages` but leaves `memory` intact.
ALTER TABLE tutor_sessions
  ADD COLUMN IF NOT EXISTS memory JSONB NOT NULL DEFAULT '{}'::jsonb;
