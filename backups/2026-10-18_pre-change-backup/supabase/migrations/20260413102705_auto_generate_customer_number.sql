/*
  # Auto-generate customer_number for mw_customers

  ## Problem
  The customer_number column is NOT NULL and UNIQUE, but the application
  inserts an empty string ''. This causes a unique constraint violation
  on the second insert attempt.

  ## Solution
  1. Create a sequence for customer numbers
  2. Add a trigger that auto-generates a customer number (e.g. MW-00001)
     before insert if none is provided or if it is an empty string
  3. Update any existing rows that have empty customer_number values
*/

CREATE SEQUENCE IF NOT EXISTS mw_customer_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_number IS NULL OR NEW.customer_number = '' THEN
    NEW.customer_number := 'MW-' || LPAD(nextval('mw_customer_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_customer_number ON mw_customers;

CREATE TRIGGER set_customer_number
  BEFORE INSERT ON mw_customers
  FOR EACH ROW
  EXECUTE FUNCTION generate_customer_number();

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM mw_customers WHERE customer_number = '' OR customer_number IS NULL LOOP
    UPDATE mw_customers
    SET customer_number = 'MW-' || LPAD(nextval('mw_customer_number_seq')::text, 5, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;
