/*
  # Conversation-to-Invoice Workflow Schema

  ## Overview
  Extends the existing invoicing system to support a "conversation-to-invoice" workflow.
  The business owner pastes an email conversation, OpenAI extracts structured invoice data,
  and the owner reviews/edits before sending. Invoices get public URLs, PDF generation,
  payment tracking, and finance integration.

  ## 1. Modified Tables
  - mw_invoices: +30 new columns (public_token, source_type, source_conversation_id, source_quote_id, source_enquiry_id, currency, discount_amount, amount_paid, amount_due, payment_reference, payment_url, bank_details_snapshot, internal_notes, pdf_storage_path, pdf_file_name, recipient_email, email_subject, email_salutation, email_body, email_sign_off, cc_emails, bcc_emails, created_by, sent_at, viewed_at, last_viewed_at, paid_at, cancelled_at, customer_reference, site_address)
  - mw_invoice_line_items: +6 new columns (sort_order, waste_type, service_type, unit, pricing_status, source_text)
  - mw_invoice_settings: +12 new columns (trading_name, business_address, business_email, business_phone, website, company_registration_number, vat_rate_default, payment_link_url, default_payment_terms_days, invoice_prefix, invoice_include_year, invoice_padding, invoice_next_sequence)

  ## 2. New Tables
  - conversation_sources: stores pasted email conversations and AI extraction results
  - invoice_events: audit trail of all invoice lifecycle events
  - finance_transactions: income/expense records linked to invoices/payments

  ## 3. RPC Functions
  - generate_invoice_number(): MW-YYYY-NNNN format, atomic sequence
  - generate_invoice_public_token(): secure random token

  ## 4. Security
  - RLS on all new tables (authenticated-only for admin, anon read for public invoice views)
  - Public can read sent invoices by public_token
  - Public can read line items and settings for sent invoices
  - Anon can insert invoice_viewed events

  ## 5. Notes
  - All new columns nullable or defaulted to preserve existing data
  - mw_payments table reused as-is
  - Invoice numbers use DB function to prevent duplicates
*/

-- 1. Extend mw_invoices
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'public_token') THEN
    ALTER TABLE mw_invoices ADD COLUMN public_token text UNIQUE DEFAULT gen_random_uuid()::text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'source_type') THEN
    ALTER TABLE mw_invoices ADD COLUMN source_type text DEFAULT 'manual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'source_conversation_id') THEN
    ALTER TABLE mw_invoices ADD COLUMN source_conversation_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'source_quote_id') THEN
    ALTER TABLE mw_invoices ADD COLUMN source_quote_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'source_enquiry_id') THEN
    ALTER TABLE mw_invoices ADD COLUMN source_enquiry_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'currency') THEN
    ALTER TABLE mw_invoices ADD COLUMN currency text NOT NULL DEFAULT 'GBP';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'discount_amount') THEN
    ALTER TABLE mw_invoices ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'amount_paid') THEN
    ALTER TABLE mw_invoices ADD COLUMN amount_paid numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'amount_due') THEN
    ALTER TABLE mw_invoices ADD COLUMN amount_due numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'payment_reference') THEN
    ALTER TABLE mw_invoices ADD COLUMN payment_reference text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'payment_url') THEN
    ALTER TABLE mw_invoices ADD COLUMN payment_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'bank_details_snapshot') THEN
    ALTER TABLE mw_invoices ADD COLUMN bank_details_snapshot jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'internal_notes') THEN
    ALTER TABLE mw_invoices ADD COLUMN internal_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'pdf_storage_path') THEN
    ALTER TABLE mw_invoices ADD COLUMN pdf_storage_path text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'pdf_file_name') THEN
    ALTER TABLE mw_invoices ADD COLUMN pdf_file_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'recipient_email') THEN
    ALTER TABLE mw_invoices ADD COLUMN recipient_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'email_subject') THEN
    ALTER TABLE mw_invoices ADD COLUMN email_subject text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'email_salutation') THEN
    ALTER TABLE mw_invoices ADD COLUMN email_salutation text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'email_body') THEN
    ALTER TABLE mw_invoices ADD COLUMN email_body text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'email_sign_off') THEN
    ALTER TABLE mw_invoices ADD COLUMN email_sign_off text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'cc_emails') THEN
    ALTER TABLE mw_invoices ADD COLUMN cc_emails text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'bcc_emails') THEN
    ALTER TABLE mw_invoices ADD COLUMN bcc_emails text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'created_by') THEN
    ALTER TABLE mw_invoices ADD COLUMN created_by text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'sent_at') THEN
    ALTER TABLE mw_invoices ADD COLUMN sent_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'viewed_at') THEN
    ALTER TABLE mw_invoices ADD COLUMN viewed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'last_viewed_at') THEN
    ALTER TABLE mw_invoices ADD COLUMN last_viewed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'paid_at') THEN
    ALTER TABLE mw_invoices ADD COLUMN paid_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'cancelled_at') THEN
    ALTER TABLE mw_invoices ADD COLUMN cancelled_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'customer_reference') THEN
    ALTER TABLE mw_invoices ADD COLUMN customer_reference text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoices' AND column_name = 'site_address') THEN
    ALTER TABLE mw_invoices ADD COLUMN site_address text;
  END IF;
