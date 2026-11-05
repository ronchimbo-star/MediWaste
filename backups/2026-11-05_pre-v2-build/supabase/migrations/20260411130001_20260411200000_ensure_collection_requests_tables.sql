/*
  # Ensure Collection Requests Tables Exist

  Re-applies creation of collection request tables in case they are missing
  from the PostgREST-visible schema. Uses IF NOT EXISTS throughout.

  Tables:
  - mw_collection_requests
  - mw_collection_request_items
  - mw_collection_request_supplies

  Security: RLS enabled with anon INSERT and authenticated SELECT/UPDATE.
*/

CREATE TABLE IF NOT EXISTS mw_collection_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number        text UNIQUE,
  customer_id           uuid REFERENCES mw_customers(id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','completed')),
  preferred_date_from   date,
  preferred_date_to     date,
  preferred_days        text[],
  preferred_time_slot   text
                          CHECK (preferred_time_slot IN ('morning','midday','afternoon','any')),
  special_instructions  text,
  contact_name          text,
  contact_phone         text,
  contact_email         text,
  source                text NOT NULL DEFAULT 'qr_form',
  admin_notes           text,
  approved_date         date,
  approved_time_slot    text,
  approved_by           uuid REFERENCES mw_staff(id),
  approved_at           timestamptz,
  job_id                uuid REFERENCES mw_service_jobs(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mw_collection_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mw_collection_requests' AND policyname = 'Public can insert collection requests'
  ) THEN
    CREATE POLICY "Public can insert collection requests"
      ON mw_collection_requests FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mw_collection_requests' AND policyname = 'Authenticated users can view collection requests'
  ) THEN
    CREATE POLICY "Authenticated users can view collection requests"
      ON mw_collection_requests FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mw_collection_requests' AND policyname = 'Authenticated users can update collection requests'
  ) THEN
    CREATE POLICY "Authenticated users can update collection requests"
      ON mw_collection_requests FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS mw_collection_request_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     uuid NOT NULL REFERENCES mw_collection_requests(id) ON DELETE CASCADE,
  waste_type     text NOT NULL,
  volume_unit    text NOT NULL DEFAULT 'kg'
                   CHECK (volume_unit IN ('kg','litres','bins','bags','boxes','units')),
  quantity       numeric NOT NULL DEFAULT 1,
  container_type text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mw_collection_request_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mw_collection_request_items' AND policyname = 'Public can insert collection request items'
  ) THEN
    CREATE POLICY "Public can insert collection request items"
      ON mw_collection_request_items FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mw_collection_request_items' AND policyname = 'Authenticated users can view collection request items'
  ) THEN
    CREATE POLICY "Authenticated users can view collection request items"
      ON mw_collection_request_items FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS mw_collection_request_supplies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES mw_collection_requests(id) ON DELETE CASCADE,
  supply_type text NOT NULL,
  quantity    integer NOT NULL DEFAULT 1,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mw_collection_request_supplies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mw_collection_request_supplies' AND policyname = 'Public can insert collection request supplies'
  ) THEN
    CREATE POLICY "Public can insert collection request supplies"
      ON mw_collection_request_supplies FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mw_collection_request_supplies' AND policyname = 'Authenticated users can view collection request supplies'
  ) THEN
    CREATE POLICY "Authenticated users can view collection request supplies"
      ON mw_collection_request_supplies FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_service_jobs' AND column_name = 'source'
  ) THEN
    ALTER TABLE mw_service_jobs ADD COLUMN source text DEFAULT 'manual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_service_jobs' AND column_name = 'priority'
  ) THEN
    ALTER TABLE mw_service_jobs ADD COLUMN priority text DEFAULT 'standard';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_service_jobs' AND column_name = 'collection_request_id'
  ) THEN
    ALTER TABLE mw_service_jobs ADD COLUMN collection_request_id uuid
      REFERENCES mw_collection_requests(id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
