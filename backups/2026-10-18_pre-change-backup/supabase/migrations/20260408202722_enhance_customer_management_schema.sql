/*
  # Enhance Customer Management Schema

  ## Summary
  This migration adds the full customer lifecycle management infrastructure:
  a unified customer record, services attached to customers, payment tracking,
  reminders, and mailing list support.

  ## New / Enhanced Tables

  ### 1. `mw_customers` (enhanced)
  - Add `source` column to track how they came in (quote_request, quote, manual)
  - Add `source_id` to link back to origin quote/request
  - Add `notes` for internal notes
  - Add `billing_address`, `collection_address`
  - Add `payment_terms_days`, `next_payment_due`, `next_service_due`
  - Add `mailing_list_opted_in` boolean flag

  ### 2. `mw_customer_services`
  - Each customer can have multiple services
  - Links to customer, stores service type, frequency, price, status
  - Tracks next_service_date

  ### 3. `mw_customer_payments`
  - Payment records per customer
  - Tracks amount, due_date, paid_date, status, invoice reference

  ### 4. `mw_reminders`
  - System-generated and admin-created reminders
  - Type: service_due, payment_due, general
  - Linked to customer, dismissible

  ## Security
  - RLS enabled on all tables
  - Authenticated users only
*/

-- Enhance mw_customers with additional fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_customers' AND column_name = 'source') THEN
    ALTER TABLE mw_customers ADD COLUMN source text DEFAULT 'manual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_customers' AND column_name = 'source_id') THEN
    ALTER TABLE mw_customers ADD COLUMN source_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_customers' AND column_name = 'notes') THEN
    ALTER TABLE mw_customers ADD COLUMN notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_customers' AND column_name = 'billing_address') THEN
    ALTER TABLE mw_customers ADD COLUMN billing_address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_customers' AND column_name = 'collection_address') THEN
    ALTER TABLE mw_customers ADD COLUMN collection_address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_customers' AND column_name = 'payment_terms_days') THEN
    ALTER TABLE mw_customers ADD COLUMN payment_terms_days integer DEFAULT 30;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_customers' AND column_name = 'next_payment_due') THEN
    ALTER TABLE mw_customers ADD COLUMN next_payment_due date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_customers' AND column_name = 'next_service_due') THEN
    ALTER TABLE mw_customers ADD COLUMN next_service_due date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_customers' AND column_name = 'mailing_list_opted_in') THEN
    ALTER TABLE mw_customers ADD COLUMN mailing_list_opted_in boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_customers' AND column_name = 'postcode') THEN
    ALTER TABLE mw_customers ADD COLUMN postcode text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_customers' AND column_name = 'created_at') THEN
    ALTER TABLE mw_customers ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mw_customers' AND column_name = 'updated_at') THEN
    ALTER TABLE mw_customers ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Customer Services table
CREATE TABLE IF NOT EXISTS mw_customer_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES mw_customers(id) ON DELETE CASCADE,
  service_name text NOT NULL DEFAULT '',
  service_type text NOT NULL DEFAULT 'collection',
  description text,
  frequency text NOT NULL DEFAULT 'monthly',
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  start_date date,
  end_date date,
  next_service_date date,
  last_service_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mw_customer_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customer services"
  ON mw_customer_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer services"
  ON mw_customer_services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer services"
  ON mw_customer_services FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer services"
  ON mw_customer_services FOR DELETE
  TO authenticated
  USING (true);

-- Customer Payments table
CREATE TABLE IF NOT EXISTS mw_customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES mw_customers(id) ON DELETE CASCADE,
  invoice_number text,
  description text NOT NULL DEFAULT '',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  vat_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  due_date date,
  paid_date date,
  payment_method text,
  reference text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mw_customer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customer payments"
  ON mw_customer_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer payments"
  ON mw_customer_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer payments"
  ON mw_customer_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer payments"
  ON mw_customer_payments FOR DELETE
  TO authenticated
  USING (true);

-- Reminders table
CREATE TABLE IF NOT EXISTS mw_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES mw_customers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  due_date date,
  is_dismissed boolean NOT NULL DEFAULT false,
  dismissed_at timestamptz,
  is_auto_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mw_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read reminders"
  ON mw_reminders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reminders"
  ON mw_reminders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reminders"
  ON mw_reminders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reminders"
  ON mw_reminders FOR DELETE
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON mw_customer_services(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_services_status ON mw_customer_services(status);
CREATE INDEX IF NOT EXISTS idx_customer_services_next_service_date ON mw_customer_services(next_service_date);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON mw_customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_status ON mw_customer_payments(status);
CREATE INDEX IF NOT EXISTS idx_customer_payments_due_date ON mw_customer_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_customer_id ON mw_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON mw_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_dismissed ON mw_reminders(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_customers_mailing_list ON mw_customers(mailing_list_opted_in);
CREATE INDEX IF NOT EXISTS idx_customers_status ON mw_customers(status);
