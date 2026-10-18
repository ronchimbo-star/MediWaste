/*
  # Add reminder_sent field to invoices

  1. Modified Tables
    - `mw_invoices`
      - `reminder_sent` (boolean, default false) - Whether a reminder has been sent for this invoice

  2. Notes
    - Used by the admin panel to track which invoices have had reminders sent
    - Does not change any existing data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_invoices' AND column_name = 'reminder_sent'
  ) THEN
    ALTER TABLE mw_invoices ADD COLUMN reminder_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mw_invoices_due_date_status
  ON mw_invoices (due_date, status)
  WHERE status NOT IN ('paid', 'cancelled');
