/*
# Create Hazardous Waste Consignment Notes (HWCN) Module

## Purpose
Creates a complete HWCN module that mirrors the existing Waste Transfer Note (WTN) system
but is designed for hazardous waste movements. Hazardous waste consignment notes require
more detail than standard WTNs: hazard codes, UN transport details, physical form,
separate declarations by consignor, carrier, and consignee, plus a consignee return section.
Retention is 3 years (vs 2 years for WTNs).

## New Tables

### 1. `mw_hw_consignment_notes`
Main consignment note records. Links to customers, jobs, and waste carriers.
- `hwcn_number` — auto-generated, format HWCN{YYYYMMDD}-{random8}
- `customer_id` (FK to mw_customers)
- `job_id` (FK to mw_service_jobs, nullable)
- `carrier_id` (FK to mw_waste_carriers, nullable)
- `issue_date` — date the note was issued
- `collection_date` — date waste was collected
- Consignor fields: name, address, permit number
- Consignee fields: name, address, permit number, received date, received by, received_quantity
- Carrier declaration: name, registration, signature, date
- Producer declaration: name, signature, date
- `consignee_return_status` — pending/received/not_applicable
- `consignee_return_date` — when the receiving site confirmed receipt
- `status` — draft/issued/consignee_returned/archived
- All fields nullable except id, hwcn_number, customer_id, issue_date

### 2. `mw_hwcn_line_items`
Individual waste line items for each consignment note.
- `hwcn_id` (FK to mw_hw_consignment_notes)
- `waste_type`, `waste_code` (EWC), `waste_description`
- `hazard_codes` — array of hazard codes (e.g. HP9 Infectious, HP4 Irritant)
- `un_number` — UN transport code (e.g. UN3291 for clinical waste, sharps)
- `un_class` — ADR class number
- `un_packing_group` — I, II, III, or None
- `proper_shipping_name` — UN proper shipping name
- `physical_form` — solid/liquid/sludge/powder
- `quantity`, `quantity_unit`, `container_type`, `container_count`
- `sort_order`

### 3. `mw_hwcn_photos`
Links consignment notes to job photos (same pattern as mw_wtn_photos).
- `hwcn_id` (FK to mw_hw_consignment_notes)
- `photo_id` (FK to mw_job_photos)
- `sort_order`

## Security
- RLS enabled on all three tables.
- Policies allow both anon and authenticated to read (public notes shared with customers).
- Only authenticated users can insert, update, delete (admin operations).

## Important Notes
1. Tables are in the `public` schema.
2. Foreign keys reference existing mw_customers, mw_service_jobs, mw_waste_carriers, mw_job_photos tables.
3. Indexes on hwcn_id (line items + photos), customer_id, job_id, carrier_id for query performance.
*/

-- ── Main HWCN table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mw_hw_consignment_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hwcn_number text NOT NULL,
  job_id uuid REFERENCES mw_service_jobs(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES mw_customers(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES mw_waste_carriers(id) ON DELETE SET NULL,

  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  collection_date date,

  -- Consignor (producer) details
  consignor_name text,
  consignor_address text,
  consignor_permit_number text,

  -- Consignee (receiving site) details
  consignee_name text,
  consignee_address text,
  consignee_permit_number text,
  consignee_received_date date,
  consignee_received_by text,
  consignee_received_quantity text,
  consignee_signature text,

  -- Carrier declaration
  carrier_name text,
  carrier_registration_number text,
  carrier_signature text,
  carrier_signature_date timestamptz,

  -- Producer declaration
  producer_name text,
  producer_signature text,
  producer_signature_date timestamptz,

  -- Consignee return tracking
  consignee_return_status text NOT NULL DEFAULT 'pending',
  consignee_return_date date,

  -- Lifecycle
  status text NOT NULL DEFAULT 'issued',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mw_hw_consignment_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_hw_consignment_notes" ON mw_hw_consignment_notes;
CREATE POLICY "public_read_hw_consignment_notes"
ON mw_hw_consignment_notes FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_hw_consignment_notes" ON mw_hw_consignment_notes;
CREATE POLICY "auth_insert_hw_consignment_notes"
ON mw_hw_consignment_notes FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_hw_consignment_notes" ON mw_hw_consignment_notes;
CREATE POLICY "auth_update_hw_consignment_notes"
ON mw_hw_consignment_notes FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_hw_consignment_notes" ON mw_hw_consignment_notes;
CREATE POLICY "auth_delete_hw_consignment_notes"
ON mw_hw_consignment_notes FOR DELETE
TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_hwcn_customer ON mw_hw_consignment_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_hwcn_job ON mw_hw_consignment_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_hwcn_carrier ON mw_hw_consignment_notes(carrier_id);
CREATE INDEX IF NOT EXISTS idx_hwcn_number ON mw_hw_consignment_notes(hwcn_number);

-- ── HWCN line items table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS mw_hwcn_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hwcn_id uuid NOT NULL REFERENCES mw_hw_consignment_notes(id) ON DELETE CASCADE,
  waste_type text NOT NULL DEFAULT 'hazardous_infectious_waste',
  waste_code text,
  waste_description text NOT NULL DEFAULT '',
  hazard_codes text[] DEFAULT '{}',
  un_number text,
  un_class text,
  un_packing_group text,
  proper_shipping_name text,
  physical_form text,
  quantity numeric NOT NULL DEFAULT 1,
  quantity_unit text NOT NULL DEFAULT 'kg',
  container_type text NOT NULL DEFAULT 'rigid_container',
  container_count integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mw_hwcn_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_hwcn_line_items" ON mw_hwcn_line_items;
CREATE POLICY "public_read_hwcn_line_items"
ON mw_hwcn_line_items FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_hwcn_line_items" ON mw_hwcn_line_items;
CREATE POLICY "auth_insert_hwcn_line_items"
ON mw_hwcn_line_items FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_hwcn_line_items" ON mw_hwcn_line_items;
CREATE POLICY "auth_update_hwcn_line_items"
ON mw_hwcn_line_items FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_hwcn_line_items" ON mw_hwcn_line_items;
CREATE POLICY "auth_delete_hwcn_line_items"
ON mw_hwcn_line_items FOR DELETE
TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_hwcn_line_items_hwcn ON mw_hwcn_line_items(hwcn_id);

-- ── HWCN photos table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mw_hwcn_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hwcn_id uuid NOT NULL REFERENCES mw_hw_consignment_notes(id) ON DELETE CASCADE,
  photo_id uuid NOT NULL REFERENCES mw_job_photos(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mw_hwcn_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_hwcn_photos" ON mw_hwcn_photos;
CREATE POLICY "public_read_hwcn_photos"
ON mw_hwcn_photos FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_hwcn_photos" ON mw_hwcn_photos;
CREATE POLICY "auth_insert_hwcn_photos"
ON mw_hwcn_photos FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_hwcn_photos" ON mw_hwcn_photos;
CREATE POLICY "auth_update_hwcn_photos"
ON mw_hwcn_photos FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_hwcn_photos" ON mw_hwcn_photos;
CREATE POLICY "auth_delete_hwcn_photos"
ON mw_hwcn_photos FOR DELETE
TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_hwcn_photos_hwcn ON mw_hwcn_photos(hwcn_id);
