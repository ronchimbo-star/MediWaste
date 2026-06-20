
-- Add unique constraint on session_id so upsert onConflict works
ALTER TABLE mw_audit_reports ADD CONSTRAINT mw_audit_reports_session_id_key UNIQUE (session_id);

-- Also add unique constraint on mw_audit_quote_requests.session_id (one quote per audit)
ALTER TABLE mw_audit_quote_requests ADD CONSTRAINT mw_audit_quote_requests_session_id_key UNIQUE (session_id);

-- Fix quote status check to include 'won' (admin UI uses this value)
ALTER TABLE mw_audit_quote_requests DROP CONSTRAINT mw_audit_quote_requests_status_check;
ALTER TABLE mw_audit_quote_requests ADD CONSTRAINT mw_audit_quote_requests_status_check 
  CHECK (status = ANY (ARRAY['new', 'contacted', 'quoted', 'won', 'converted', 'lost']));
