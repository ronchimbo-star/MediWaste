/*
# Add Service Agreement Versioning & Effective Date

1. New Tables
- `service_agreement_versions` — stores snapshots of service agreements each time they are updated, so previous versions sent to clients can be viewed later.
  - `id` uuid PK
  - `agreement_id` uuid FK → service_agreements(id) ON DELETE CASCADE
  - `version_number` integer (1 = first version, increments on each save)
  - `snapshot` jsonb — full copy of the agreement row at that point in time
  - `sent_to_client_at` timestamptz — null unless this version was sent
  - `created_at` timestamptz default now()

2. Modified Tables
- `service_agreements`:
  - ADD `effective_date` date nullable — lets admin set a date that differs from the creation date
  - ADD `current_version` integer default 1 — tracks the latest version number

3. Security
- Enable RLS on `service_agreement_versions`
- Public read (anon, authenticated) — so the public agreement page can display version info
- Authenticated-only insert/update/delete — admin manages versions
*/

ALTER TABLE service_agreements ADD COLUMN IF NOT EXISTS effective_date date;
ALTER TABLE service_agreements ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS service_agreement_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES service_agreements(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  sent_to_client_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sa_versions_agreement_id ON service_agreement_versions(agreement_id);
CREATE INDEX IF NOT EXISTS idx_sa_versions_number ON service_agreement_versions(agreement_id, version_number DESC);

ALTER TABLE service_agreement_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_sa_versions" ON service_agreement_versions;
CREATE POLICY "anon_read_sa_versions" ON service_agreement_versions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_sa_versions" ON service_agreement_versions;
CREATE POLICY "auth_insert_sa_versions" ON service_agreement_versions
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_sa_versions" ON service_agreement_versions;
CREATE POLICY "auth_update_sa_versions" ON service_agreement_versions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_sa_versions" ON service_agreement_versions;
CREATE POLICY "auth_delete_sa_versions" ON service_agreement_versions
  FOR DELETE TO authenticated USING (true);
