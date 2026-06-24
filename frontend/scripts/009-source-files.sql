-- ── Original-format source files ──────────────────────────────────────────────
-- Until now `sources` kept only the extracted text (sources.content) used for
-- RAG. The Course tab lets learners upload material and download it back in its
-- original format, so we also persist the raw bytes + their MIME type. There is
-- still no S3 — originals live in Aurora alongside the extracted text, on the
-- same IAM/OIDC path as everything else.
ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS file_data BYTEA,
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(128);
