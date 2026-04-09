/*
  # Certificates RLS Policies

  Ensures RLS is enabled on all certificate tables and adds policies for:
  - mw_certificates: admin full access, public read via qr_code_token
  - mw_certificate_settings: admin full access
  - mw_certificate_alerts: admin full access

  Also ensures certificate_number sequence exists for auto-generation.
*/

ALTER TABLE mw_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mw_certificate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mw_certificate_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mw_certificates' AND policyname = 'Admins can manage certificates') THEN
    CREATE POLICY "Admins can manage certificates"
      ON mw_certificates
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'employee')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'employee')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mw_certificates' AND policyname = 'Public can view certificate by QR token') THEN
    CREATE POLICY "Public can view certificate by QR token"
      ON mw_certificates
      FOR SELECT
      TO anon, authenticated
      USING (qr_code_token IS NOT NULL AND status = 'active');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mw_certificate_settings' AND policyname = 'Admins can manage certificate settings') THEN
    CREATE POLICY "Admins can manage certificate settings"
      ON mw_certificate_settings
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'employee')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'employee')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mw_certificate_settings' AND policyname = 'Public can read certificate settings') THEN
    CREATE POLICY "Public can read certificate settings"
      ON mw_certificate_settings
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mw_certificate_alerts' AND policyname = 'Admins can manage certificate alerts') THEN
    CREATE POLICY "Admins can manage certificate alerts"
      ON mw_certificate_alerts
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'employee')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'employee')
        )
      );
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS mw_certificate_number_seq START 3;

CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS text AS $$
DECLARE
  year_part text;
  seq_num int;
  cert_num text;
BEGIN
  year_part := to_char(NOW(), 'YYYY');
  seq_num := nextval('mw_certificate_number_seq');
  cert_num := 'CERT-' || year_part || '-' || lpad(seq_num::text, 5, '0');
  RETURN cert_num;
END;
$$ LANGUAGE plpgsql;
