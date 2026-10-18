-- Pre-Acceptance Waste Audit Module
-- Tables: waste_streams (seed data), waste_audits, waste_audit_logs
-- RLS enabled on all tables

-- ============ WASTE STREAMS REFERENCE TABLE ============
CREATE TABLE IF NOT EXISTS waste_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ewc_code text NOT NULL,
  description text,
  container_type text,
  colour_code text,
  hazardous_properties text,
  disposal_route text,
  is_hazardous boolean NOT NULL DEFAULT false,
  category text NOT NULL DEFAULT 'clinical',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE waste_streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_waste_streams" ON waste_streams;
CREATE POLICY "select_waste_streams" ON waste_streams FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_waste_streams" ON waste_streams;
CREATE POLICY "insert_waste_streams" ON waste_streams FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_waste_streams" ON waste_streams;
CREATE POLICY "update_waste_streams" ON waste_streams FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_waste_streams" ON waste_streams;
CREATE POLICY "delete_waste_streams" ON waste_streams FOR DELETE
  TO authenticated USING (true);

-- Seed waste stream data
INSERT INTO waste_streams (name, ewc_code, description, container_type, colour_code, hazardous_properties, disposal_route, is_hazardous, category, display_order) VALUES
('Clinical / Infectious Waste', '18 01 03*', 'Waste from medical procedures contaminated with blood or bodily fluids. Includes used gloves, gauze, swabs, masks, aprons, and disposable materials.', 'Orange clinical waste bags', 'Orange', 'HP9 (Infectious)', 'Alternative treatment (autoclaving) or incineration', true, 'clinical', 1),
('Sharps Waste', '18 01 03*', 'Used needles, syringes, scalpel blades, and other sharp instruments from medical or dental procedures.', 'Yellow or orange-lidded sharps bin', 'Yellow/Orange', 'HP9 (Infectious)', 'Incineration', true, 'sharps', 2),
('Pharmaceutical Waste', '18 01 09', 'Expired or unused medicines, local anaesthetics, and other pharmaceutical products.', 'Blue-lidded pharmaceutical bin', 'Blue', 'HP6 (Toxic)', 'Incineration', false, 'pharmaceutical', 3),
('Offensive / Hygiene Waste', '18 01 04', 'Non-infectious waste that is unpleasant but not hazardous. Includes uncontaminated PPE, gloves, masks, and hygiene waste.', 'Tiger Stripe bags', 'Yellow/Black', 'None', 'Landfill or energy recovery', false, 'offensive', 4),
('Anatomical Waste', '18 01 02', 'Recognisable body parts, organs, and tissue.', 'Red rigid container', 'Red', 'HP9 (Infectious)', 'Incineration', true, 'anatomical', 5),
('Cytotoxic Waste', '18 01 08*', 'Waste containing cytotoxic or cytostatic medicines, typically from chemotherapy or similar treatments.', 'Purple-lidded rigid bin', 'Purple', 'HP6 (Toxic), HP7 (Carcinogenic)', 'Incineration at high temperature', true, 'cytotoxic', 6),
('Cytotoxically Contaminated Sharps', '18 01 08*', 'Sharps contaminated with cytotoxic or cytostatic medicines.', 'Purple-lidded sharps bin', 'Purple', 'HP6 (Toxic), HP7 (Carcinogenic)', 'Incineration at high temperature', true, 'cytotoxic', 7),
('Dental Amalgam Waste', '18 01 10', 'Amalgam waste from dental procedures, including extracted teeth with amalgam fillings and amalgam capsules.', 'Rigid amalgam container', 'Silver/Grey', 'HP6 (Toxic), HP14 (Ecotoxic)', 'Specialist recovery and disposal', true, 'dental', 8),
('Chemical Waste', '18 01 06*', 'X-ray developer/fixer, cleaning chemicals, disinfectants, and other hazardous chemical substances.', 'Sealed chemical waste containers', 'Various', 'HP4 (Irritant), HP6 (Toxic)', 'Specialist chemical waste disposal', true, 'chemical', 9),
('Gypsum Waste', '18 01 04', 'Dental moulds and impressions containing gypsum.', 'White bags or containers', 'White', 'None', 'Specialist gypsum disposal (non-landfill)', false, 'dental', 10),
('Medicinally Contaminated Sharps', '18 01 09', 'Sharps contaminated with pharmaceutical products but not cytotoxic.', 'Blue-lidded sharps bin', 'Blue', 'HP6 (Toxic)', 'Incineration', false, 'pharmaceutical', 11)
ON CONFLICT DO NOTHING;

-- ============ WASTE AUDITS TABLE ============
CREATE TABLE IF NOT EXISTS waste_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES mw_customers(id) ON DELETE SET NULL,
  audit_number text NOT NULL,
  practice_name text,
  legal_entity text,
  address text,
  practice_type text,
  services_provided text,
  number_of_surgeries text,
  number_of_staff text,
  amalgam_use text,
  selected_waste_streams jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_generated_content jsonb,
  admin_edited_content jsonb,
  client_edits jsonb,
  final_content jsonb,
  status text NOT NULL DEFAULT 'draft',
  share_token text NOT NULL,
  auditor_name text,
  auditor_title text,
  admin_signed_at timestamptz,
  admin_signed_by uuid REFERENCES auth.users(id),
  client_signed_at timestamptz,
  client_signed_by text,
  client_representative_name text,
  client_representative_title text,
  sent_to_client_at timestamptz,
  client_edited_at timestamptz,
  finalised_at timestamptz,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waste_audits_customer ON waste_audits(customer_id);
CREATE INDEX IF NOT EXISTS idx_waste_audits_status ON waste_audits(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_waste_audits_share_token ON waste_audits(share_token);

ALTER TABLE waste_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_waste_audits" ON waste_audits;
CREATE POLICY "select_waste_audits" ON waste_audits FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_waste_audits" ON waste_audits;
CREATE POLICY "insert_waste_audits" ON waste_audits FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_waste_audits" ON waste_audits;
CREATE POLICY "update_waste_audits" ON waste_audits FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_waste_audits" ON waste_audits;
CREATE POLICY "delete_waste_audits" ON waste_audits FOR DELETE
  TO authenticated USING (true);

-- ============ WASTE AUDIT LOGS TABLE ============
CREATE TABLE IF NOT EXISTS waste_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid REFERENCES waste_audits(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waste_audit_logs_audit ON waste_audit_logs(audit_id, created_at DESC);

ALTER TABLE waste_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_waste_audit_logs" ON waste_audit_logs;
CREATE POLICY "select_waste_audit_logs" ON waste_audit_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_waste_audit_logs" ON waste_audit_logs;
CREATE POLICY "insert_waste_audit_logs" ON waste_audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_waste_audit_logs" ON waste_audit_logs;
CREATE POLICY "delete_waste_audit_logs" ON waste_audit_logs FOR DELETE
  TO authenticated USING (true);

-- ============ AUTO-GENERATE AUDIT NUMBER ============
CREATE OR REPLACE FUNCTION generate_audit_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
  audit_num text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(audit_number FROM 'WA-([0-9]+)') AS integer)), 0) + 1
  INTO next_num
  FROM waste_audits
  WHERE audit_number ~ '^WA-[0-9]+$';
  audit_num := 'WA-' || lpad(next_num::text, 5, '0');
  RETURN audit_num;
END;
$$;