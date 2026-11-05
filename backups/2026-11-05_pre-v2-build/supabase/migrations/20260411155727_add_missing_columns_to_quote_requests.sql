/*
  # Add missing columns to quote_requests table

  ## Problem
  The QuoteForm component sends these fields:
    business_name, contact_name, email, phone, postcode,
    service_type, products (jsonb), frequency, additional_info, status

  But the quote_requests table has different/missing columns:
    company_name (instead of business_name)
    items (instead of products)
    business_type (instead of service_type)
    message (instead of additional_info)
    No frequency column

  ## Fix
  Add the columns the form actually sends, using IF NOT EXISTS checks.
  Existing columns are left intact to preserve any existing data.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_requests' AND column_name = 'business_name') THEN
    ALTER TABLE quote_requests ADD COLUMN business_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_requests' AND column_name = 'service_type') THEN
    ALTER TABLE quote_requests ADD COLUMN service_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_requests' AND column_name = 'products') THEN
    ALTER TABLE quote_requests ADD COLUMN products jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_requests' AND column_name = 'frequency') THEN
    ALTER TABLE quote_requests ADD COLUMN frequency text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_requests' AND column_name = 'additional_info') THEN
    ALTER TABLE quote_requests ADD COLUMN additional_info text;
  END IF;
END $$;