END $$;

-- 2. Extend mw_invoice_line_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_line_items' AND column_name = 'sort_order') THEN
    ALTER TABLE mw_invoice_line_items ADD COLUMN sort_order int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_line_items' AND column_name = 'waste_type') THEN
    ALTER TABLE mw_invoice_line_items ADD COLUMN waste_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_line_items' AND column_name = 'service_type') THEN
    ALTER TABLE mw_invoice_line_items ADD COLUMN service_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_line_items' AND column_name = 'unit') THEN
    ALTER TABLE mw_invoice_line_items ADD COLUMN unit text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_line_items' AND column_name = 'pricing_status') THEN
    ALTER TABLE mw_invoice_line_items ADD COLUMN pricing_status text NOT NULL DEFAULT 'confirmed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_line_items' AND column_name = 'source_text') THEN
    ALTER TABLE mw_invoice_line_items ADD COLUMN source_text text;
  END IF;
END $$;

-- 3. Extend mw_invoice_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'trading_name') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN trading_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'business_address') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN business_address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'business_email') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN business_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'business_phone') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN business_phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'website') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN website text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'company_registration_number') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN company_registration_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'vat_rate_default') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN vat_rate_default numeric NOT NULL DEFAULT 20;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'payment_link_url') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN payment_link_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'default_payment_terms_days') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN default_payment_terms_days int NOT NULL DEFAULT 30;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'invoice_prefix') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN invoice_prefix text NOT NULL DEFAULT 'MW';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'invoice_include_year') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN invoice_include_year boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'invoice_padding') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN invoice_padding int NOT NULL DEFAULT 4;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_invoice_settings' AND column_name = 'invoice_next_sequence') THEN
    ALTER TABLE mw_invoice_settings ADD COLUMN invoice_next_sequence int NOT NULL DEFAULT 1;
  END IF;
END $$;

