/*
# Fix public certificate WTN visibility

1. Purpose
- Ensure waste transfer notes linked to an active, publicly verifiable certificate can be read on the certificate public page.
- Preserve existing WTN data and existing authenticated admin/customer access.

2. Modified tables
- `mw_waste_transfer_notes`: replace the public SELECT policy with an explicit policy for anonymous and authenticated visitors.

3. Security
- Public access remains read-only.
- A WTN is visible only when its customer has an active certificate with a non-null QR token.
- No insert, update, or delete permissions are added.

4. Important notes
- This does not expose WTNs for customers without a public certificate.
- Existing admin and customer policies are left unchanged.
*/

DROP POLICY IF EXISTS "Public can view WTNs via certificate QR token" ON mw_waste_transfer_notes;

CREATE POLICY "Public can view WTNs via active certificate"
ON mw_waste_transfer_notes
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM mw_certificates AS certificate
    WHERE certificate.customer_id = mw_waste_transfer_notes.customer_id
      AND certificate.qr_code_token IS NOT NULL
      AND certificate.status = 'active'
  )
);
