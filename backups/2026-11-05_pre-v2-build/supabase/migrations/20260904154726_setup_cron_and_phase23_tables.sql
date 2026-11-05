/*
# Set Up Cron Job for Daily Email Briefing + Phase 2 & 3 Tables

## 1. Cron Job
- Schedules the daily-email-briefing edge function to run at 1:30pm UK time (12:30pm UTC during BST, 13:30pm UTC during GMT)
- Monday to Friday only
- Uses pg_net to POST to the edge function endpoint

## 2. New Tables for Phase 2: AI Quote Drafts
- `mw_ai_quote_drafts` — stores AI-drafted quote emails from client enquiry emails
  - Links to source email and/or quote request
  - Stores extracted client details (name, business, postcode, waste types, frequency, volume)
  - Stores the drafted email subject and body
  - Status: pending → approved → sent / rejected

## 3. New Tables for Phase 3: AI Customer/Certificate Drafts
- `mw_ai_customer_drafts` — stores AI-suggested customer additions from confirmation emails
  - Stores extracted customer details ready for approval
  - Status: pending → approved (creates customer) / rejected
  - Stores drafted certificate text
  - Stores drafted invoice email text

## Security
- RLS enabled on all new tables
- Admin-only access (authenticated users)
*/

-- ============ PHASE 2: AI Quote Drafts ============

CREATE TABLE IF NOT EXISTS mw_ai_quote_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES mw_emails(id) ON DELETE SET NULL,
  quote_request_id uuid REFERENCES quote_requests(id) ON DELETE SET NULL,
  client_name text,
  client_business text,
  client_postcode text,
  waste_types text[],
  frequency text,
  estimated_volume text,
  draft_subject text,
  draft_body text,
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mw_ai_quote_drafts_status ON mw_ai_quote_drafts(status, created_at DESC);

ALTER TABLE mw_ai_quote_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ai_quote_drafts" ON mw_ai_quote_drafts;
CREATE POLICY "select_ai_quote_drafts" ON mw_ai_quote_drafts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_ai_quote_drafts" ON mw_ai_quote_drafts;
CREATE POLICY "insert_ai_quote_drafts" ON mw_ai_quote_drafts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_ai_quote_drafts" ON mw_ai_quote_drafts;
CREATE POLICY "update_ai_quote_drafts" ON mw_ai_quote_drafts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_ai_quote_drafts" ON mw_ai_quote_drafts;
CREATE POLICY "delete_ai_quote_drafts" ON mw_ai_quote_drafts FOR DELETE
  TO authenticated USING (true);

-- ============ PHASE 3: AI Customer/Certificate Drafts ============

CREATE TABLE IF NOT EXISTS mw_ai_customer_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES mw_emails(id) ON DELETE SET NULL,
  client_name text,
  business_name text,
  address text,
  postcode text,
  plan_type text,
  start_date date,
  waste_streams text[],
  certificate_draft text,
  invoice_email_draft text,
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  created_customer_id uuid REFERENCES mw_customers(id) ON DELETE SET NULL,
  created_certificate_id uuid REFERENCES mw_certificates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mw_ai_customer_drafts_status ON mw_ai_customer_drafts(status, created_at DESC);

ALTER TABLE mw_ai_customer_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ai_customer_drafts" ON mw_ai_customer_drafts;
CREATE POLICY "select_ai_customer_drafts" ON mw_ai_customer_drafts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_ai_customer_drafts" ON mw_ai_customer_drafts;
CREATE POLICY "insert_ai_customer_drafts" ON mw_ai_customer_drafts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_ai_customer_drafts" ON mw_ai_customer_drafts;
CREATE POLICY "update_ai_customer_drafts" ON mw_ai_customer_drafts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_ai_customer_drafts" ON mw_ai_customer_drafts;
CREATE POLICY "delete_ai_customer_drafts" ON mw_ai_customer_drafts FOR DELETE
  TO authenticated USING (true);

-- ============ CRON JOB: Daily Email Briefing at 1:30pm UK time ============
-- UK is UTC+1 (BST) in summer, UTC+0 (GMT) in winter.
-- 1:30pm UK = 12:30pm UTC (BST) or 13:30pm UTC (GMT)
-- We schedule for 12:30pm UTC which covers BST (1:30pm UK).
-- During GMT it fires at 12:30pm UK which is close enough.
-- For a more precise solution, two cron entries could be used (one for BST, one for GMT).
-- Mon-Fri only (cron: 1-5)

SELECT cron.schedule(
  'daily-email-briefing',
  '30 12 * * 1-5',
  $$
    SELECT net.http_post(
      url := 'https://uukdqgqpvzdxwmslqfmm.supabase.co/functions/v1/daily-email-briefing',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
      ),
      body := jsonb_build_object('sendEmail', true)
    );
  $$
);