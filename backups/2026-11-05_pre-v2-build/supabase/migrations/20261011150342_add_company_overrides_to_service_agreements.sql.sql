/*
# Add company detail override columns to service_agreements

1. Purpose
   Allow per-agreement overrides of the company details that appear on
   the service agreement document.  When a column is NULL the agreement
   falls back to the default stored in site_settings.

2. New nullable columns on service_agreements
   - override_company_name        — legal company name shown as Supplier
   - override_company_address     — registered office address
   - override_company_number      — Companies House number
   - override_carrier_licence     — waste carrier licence number
   - override_contact_name        — signatory name
   - override_contact_email       — contact email on the document
   - override_contact_phone       — contact phone on the document
   - override_contact_position    — signatory job title

3. Security
   No new tables.  service_agreements already has RLS — no policy changes.
*/

ALTER TABLE service_agreements
  ADD COLUMN IF NOT EXISTS override_company_name text,
  ADD COLUMN IF NOT EXISTS override_company_address text,
  ADD COLUMN IF NOT EXISTS override_company_number text,
  ADD COLUMN IF NOT EXISTS override_carrier_licence text,
  ADD COLUMN IF NOT EXISTS override_contact_name text,
  ADD COLUMN IF NOT EXISTS override_contact_email text,
  ADD COLUMN IF NOT EXISTS override_contact_phone text,
  ADD COLUMN IF NOT EXISTS override_contact_position text;
