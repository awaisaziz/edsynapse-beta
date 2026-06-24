-- Drop demo/guest infrastructure added by 003-demo-guest.sql (now removed).
-- Idempotent: safe to re-run.

ALTER TABLE users DROP COLUMN IF EXISTS is_guest;

DROP TABLE IF EXISTS demo_requests;