-- 4. Create conversation_sources
CREATE TABLE IF NOT EXISTS conversation_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES mw_customers(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'email',
  subject text,
  sender_email text,
  conversation_text text NOT NULL,
  extracted_json jsonb,
  ai_warnings jsonb DEFAULT '[]'::jsonb,
  missing_information jsonb DEFAULT '[]'::jsonb,
  conflicts jsonb DEFAULT '[]'::jsonb,
  confidence_score jsonb DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE conversation_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read conversation_sources" ON conversation_sources;
CREATE POLICY "Authenticated read conversation_sources" ON conversation_sources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated insert conversation_sources" ON conversation_sources;
CREATE POLICY "Authenticated insert conversation_sources" ON conversation_sources FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated update conversation_sources" ON conversation_sources;
CREATE POLICY "Authenticated update conversation_sources" ON conversation_sources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated delete conversation_sources" ON conversation_sources;
CREATE POLICY "Authenticated delete conversation_sources" ON conversation_sources FOR DELETE TO authenticated USING (true);

-- 5. Create invoice_events
CREATE TABLE IF NOT EXISTS invoice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES mw_invoices(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  previous_status text,
  new_status text,
  created_by text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE invoice_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read invoice_events" ON invoice_events;
CREATE POLICY "Authenticated read invoice_events" ON invoice_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated insert invoice_events" ON invoice_events;
CREATE POLICY "Authenticated insert invoice_events" ON invoice_events FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Anon insert invoice_viewed events" ON invoice_events;
CREATE POLICY "Anon insert invoice_viewed events" ON invoice_events FOR INSERT TO anon, authenticated WITH CHECK (event_type = 'invoice_viewed');
DROP POLICY IF EXISTS "Authenticated update invoice_events" ON invoice_events;
CREATE POLICY "Authenticated update invoice_events" ON invoice_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated delete invoice_events" ON invoice_events;
CREATE POLICY "Authenticated delete invoice_events" ON invoice_events FOR DELETE TO authenticated USING (true);

-- 6. Create finance_transactions
CREATE TABLE IF NOT EXISTS finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Medical waste services',
  customer_id uuid REFERENCES mw_customers(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES mw_invoices(id) ON DELETE SET NULL,
  invoice_number text,
  net_amount numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  gross_amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read finance_transactions" ON finance_transactions;
CREATE POLICY "Authenticated read finance_transactions" ON finance_transactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated insert finance_transactions" ON finance_transactions;
CREATE POLICY "Authenticated insert finance_transactions" ON finance_transactions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated update finance_transactions" ON finance_transactions;
CREATE POLICY "Authenticated update finance_transactions" ON finance_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated delete finance_transactions" ON finance_transactions;
CREATE POLICY "Authenticated delete finance_transactions" ON finance_transactions FOR DELETE TO authenticated USING (true);

-- 7. Public read policies for invoice view
DROP POLICY IF EXISTS "Anon read sent invoices by token" ON mw_invoices;
CREATE POLICY "Anon read sent invoices by token" ON mw_invoices FOR SELECT TO anon, authenticated
  USING (public_token IS NOT NULL AND status IN ('sent', 'viewed', 'partially_paid', 'paid', 'overdue'));

DROP POLICY IF EXISTS "Anon read line items for sent invoices" ON mw_invoice_line_items;
CREATE POLICY "Anon read line items for sent invoices" ON mw_invoice_line_items FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM mw_invoices WHERE mw_invoices.id = mw_invoice_line_items.invoice_id AND mw_invoices.public_token IS NOT NULL AND mw_invoices.status IN ('sent', 'viewed', 'partially_paid', 'paid', 'overdue')));

DROP POLICY IF EXISTS "Anon read invoice settings" ON mw_invoice_settings;
CREATE POLICY "Anon read invoice settings" ON mw_invoice_settings FOR SELECT TO anon, authenticated USING (id = 'default');

DROP POLICY IF EXISTS "Anon read payments for sent invoices" ON mw_payments;
CREATE POLICY "Anon read payments for sent invoices" ON mw_payments FOR SELECT TO anon, authenticated
  USING (invoice_id IS NOT NULL AND EXISTS (SELECT 1 FROM mw_invoices WHERE mw_invoices.id = mw_payments.invoice_id AND mw_invoices.public_token IS NOT NULL AND mw_invoices.status IN ('sent', 'viewed', 'partially_paid', 'paid', 'overdue')));

-- 8. RPC functions
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_include_year boolean;
  v_padding int;
  v_seq int;
  v_year int;
  v_number text;
BEGIN
  SELECT invoice_prefix, invoice_include_year, invoice_padding, invoice_next_sequence
  INTO v_prefix, v_include_year, v_padding, v_seq
  FROM mw_invoice_settings WHERE id = 'default' FOR UPDATE;

  IF NOT FOUND THEN
    v_prefix := 'MW'; v_include_year := true; v_padding := 4; v_seq := 1;
  END IF;

  v_year := EXTRACT(YEAR FROM now())::int;
  v_number := v_prefix || '-' || CASE WHEN v_include_year THEN v_year || '-' ELSE '' END || lpad(v_seq::text, v_padding, '0');

  UPDATE mw_invoice_settings SET invoice_next_sequence = invoice_next_sequence + 1 WHERE id = 'default';
  RETURN v_number;
END;
$$;

CREATE OR REPLACE FUNCTION generate_invoice_public_token()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gen_random_uuid()::text;
$$;

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_mw_invoices_public_token ON mw_invoices (public_token) WHERE public_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mw_invoices_status ON mw_invoices (status);
CREATE INDEX IF NOT EXISTS idx_mw_invoices_due_date ON mw_invoices (due_date) WHERE status NOT IN ('paid', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_mw_invoices_customer_id ON mw_invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_mw_invoices_source_conversation ON mw_invoices (source_conversation_id) WHERE source_conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_sources_customer ON conversation_sources (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice ON invoice_events (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_events_type ON invoice_events (event_type);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_invoice ON finance_transactions (invoice_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_customer ON finance_transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_mw_payments_invoice ON mw_payments (invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mw_invoice_line_items_sort ON mw_invoice_line_items (invoice_id, sort_order);