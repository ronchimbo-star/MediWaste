-- Job waste items: multiple waste types per service job
CREATE TABLE IF NOT EXISTS mw_job_waste_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES mw_service_jobs(id) ON DELETE CASCADE,
  waste_type text NOT NULL DEFAULT 'clinical_waste',
  container_type text NOT NULL DEFAULT 'yellow_bag',
  quantity numeric NOT NULL DEFAULT 1,
  quantity_unit text NOT NULL DEFAULT 'kg',
  container_count integer NOT NULL DEFAULT 1,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mw_job_waste_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage job waste items"
  ON mw_job_waste_items FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_mw_job_waste_items_job_id ON mw_job_waste_items(job_id);

-- WTN line items: multiple waste streams per WTN
CREATE TABLE IF NOT EXISTS mw_wtn_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wtn_id uuid NOT NULL REFERENCES mw_waste_transfer_notes(id) ON DELETE CASCADE,
  waste_type text NOT NULL DEFAULT 'clinical_waste',
  waste_code text,
  waste_description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  quantity_unit text NOT NULL DEFAULT 'kg',
  container_type text NOT NULL DEFAULT 'yellow_bag',
  container_count integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mw_wtn_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage wtn line items"
  ON mw_wtn_line_items FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Customers can view their own wtn line items"
  ON mw_wtn_line_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mw_waste_transfer_notes wtn
      JOIN mw_customers mc ON mc.id = wtn.customer_id
      WHERE wtn.id = mw_wtn_line_items.wtn_id
        AND mc.user_id = (SELECT auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_mw_wtn_line_items_wtn_id ON mw_wtn_line_items(wtn_id);

-- Make the existing single-stream columns on mw_waste_transfer_notes nullable
-- so we can transition to line-items without breaking existing records
ALTER TABLE mw_waste_transfer_notes
  ALTER COLUMN waste_type DROP NOT NULL,
  ALTER COLUMN waste_description DROP NOT NULL,
  ALTER COLUMN quantity DROP NOT NULL,
  ALTER COLUMN quantity_unit DROP NOT NULL,
  ALTER COLUMN container_type DROP NOT NULL,
  ALTER COLUMN container_count DROP NOT NULL;
