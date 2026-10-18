/*
# Document Notifications + Weekly Gmail Sync Cron

## Purpose
1. Tracks when admin notifies customers about generated documents (WTN, HWCN, Certificate).
2. Schedules a weekly Sunday Gmail sync to map email correspondence to customers.

## New Tables
- `mw_document_notifications` — log of every document notification email sent to a customer.
  - `document_type` — 'wtn' | 'hwcn' | 'certificate'
  - `document_id` — FK to the relevant document row
  - `customer_id` — FK to mw_customers
  - `recipient_email` — the email address used
  - `subject`, `message` — what was sent
  - `sent_by` — admin user id
  - `sent_at` — timestamp
  - `resend_count` — how many times resent

## Cron Job
- Weekly Sunday at 2am UTC (covers both BST and GMT reasonably)
- Calls the existing sync-gmail edge function to pull latest emails and map to customers
- Uses pg_net HTTP POST (same pattern as daily-email-briefing)

## Security
- RLS enabled on mw_document_notifications, admin-only (authenticated) CRUD
*/

CREATE TABLE IF NOT EXISTS mw_document_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  document_id uuid NOT NULL,
  customer_id uuid REFERENCES mw_customers(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  message text,
  sent_by uuid REFERENCES auth.users(id),
  sent_at timestamptz NOT NULL DEFAULT now(),
  resend_count integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_mw_doc_notifications_doc
  ON mw_document_notifications(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_mw_doc_notifications_customer
  ON mw_document_notifications(customer_id, sent_at DESC);

ALTER TABLE mw_document_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_doc_notifications" ON mw_document_notifications;
CREATE POLICY "select_doc_notifications" ON mw_document_notifications FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_doc_notifications" ON mw_document_notifications;
CREATE POLICY "insert_doc_notifications" ON mw_document_notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_doc_notifications" ON mw_document_notifications;
CREATE POLICY "update_doc_notifications" ON mw_document_notifications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_doc_notifications" ON mw_document_notifications;
CREATE POLICY "delete_doc_notifications" ON mw_document_notifications FOR DELETE
  TO authenticated USING (true);

-- Weekly Sunday Gmail sync at 2am UTC (Sunday = 0)
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('weekly-gmail-sync');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  PERFORM cron.schedule(
    'weekly-gmail-sync',
    '0 2 * * 0',
    $CRON$
      SELECT net.http_post(
        url := 'https://uukdqgqpvzdxwmslqfmm.supabase.co/functions/v1/sync-gmail',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
        ),
        body := jsonb_build_object('maxResults', 150)
      );
    $CRON$
  );
END $$;
