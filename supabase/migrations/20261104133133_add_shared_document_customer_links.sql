/*
# Share certificates, transfer notes and consignment notes across several customers

## Plain English
Certificates, waste transfer notes (WTNs) and hazardous waste consignment notes (HWCNs) could previously belong to only one customer. This migration adds link tables so one document can be shared with several customers. Every linked customer can see the shared certificate and all related notes in their customer portal.

## 1. New tables
- `mw_certificate_customers` (certificate_id, customer_id, created_at): customers who share a certificate. Primary key is the pair, so a customer can only be linked once.
- `mw_wtn_customers` (wtn_id, customer_id, created_at): customers who share a waste transfer note.
- `mw_hwcn_customers` (hwcn_id, customer_id, created_at): customers who share a hazardous waste consignment note.
Links cascade-delete when the document or customer is removed.

## 2. Primary customer stays in place
- The existing `customer_id` column on each document is kept as the primary customer and is not changed.
- Existing documents are back-filled so their primary customer is linked.
- A trigger on each document table adds the primary customer to the link table whenever a document is created or its primary customer changes, so no document can exist without its primary link.

## 3. Security changes
- RLS enabled on all three link tables. Grants are limited to the verbs used.
- Staff admins (`is_admin()`) can read, add and remove links.
- Customers can read only links that point at their own customer record.
- Anonymous visitors can read links only for active certificates that have a QR token (the public compliance page).
- Linked customers can read the shared certificate, the shared transfer notes and their line items.
- Anonymous visitors can read transfer notes and consignment note links belonging to customers on an active certificate.
- New function `get_certificate_customer_names(token)` returns only the id and company name of customers on an active certificate. It is the only public route to the names of additional customers.

## 4. Important notes
1. No existing rows or columns are removed or altered.
2. The trigger function runs with definer rights so it can write links regardless of who saves the document. Its execute permission is revoked from public roles.
3. Existing single-customer behaviour is unchanged, because the primary customer is always linked.
*/

CREATE TABLE IF NOT EXISTS mw_certificate_customers (
  certificate_id uuid NOT NULL REFERENCES mw_certificates(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES mw_customers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (certificate_id, customer_id)
);

CREATE INDEX IF NOT EXISTS mw_certificate_customers_customer_idx ON mw_certificate_customers (customer_id);

CREATE TABLE IF NOT EXISTS mw_wtn_customers (
  wtn_id uuid NOT NULL REFERENCES mw_waste_transfer_notes(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES mw_customers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wtn_id, customer_id)
);

CREATE INDEX IF NOT EXISTS mw_wtn_customers_customer_idx ON mw_wtn_customers (customer_id);

CREATE TABLE IF NOT EXISTS mw_hwcn_customers (
  hwcn_id uuid NOT NULL REFERENCES mw_hw_consignment_notes(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES mw_customers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hwcn_id, customer_id)
);

CREATE INDEX IF NOT EXISTS mw_hwcn_customers_customer_idx ON mw_hwcn_customers (customer_id);

CREATE OR REPLACE FUNCTION mw_link_primary_document_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    EXECUTE format(
      'INSERT INTO %I (%I, customer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      TG_ARGV[0], TG_ARGV[1]
    ) USING NEW.id, NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION mw_link_primary_document_customer() FROM PUBLIC, anon, authenticated;

INSERT INTO mw_certificate_customers (certificate_id, customer_id)
SELECT id, customer_id FROM mw_certificates WHERE customer_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO mw_wtn_customers (wtn_id, customer_id)
SELECT id, customer_id FROM mw_waste_transfer_notes WHERE customer_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO mw_hwcn_customers (hwcn_id, customer_id)
SELECT id, customer_id FROM mw_hw_consignment_notes WHERE customer_id IS NOT NULL
ON CONFLICT DO NOTHING;

DROP TRIGGER IF EXISTS mw_certificates_primary_customer_link ON mw_certificates;
CREATE TRIGGER mw_certificates_primary_customer_link
AFTER INSERT OR UPDATE OF customer_id ON mw_certificates
FOR EACH ROW EXECUTE FUNCTION mw_link_primary_document_customer('mw_certificate_customers', 'certificate_id');

DROP TRIGGER IF EXISTS mw_waste_transfer_notes_primary_customer_link ON mw_waste_transfer_notes;
CREATE TRIGGER mw_waste_transfer_notes_primary_customer_link
AFTER INSERT OR UPDATE OF customer_id ON mw_waste_transfer_notes
FOR EACH ROW EXECUTE FUNCTION mw_link_primary_document_customer('mw_wtn_customers', 'wtn_id');

DROP TRIGGER IF EXISTS mw_hw_consignment_notes_primary_customer_link ON mw_hw_consignment_notes;
CREATE TRIGGER mw_hw_consignment_notes_primary_customer_link
AFTER INSERT OR UPDATE OF customer_id ON mw_hw_consignment_notes
FOR EACH ROW EXECUTE FUNCTION mw_link_primary_document_customer('mw_hwcn_customers', 'hwcn_id');

ALTER TABLE mw_certificate_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mw_wtn_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mw_hwcn_customers ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON mw_certificate_customers TO authenticated;
GRANT SELECT, INSERT, DELETE ON mw_wtn_customers TO authenticated;
GRANT SELECT, INSERT, DELETE ON mw_hwcn_customers TO authenticated;
GRANT SELECT ON mw_certificate_customers TO anon;
GRANT SELECT ON mw_wtn_customers TO anon;
GRANT SELECT ON mw_hwcn_customers TO anon;

DROP POLICY IF EXISTS "Admins can read certificate customer links" ON mw_certificate_customers;
CREATE POLICY "Admins can read certificate customer links" ON mw_certificate_customers
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can add certificate customer links" ON mw_certificate_customers;
CREATE POLICY "Admins can add certificate customer links" ON mw_certificate_customers
  FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can remove certificate customer links" ON mw_certificate_customers;
CREATE POLICY "Admins can remove certificate customer links" ON mw_certificate_customers
  FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Customers can read own certificate links" ON mw_certificate_customers;
CREATE POLICY "Customers can read own certificate links" ON mw_certificate_customers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM mw_customers mc WHERE mc.id = mw_certificate_customers.customer_id AND mc.user_id = auth.uid()));

