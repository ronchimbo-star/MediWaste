-- Fixes "infinite recursion detected in policy for relation mw_certificates".
-- Several SELECT policies joined mw_certificates, mw_certificate_customers,
-- mw_wtn_customers and mw_hwcn_customers into each other, so evaluating one
-- re-entered another. Every read of mw_certificates by a signed-in user failed,
-- which hid all certificates from the admin list.
--
-- The helper functions below are SECURITY DEFINER so their lookups bypass RLS,
-- and the affected policies call them instead of joining across the tables.
-- Policies are dropped and recreated so the migration is idempotent.

CREATE OR REPLACE FUNCTION public.mw_certificate_is_public(p_certificate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mw_certificates c
    WHERE c.id = p_certificate_id
      AND c.qr_code_token IS NOT NULL
      AND c.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.mw_customer_on_public_certificate(p_customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mw_certificate_customers cc
    WHERE cc.customer_id = p_customer_id
      AND public.mw_certificate_is_public(cc.certificate_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.mw_user_linked_to_certificate(p_certificate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mw_certificate_customers cc
    JOIN mw_customers mc ON mc.id = cc.customer_id
    WHERE cc.certificate_id = p_certificate_id
      AND mc.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.mw_wtn_on_public_certificate(p_wtn_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mw_wtn_customers wc
    WHERE wc.wtn_id = p_wtn_id
      AND public.mw_customer_on_public_certificate(wc.customer_id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.mw_certificate_is_public(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mw_customer_on_public_certificate(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mw_user_linked_to_certificate(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mw_wtn_on_public_certificate(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mw_certificate_is_public(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mw_customer_on_public_certificate(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mw_user_linked_to_certificate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mw_wtn_on_public_certificate(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Linked customers can view shared certificates" ON mw_certificates;
CREATE POLICY "Linked customers can view shared certificates" ON mw_certificates
  FOR SELECT TO authenticated
  USING (public.mw_user_linked_to_certificate(id));

DROP POLICY IF EXISTS "Public can read certificate links for active certificates" ON mw_certificate_customers;
CREATE POLICY "Public can read certificate links for active certificates" ON mw_certificate_customers
  FOR SELECT TO anon, authenticated
  USING (public.mw_certificate_is_public(certificate_id));

DROP POLICY IF EXISTS "Public can read transfer note links for active certificates" ON mw_wtn_customers;
CREATE POLICY "Public can read transfer note links for active certificates" ON mw_wtn_customers
  FOR SELECT TO anon, authenticated
  USING (public.mw_customer_on_public_certificate(customer_id));

DROP POLICY IF EXISTS "Public can read consignment note links for active certificates" ON mw_hwcn_customers;
CREATE POLICY "Public can read consignment note links for active certificates" ON mw_hwcn_customers
  FOR SELECT TO anon, authenticated
  USING (public.mw_customer_on_public_certificate(customer_id));

DROP POLICY IF EXISTS "Public can view transfer notes shared on active certificates" ON mw_waste_transfer_notes;
CREATE POLICY "Public can view transfer notes shared on active certificates" ON mw_waste_transfer_notes
  FOR SELECT TO anon, authenticated
  USING (public.mw_wtn_on_public_certificate(id));
