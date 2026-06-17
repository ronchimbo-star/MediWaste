-- Auto-generate job_number for mw_service_jobs (mirrors customer_number trigger pattern)
CREATE SEQUENCE IF NOT EXISTS mw_job_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    NEW.job_number := 'JOB-' || to_char(now(), 'YYYY') || '-' || LPAD(nextval('mw_job_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_job_number ON mw_service_jobs;

CREATE TRIGGER set_job_number
  BEFORE INSERT ON mw_service_jobs
  FOR EACH ROW
  EXECUTE FUNCTION generate_job_number();

-- Fix any existing empty job_numbers
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM mw_service_jobs WHERE job_number = '' OR job_number IS NULL LOOP
    UPDATE mw_service_jobs
    SET job_number = 'JOB-' || to_char(now(), 'YYYY') || '-' || LPAD(nextval('mw_job_number_seq')::text, 4, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;
