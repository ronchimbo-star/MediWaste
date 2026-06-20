ALTER TABLE mw_audit_sessions ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_audit_sessions_archived ON mw_audit_sessions(archived);

-- Allow anon to update archived (not needed, admin only — already covered by auth_all_audit_sessions)
-- No additional policies needed: authenticated users already have FOR ALL access