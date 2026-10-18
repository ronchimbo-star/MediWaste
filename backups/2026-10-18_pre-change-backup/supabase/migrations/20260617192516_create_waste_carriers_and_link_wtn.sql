-- Waste carriers table
CREATE TABLE mw_waste_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  registration_number text,
  registration_type text NOT NULL DEFAULT 'upper_tier',
  registration_valid_until date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mw_waste_carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage waste carriers"
  ON mw_waste_carriers FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Link WTN to a waste carrier record
ALTER TABLE mw_waste_transfer_notes
  ADD COLUMN carrier_id uuid REFERENCES mw_waste_carriers(id) ON DELETE SET NULL;

-- Also make carrier_signature nullable so it can be derived from the carrier record
ALTER TABLE mw_waste_transfer_notes
  ALTER COLUMN carrier_signature DROP NOT NULL;

CREATE INDEX idx_mw_waste_carriers_active ON mw_waste_carriers(is_active);
CREATE INDEX idx_mw_wtn_carrier_id ON mw_waste_transfer_notes(carrier_id);
