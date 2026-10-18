/*
  # Fix: Use gen_random_uuid() for invoice public token

  Replaces gen_random_bytes() (not available) with gen_random_uuid()::text
  for the generate_invoice_public_token() function.
*/

CREATE OR REPLACE FUNCTION generate_invoice_public_token()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gen_random_uuid()::text;
$$;