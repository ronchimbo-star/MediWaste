/*
  # Enhance Invoicing System

  1. Modified Tables
    - `mw_invoice_line_items`
      - `po_number` (text, nullable) - Purchase order number per line item
      - `vat_rate` (numeric, default 20) - VAT rate per line item
      - `vat_amount` (numeric, default 0) - Calculated VAT amount
    - `mw_invoices`
      - `po_number` (text, nullable) - Master PO number for entire invoice
      - `payment_terms` (text, nullable) - Payment terms text
      - `billing_address` (text, nullable) - Customer billing address snapshot
      - `is_recurring` (boolean, default false) - Whether this is a recurring invoice
      - `recurring_frequency` (text, nullable) - monthly, quarterly, annually
      - `recurring_next_date` (date, nullable) - Next auto-generate date
      - `recurring_source_id` (uuid, nullable) - Original invoice this was generated from
      - `vat_number` (text, nullable) - VAT registration number
    - `mw_payments`
      - `proof_of_payment_url` (text, nullable) - URL to proof of payment image
      - `status` (text, default 'completed') - Payment status

  2. New Tables
    - None

  3. Security
    - No changes to existing RLS policies
    
  4. Notes
    - All new columns are nullable or have defaults to avoid breaking existing data
    - The VAT rate defaults to 20% (standard UK rate)
    - Recurring invoices can be monthly, quarterly, or annually
*/

-- Add PO number and VAT fields to line items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_invoice_line_items' AND column_name = 'po_number'
  ) THEN
    ALTER TABLE mw_invoice_line_items ADD COLUMN po_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_invoice_line_items' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE mw_invoice_line_items ADD COLUMN vat_rate numeric NOT NULL DEFAULT 20;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_invoice_line_items' AND column_name = 'vat_amount'
  ) THEN
    ALTER TABLE mw_invoice_line_items ADD COLUMN vat_amount numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add enhanced fields to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_invoices' AND column_name = 'po_number'
  ) THEN
    ALTER TABLE mw_invoices ADD COLUMN po_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_invoices' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE mw_invoices ADD COLUMN payment_terms text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_invoices' AND column_name = 'billing_address'
  ) THEN
    ALTER TABLE mw_invoices ADD COLUMN billing_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_invoices' AND column_name = 'is_recurring'
  ) THEN
    ALTER TABLE mw_invoices ADD COLUMN is_recurring boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_invoices' AND column_name = 'recurring_frequency'
  ) THEN
    ALTER TABLE mw_invoices ADD COLUMN recurring_frequency text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_invoices' AND column_name = 'recurring_next_date'
  ) THEN
    ALTER TABLE mw_invoices ADD COLUMN recurring_next_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_invoices' AND column_name = 'recurring_source_id'
  ) THEN
    ALTER TABLE mw_invoices ADD COLUMN recurring_source_id uuid REFERENCES mw_invoices(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_invoices' AND column_name = 'vat_number'
  ) THEN
    ALTER TABLE mw_invoices ADD COLUMN vat_number text;
  END IF;
END $$;

-- Add proof of payment fields to payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_payments' AND column_name = 'proof_of_payment_url'
  ) THEN
    ALTER TABLE mw_payments ADD COLUMN proof_of_payment_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_payments' AND column_name = 'status'
  ) THEN
    ALTER TABLE mw_payments ADD COLUMN status text NOT NULL DEFAULT 'completed';
  END IF;
END $$;

-- Add index for recurring invoice lookups
CREATE INDEX IF NOT EXISTS idx_mw_invoices_recurring
  ON mw_invoices (is_recurring, recurring_next_date)
  WHERE is_recurring = true;

-- Add index for recurring source lookups
CREATE INDEX IF NOT EXISTS idx_mw_invoices_recurring_source
  ON mw_invoices (recurring_source_id)
  WHERE recurring_source_id IS NOT NULL;

-- Storage policy for payment proofs (uses existing 'media' bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'media' LIMIT 1
  ) THEN
    NULL;
  END IF;
END $$;
