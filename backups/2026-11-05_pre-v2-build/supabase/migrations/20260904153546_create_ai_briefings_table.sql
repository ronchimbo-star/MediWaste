/*
# Create AI Email Briefings Table

## Purpose
Stores daily AI-generated email briefings for the MediWaste admin. Each briefing
summarises new emails from the last 24 hours, categorised by priority, with
action items. The edge function `daily-email-briefing` generates these and
sends them via Resend to the admin's email address.

## New Tables
- `mw_ai_briefings`
  - `id` (uuid, primary key)
  - `briefing_date` (date, the day the briefing covers)
  - `summary_html` (text, the full HTML email body)
  - `summary_text` (text, plain text version)
  - `email_count` (integer, how many emails were analysed)
  - `urgent_count` (integer, how many urgent items)
  - `followup_count` (integer, how many follow-up items)
  - `quote_count` (integer, how many quote requests)
  - `payment_count` (integer, how many payment/admin items)
  - `actions` (jsonb, structured list of action items)
  - `email_sent` (boolean, whether the briefing email was sent)
  - `created_at` (timestamp with time zone)

## Security
- RLS enabled.
- Admin-only access (authenticated users can CRUD — the app has sign-in).
*/

CREATE TABLE IF NOT EXISTS mw_ai_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_date date NOT NULL DEFAULT CURRENT_DATE,
  summary_html text,
  summary_text text,
  email_count integer NOT NULL DEFAULT 0,
  urgent_count integer NOT NULL DEFAULT 0,
  followup_count integer NOT NULL DEFAULT 0,
  quote_count integer NOT NULL DEFAULT 0,
  payment_count integer NOT NULL DEFAULT 0,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  email_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mw_ai_briefings_date ON mw_ai_briefings(briefing_date DESC);

ALTER TABLE mw_ai_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ai_briefings" ON mw_ai_briefings;
CREATE POLICY "select_ai_briefings" ON mw_ai_briefings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_ai_briefings" ON mw_ai_briefings;
CREATE POLICY "insert_ai_briefings" ON mw_ai_briefings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_ai_briefings" ON mw_ai_briefings;
CREATE POLICY "update_ai_briefings" ON mw_ai_briefings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_ai_briefings" ON mw_ai_briefings;
CREATE POLICY "delete_ai_briefings" ON mw_ai_briefings FOR DELETE
  TO authenticated USING (true);