DROP POLICY IF EXISTS "Public can read certificate links for active certificates" ON mw_certificate_customers;
CREATE POLICY "Public can read certificate links for active certificates" ON mw_certificate_customers
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM mw_certificates c WHERE c.id = mw_certificate_customers.certificate_id AND c.qr_code_token IS NOT NULL AND c.status = 'active'));

DROP POLICY IF EXISTS "Admins can read transfer note customer links" ON mw_wtn_customers;
CREATE POLICY "Admins can read transfer note customer links" ON mw_wtn_customers
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can add transfer note customer links" ON mw_wtn_customers;
CREATE POLICY "Admins can add transfer note customer links" ON mw_wtn_customers
  FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can remove transfer note customer links" ON mw_wtn_customers;
CREATE POLICY "Admins can remove transfer note customer links" ON mw_wtn_customers
  FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Customers can read own transfer note links" ON mw_wtn_customers;
CREATE POLICY "Customers can read own transfer note links" ON mw_wtn_customers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM mw_customers mc WHERE mc.id = mw_wtn_customers.customer_id AND mc.user_id = auth.uid()));

DROP POLICY IF EXISTS "Public can read transfer note links for active certificates" ON mw_wtn_customers;
CREATE POLICY "Public can read transfer note links for active certificates" ON mw_wtn_customers
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM mw_certificate_customers cc
    JOIN mw_certificates c ON c.id = cc.certificate_id
    WHERE cc.customer_id = mw_wtn_customers.customer_id
      AND c.qr_code_token IS NOT NULL AND c.status = 'active'
  ));

DROP POLICY IF EXISTS "Admins can read consignment note customer links" ON mw_hwcn_customers;
CREATE POLICY "Admins can read consignment note customer links" ON mw_hwcn_customers
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can add consignment note customer links" ON mw_hwcn_customers;
CREATE POLICY "Admins can add consignment note customer links" ON mw_hwcn_customers
  FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can remove consignment note customer links" ON mw_hwcn_customers;
CREATE POLICY "Admins can remove consignment note customer links" ON mw_hwcn_customers
  FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Customers can read own consignment note links" ON mw_hwcn_customers;
CREATE POLICY "Customers can read own consignment note links" ON mw_hwcn_customers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM mw_customers mc WHERE mc.id = mw_hwcn_customers.customer_id AND mc.user_id = auth.uid()));

DROP POLICY IF EXISTS "Public can read consignment note links for active certificates" ON mw_hwcn_customers;
CREATE POLICY "Public can read consignment note links for active certificates" ON mw_hwcn_customers
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM mw_certificate_customers cc
    JOIN mw_certificates c ON c.id = cc.certificate_id
    WHERE cc.customer_id = mw_hwcn_customers.customer_id
      AND c.qr_code_token IS NOT NULL AND c.status = 'active'
  ));

DROP POLICY IF EXISTS "Linked customers can view shared certificates" ON mw_certificates;
CREATE POLICY "Linked customers can view shared certificates" ON mw_certificates
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mw_certificate_customers cc
    JOIN mw_customers mc ON mc.id = cc.customer_id
    WHERE cc.certificate_id = mw_certificates.id AND mc.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Linked customers can view shared transfer notes" ON mw_waste_transfer_notes;
CREATE POLICY "Linked customers can view shared transfer notes" ON mw_waste_transfer_notes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mw_wtn_customers wc
    JOIN mw_customers mc ON mc.id = wc.customer_id
    WHERE wc.wtn_id = mw_waste_transfer_notes.id AND mc.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Public can view transfer notes shared on active certificates" ON mw_waste_transfer_notes;
CREATE POLICY "Public can view transfer notes shared on active certificates" ON mw_waste_transfer_notes
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM mw_wtn_customers wc
    JOIN mw_certificate_customers cc ON cc.customer_id = wc.customer_id
    JOIN mw_certificates c ON c.id = cc.certificate_id
    WHERE wc.wtn_id = mw_waste_transfer_notes.id
      AND c.qr_code_token IS NOT NULL AND c.status = 'active'
  ));

DROP POLICY IF EXISTS "Linked customers can view shared transfer note line items" ON mw_wtn_line_items;
CREATE POLICY "Linked customers can view shared transfer note line items" ON mw_wtn_line_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mw_wtn_customers wc
    JOIN mw_customers mc ON mc.id = wc.customer_id
    WHERE wc.wtn_id = mw_wtn_line_items.wtn_id AND mc.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION get_certificate_customer_names(p_token text)
RETURNS TABLE (linked_customer_id uuid, linked_company_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mc.id, mc.company_name
  FROM mw_certificates c
  JOIN mw_certificate_customers cc ON cc.certificate_id = c.id
  JOIN mw_customers mc ON mc.id = cc.customer_id
  WHERE c.qr_code_token = p_token
    AND c.qr_code_token IS NOT NULL
    AND c.status = 'active';
$$;

REVOKE EXECUTE ON FUNCTION get_certificate_customer_names(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_certificate_customer_names(text) TO anon, authenticated;
