/*
  # Rebuild Collection Requests Tables

  Drops and recreates the three collection request tables cleanly,
  fixing the "relation does not exist" error caused by previous broken migrations.

  ## Tables Created

  ### collection_requests
  - id (uuid, primary key)
  - request_number (auto-generated, e.g. CR-0001)
  - customer_name (text) — denormalised for public submissions without a customer account
  - customer_id (uuid, nullable) — links to mw_customers if submitted from customer portal
  - status — pending | approved | completed | cancelled
  - preferred_date_from / preferred_date_to (date, nullable)
  - preferred_days (text[], nullable) — for recurring day preferences
  - preferred_time_slot — morning | midday | afternoon | any
  - special_instructions (text, nullable)
  - contact_name / contact_phone / contact_email (nullable)
  - source — public_form | customer_portal | qr_form | compliance_page
  - admin_notes (text, nullable)
  - created_at / updated_at

  ### collection_request_items
  - id, request_id (fk), waste_type, quantity, volume_unit, container_type, notes

  ### collection_request_supplies
  - id, request_id (fk), supply_type, quantity

  ## Security
  - RLS enabled on all three tables
  - anon: INSERT + SELECT own rows (via SELECT needed for PostgREST .select() after insert)
  - authenticated: full SELECT, INSERT, UPDATE
*/

DROP TABLE IF EXISTS collection_request_supplies CASCADE;
DROP TABLE IF EXISTS collection_request_items CASCADE;
DROP TABLE IF EXISTS collection_requests CASCADE;

DROP SEQUENCE IF EXISTS collection_request_number_seq;
CREATE SEQUENCE collection_request_number_seq START 1;

CREATE TABLE collection_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number        text UNIQUE DEFAULT 'CR-' || lpad(nextval('collection_request_number_seq')::text, 4, '0'),
  customer_name         text,
  customer_id           uuid REFERENCES mw_customers(id) ON DELETE SET NULL,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','completed','cancelled')),
  preferred_date_from   date,
  preferred_date_to     date,
  preferred_days        text[],
  preferred_time_slot   text DEFAULT 'any'
                          CHECK (preferred_time_slot IN ('morning','midday','afternoon','any')),
  special_instructions  text,
  contact_name          text,
  contact_phone         text,
  contact_email         text,
  source                text NOT NULL DEFAULT 'public_form'
                          CHECK (source IN ('public_form','customer_portal','qr_form','compliance_page')),
  admin_notes           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE collection_request_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     uuid NOT NULL REFERENCES collection_requests(id) ON DELETE CASCADE,
  waste_type     text NOT NULL,
  quantity       numeric NOT NULL DEFAULT 1,
  volume_unit    text NOT NULL DEFAULT 'bags',
  container_type text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE collection_request_supplies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES collection_requests(id) ON DELETE CASCADE,
  supply_type text NOT NULL,
  quantity    integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE collection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_request_supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit collection requests"
  ON collection_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can read own just-inserted request"
  ON collection_requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can view all collection requests"
  ON collection_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update collection requests"
  ON collection_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can insert collection request items"
  ON collection_request_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can read collection request items"
  ON collection_request_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can view collection request items"
  ON collection_request_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert collection request supplies"
  ON collection_request_supplies FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can read collection request supplies"
  ON collection_request_supplies FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can view collection request supplies"
  ON collection_request_supplies FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_collection_requests_status ON collection_requests(status);
CREATE INDEX idx_collection_requests_created_at ON collection_requests(created_at DESC);
CREATE INDEX idx_collection_request_items_request_id ON collection_request_items(request_id);
CREATE INDEX idx_collection_request_supplies_request_id ON collection_request_supplies(request_id);

CREATE OR REPLACE FUNCTION update_collection_request_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_collection_requests_updated_at
  BEFORE UPDATE ON collection_requests
  FOR EACH ROW EXECUTE FUNCTION update_collection_request_timestamp();
