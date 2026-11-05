/*
  # Create Invoice Settings Table

  1. New Tables
    - `mw_invoice_settings`
      - `id` (text, primary key) - Always 'default'
      - `bank_name` (text) - Bank name
      - `account_name` (text) - Account holder name
      - `sort_code` (text) - Sort code
      - `account_number` (text) - Account number
      - `vat_number` (text) - MediWaste VAT registration number
      - `payment_instructions` (text) - Additional payment instructions
      - `updated_at` (timestamptz) - Last updated timestamp

  2. Security
    - Enable RLS
    - Authenticated users can read settings
    - Authenticated users can update settings
*/

CREATE TABLE IF NOT EXISTS mw_invoice_settings (
  id text PRIMARY KEY DEFAULT 'default',
  bank_name text NOT NULL DEFAULT 'Tide Business Banking',
  account_name text NOT NULL DEFAULT 'Circular Horizons International LTD',
  sort_code text NOT NULL DEFAULT '04-06-05',
  account_number text NOT NULL DEFAULT '2283 7469',
  vat_number text NOT NULL DEFAULT '',
  payment_instructions text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mw_invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read invoice settings"
  ON mw_invoice_settings FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update invoice settings"
  ON mw_invoice_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert invoice settings"
  ON mw_invoice_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

INSERT INTO mw_invoice_settings (id, bank_name, account_name, sort_code, account_number, vat_number)
VALUES ('default', 'Tide Business Banking', 'Circular Horizons International LTD', '04-06-05', '2283 7469', '')
ON CONFLICT (id) DO NOTHING;
