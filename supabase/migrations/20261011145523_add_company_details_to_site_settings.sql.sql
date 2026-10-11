/*
# Add company detail fields to site_settings

1. Purpose
   The service agreement page and other documents currently hardcode the company
   name, registered address, company number, waste carrier licence number, and
   key contact details.  This migration adds dedicated columns to site_settings
   so an admin can change all of these from the Settings page without touching
   code.

2. New columns on site_settings (all optional / nullable)
   - company_legal_name      — e.g. "MediWaste LTD" or "Circular Horizons Ltd"
   - company_registered_address — full registered office address
   - company_number          — Companies House number
   - waste_carrier_licence   — Upper Tier waste carrier licence number
   - company_contact_name    — name of the signatory / key account manager
   - company_contact_email   — email used on agreements and contact sections
   - company_contact_phone   — phone used on agreements and contact sections
   - company_contact_position — job title of the signatory

3. Data
   Populates the new columns with the current MediWaste values so nothing
   breaks before the admin changes them.

4. Security
   No new tables.  site_settings already has RLS enabled with existing
   policies — no policy changes needed.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS company_legal_name text,
  ADD COLUMN IF NOT EXISTS company_registered_address text,
  ADD COLUMN IF NOT EXISTS company_number text,
  ADD COLUMN IF NOT EXISTS waste_carrier_licence text,
  ADD COLUMN IF NOT EXISTS company_contact_name text,
  ADD COLUMN IF NOT EXISTS company_contact_email text,
  ADD COLUMN IF NOT EXISTS company_contact_phone text,
  ADD COLUMN IF NOT EXISTS company_contact_position text;

-- Seed with current known values so the agreement page continues to work
UPDATE site_settings SET
  company_legal_name        = COALESCE(company_legal_name, 'MediWaste LTD'),
  company_registered_address = COALESCE(company_registered_address, 'Unit 2 Capital Industrial Estate, Crabtree Manorway South, Belvedere, Kent, DA17 6BJ'),
  company_number            = COALESCE(company_number, '15821509'),
  waste_carrier_licence     = COALESCE(waste_carrier_licence, 'CBDU542939'),
  company_contact_name      = COALESCE(company_contact_name, 'Sarah Benson'),
  company_contact_email     = COALESCE(company_contact_email, 'sarah.benson@mediwaste.co.uk'),
  company_contact_phone     = COALESCE(company_contact_phone, '01322 879 713'),
  company_contact_position  = COALESCE(company_contact_position, 'Key Account Manager')
WHERE id = 'default';
