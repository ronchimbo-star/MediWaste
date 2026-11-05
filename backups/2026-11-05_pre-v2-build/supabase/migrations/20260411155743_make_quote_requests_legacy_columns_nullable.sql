/*
  # Make legacy quote_requests columns nullable

  ## Problem
  The old quote_requests table has company_name, bin_count, location_tier,
  contract_length, calculated_price as NOT NULL, but the current QuoteForm
  does not send these fields. This causes inserts to fail.

  ## Fix
  Make these old columns nullable so new form submissions succeed.
  The new columns (business_name, service_type, products etc.) are already nullable.
*/

ALTER TABLE quote_requests ALTER COLUMN company_name DROP NOT NULL;
ALTER TABLE quote_requests ALTER COLUMN bin_count DROP NOT NULL;
ALTER TABLE quote_requests ALTER COLUMN location_tier DROP NOT NULL;
ALTER TABLE quote_requests ALTER COLUMN contract_length DROP NOT NULL;
ALTER TABLE quote_requests ALTER COLUMN calculated_price DROP NOT NULL;
