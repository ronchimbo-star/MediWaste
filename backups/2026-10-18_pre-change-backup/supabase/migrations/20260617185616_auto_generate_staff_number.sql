-- Auto-generate staff_number for mw_staff (mirrors customer_number trigger pattern)
CREATE SEQUENCE IF NOT EXISTS mw_staff_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_staff_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.staff_number IS NULL OR NEW.staff_number = '' THEN
    NEW.staff_number := 'STAFF-' || LPAD(nextval('mw_staff_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_staff_number ON mw_staff;

CREATE TRIGGER set_staff_number
  BEFORE INSERT ON mw_staff
  FOR EACH ROW
  EXECUTE FUNCTION generate_staff_number();

-- Fix any existing empty staff_numbers
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM mw_staff WHERE staff_number = '' OR staff_number IS NULL LOOP
    UPDATE mw_staff
    SET staff_number = 'STAFF-' || LPAD(nextval('mw_staff_number_seq')::text, 4, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;
