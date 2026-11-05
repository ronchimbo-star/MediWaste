/*
  # Fix mw_certificate_alerts table schema

  ## Summary
  The generate_certificate_alerts and get_active_certificate_alerts functions
  insert/query an alert_date column that was missing from the table definition.
  This adds the missing column.

  ## Changes
  - Add `alert_date` (date) column to mw_certificate_alerts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_certificate_alerts' AND column_name = 'alert_date'
  ) THEN
    ALTER TABLE mw_certificate_alerts ADD COLUMN alert_date date;
  END IF;
END $$;
