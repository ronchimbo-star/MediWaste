/*
  # Collection Requests via QR Code

  ## Overview
  Adds a dedicated table for ad-hoc collection requests submitted by customers
  via the public QR code compliance page. Each request can have multiple waste
  line items and supply requests.

  ## New Tables
  - mw_collection_requests – main request record per customer submission
  - mw_collection_request_items – line items (waste types/volumes)
  - mw_collection_request_supplies – supplies to bring (sharps boxes, bags, etc.)

  ## Changes to mw_service_jobs
  - source column: manual | qr_request | etc.
  - priority column: standard | ad-hoc | urgent
  - collection_request_id FK: links approved request to resulting job

  ## Security
  - RLS enabled; anon INSERT allowed (public QR form); authenticated full access
*/

-- ─── mw_collection_requests ───────────────────────────────────────────────────
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

CREATE POLICY "Public can insert collection requests"
  ON mw_collection_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view collection requests"
  ON mw_collection_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update collection requests"
  ON mw_collection_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── mw_collection_request_items ─────────────────────────────────────────────
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

CREATE POLICY "Public can insert collection request items"
  ON mw_collection_request_items FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view collection request items"
  ON mw_collection_request_items FOR SELECT
  TO authenticated
  USING (true);

-- ─── mw_collection_request_supplies ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mw_collection_request_supplies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES mw_collection_requests(id) ON DELETE CASCADE,
  supply_type text NOT NULL,
  quantity    integer NOT NULL DEFAULT 1,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mw_collection_request_supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert collection request supplies"
  ON mw_collection_request_supplies FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view collection request supplies"
  ON mw_collection_request_supplies FOR SELECT
  TO authenticated
  USING (true);

-- ─── Extend mw_service_jobs ───────────────────────────────────────────────────
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

-- ─── Auto-generate request number ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS generate_collection_request_number() CASCADE;

CREATE FUNCTION generate_collection_request_number()
RETURNS TRIGGER AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  seq integer;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(request_number, '-', 3) AS integer)
  ), 0) + 1
  INTO seq
  FROM mw_collection_requests
  WHERE request_number LIKE 'CR-' || yr || '-%';

  NEW.request_number := 'CR-' || yr || '-' || LPAD(seq::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_collection_request_number
  BEFORE INSERT ON mw_collection_requests
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL)
  EXECUTE FUNCTION generate_collection_request_number();

-- ─── Update updated_at automatically ─────────────────────────────────────────
DROP FUNCTION IF EXISTS update_collection_request_timestamp() CASCADE;

CREATE FUNCTION update_collection_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_collection_request_updated
  BEFORE UPDATE ON mw_collection_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_request_timestamp();
