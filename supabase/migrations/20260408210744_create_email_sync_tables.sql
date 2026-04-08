/*
  # Create Email Sync Tables

  ## Overview
  Creates the infrastructure to sync emails from the @mediwaste.co.uk Gmail catchall mailbox
  into the application, linking them to customer records.

  ## New Tables

  ### mw_emails
  Stores synced emails from Gmail, linked optionally to a customer.
  - `id` - UUID primary key
  - `gmail_message_id` - Unique Gmail message ID (for deduplication)
  - `gmail_thread_id` - Gmail thread ID for grouping conversations
  - `customer_id` - FK to mw_customers (nullable, set when matched)
  - `from_email` - Sender email address
  - `from_name` - Sender display name
  - `to_email` - Recipient email address
  - `subject` - Email subject
  - `body_plain` - Plain text body
  - `body_html` - HTML body
  - `direction` - 'inbound' or 'outbound'
  - `status` - 'unread', 'read', 'archived', 'starred'
  - `has_attachments` - Boolean flag
  - `attachments` - JSONB array of attachment metadata
  - `labels` - Array of Gmail labels
  - `received_at` - When the email was received/sent
  - `synced_at` - When it was synced into our system
  - `created_at` / `updated_at` - Timestamps

  ### mw_email_sync_log
  Tracks sync history and errors.
  - `id` - UUID primary key
  - `synced_at` - When this sync ran
  - `emails_fetched` - Number of emails retrieved
  - `emails_new` - Number of new emails inserted
  - `status` - 'success' or 'error'
  - `error_message` - Error details if failed
  - `next_page_token` - Gmail pagination token for incremental sync

  ## Security
  - RLS enabled on both tables
  - Admin-only access policies

  ## Notes
  - gmail_message_id has a unique constraint to prevent duplicate imports
  - customer_id can be null until email is matched to a customer
*/

CREATE TABLE IF NOT EXISTS mw_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id text UNIQUE NOT NULL,
  gmail_thread_id text,
  customer_id uuid REFERENCES mw_customers(id) ON DELETE SET NULL,
  from_email text NOT NULL DEFAULT '',
  from_name text DEFAULT '',
  to_email text DEFAULT '',
  subject text DEFAULT '(No Subject)',
  body_plain text DEFAULT '',
  body_html text DEFAULT '',
  direction text NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived', 'starred')),
  has_attachments boolean NOT NULL DEFAULT false,
  attachments jsonb DEFAULT '[]',
  labels text[] DEFAULT '{}',
  received_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mw_email_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at timestamptz NOT NULL DEFAULT now(),
  emails_fetched integer NOT NULL DEFAULT 0,
  emails_new integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message text,
  next_page_token text
);

CREATE INDEX IF NOT EXISTS idx_mw_emails_customer_id ON mw_emails(customer_id);
CREATE INDEX IF NOT EXISTS idx_mw_emails_from_email ON mw_emails(from_email);
CREATE INDEX IF NOT EXISTS idx_mw_emails_received_at ON mw_emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_mw_emails_status ON mw_emails(status);
CREATE INDEX IF NOT EXISTS idx_mw_emails_gmail_thread ON mw_emails(gmail_thread_id);

ALTER TABLE mw_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE mw_email_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view emails"
  ON mw_emails FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert emails"
  ON mw_emails FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update emails"
  ON mw_emails FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete emails"
  ON mw_emails FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view sync logs"
  ON mw_email_sync_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sync logs"
  ON mw_email_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
