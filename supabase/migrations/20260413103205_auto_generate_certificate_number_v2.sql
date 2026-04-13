/*
  # Auto-generate certificate_number for mw_certificates

  ## Problem
  A trigger references generate_certificate_number() but the function
  has an incompatible return type. Dropping and recreating it correctly.

  ## Solution
  1. Drop the broken function
  2. Create a sequence for certificate numbers
  3. Create the corrected generate_certificate_number() trigger function
  4. Attach a BEFORE INSERT trigger on mw_certificates
  5. Fix any existing rows with empty/null certificate_number
*/

DROP FUNCTION IF EXISTS generate_certificate_number() CASCADE;

CREATE SEQUENCE IF NOT EXISTS mw_certificate_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_number IS NULL OR NEW.certificate_number = '' THEN
    NEW.certificate_number := 'CERT-' || LPAD(nextval('mw_certificate_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_certificate_number ON mw_certificates;

CREATE TRIGGER set_certificate_number
  BEFORE INSERT ON mw_certificates
  FOR EACH ROW
  EXECUTE FUNCTION generate_certificate_number();

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM mw_certificates WHERE certificate_number = '' OR certificate_number IS NULL LOOP
    UPDATE mw_certificates
    SET certificate_number = 'CERT-' || LPAD(nextval('mw_certificate_number_seq')::text, 5, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;
