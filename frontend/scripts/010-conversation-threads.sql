-- ── Named conversation threads (Chat + Discussion tabs) ───────────────────────
-- The Chat and Discussion tabs now support multiple saved threads per course,
-- like a chat history rail. Each thread is a tutor_sessions row keyed by a
-- prefixed topic ('__chat__:<id>' or '__disc__:<id>'); this column holds its
-- human-readable title. Per-topic Learning tutor rows leave it NULL.
ALTER TABLE tutor_sessions
  ADD COLUMN IF NOT EXISTS title TEXT;
