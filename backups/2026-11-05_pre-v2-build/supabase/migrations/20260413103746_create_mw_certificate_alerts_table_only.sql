/*
  # Create mw_certificate_alerts table (table only)

  ## Summary
  The table was missing but RLS policies and indexes were already applied from
  previous migrations. This creates only the table structure.

  ## New Tables
  - `mw_certificate_alerts`
    - `id` (uuid, primary key)
    - `certificate_id` (uuid, FK to mw_certificates)
    - `alert_type` (text)
    - `message` (text)
    - `dismissed` (boolean)
    - `dismissed_by` (uuid, FK to auth.users)
    - `dismissed_at` (timestamptz)
    - `created_at` (timestamptz)
*/

CREATE TABLE IF NOT EXISTS mw_certificate_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid REFERENCES mw_certificates(id) ON DELETE CASCADE,
  alert_type text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  dismissed boolean NOT NULL DEFAULT false,
  dismissed_by uuid REFERENCES auth.users(id),
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mw_certificate_alerts_dismissed_by ON public.mw_certificate_alerts(dismissed_by);
CREATE INDEX IF NOT EXISTS idx_mw_certificate_alerts_certificate_id ON public.mw_certificate_alerts(certificate_id);

ALTER TABLE mw_certificate_alerts ENABLE ROW LEVEL SECURITY;
