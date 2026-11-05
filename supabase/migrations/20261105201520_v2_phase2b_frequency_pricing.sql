/*
# V2 Phase 2b: frequency-based pricing, VAT and admin price controls

1. Summary
- Base fees now depend on collection frequency (per collection, excl. VAT), not on the service type.
- Distance surcharges use six bands: 0-15, 15-30, 30-50, 50-75, 75-100 and 100+ miles (open-ended).
- The price log records the excl. VAT subtotal, VAT and the VAT-inclusive total for each calculation.
- Admins save all price changes in one atomic call, which marks the prices as confirmed.

2. New table
- `pricing_frequency_fees`: one row per collection frequency with `base_pence` (excl. VAT), `is_placeholder` and `updated_at`.
- Seeded with the agreed base fees. Seeds use ON CONFLICT DO NOTHING so later admin edits are never overwritten.

3. Modified tables
- `pricing_distance_bands`: `max_miles` may now be NULL, meaning no upper limit (used by the last band). Placeholder rows 1-4 are updated to the agreed bands; bands 5 and 6 are added.
- `quote_price_quotes`: adds `frequency`, `subtotal_pence` (excl. VAT) and `vat_pence`. `total_pence` now means the VAT-inclusive total.
- `pricing_service_prices` is removed. It only held placeholder service prices, which no longer drive pricing.

4. Security
- `pricing_frequency_fees`: RLS on; anon and authenticated have no direct access; authenticated admins may SELECT via is_admin(); service_role has full access.
- `save_pricing_config(jsonb)`: SECURITY DEFINER, checks is_admin(), validates that values are zero or more, that band limits increase, and that the last band is open-ended. Executable by authenticated only.

5. Notes
- All changes in save_pricing_config run in one transaction, so a failed validation changes nothing.
- Prices stay hidden from clients until an admin saves them.
*/

CREATE TABLE IF NOT EXISTS pricing_frequency_fees (
  frequency text PRIMARY KEY,
  sort_order integer NOT NULL,
  base_pence integer NOT NULL CHECK (base_pence >= 0),
  is_placeholder boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO pricing_frequency_fees (frequency, sort_order, base_pence) VALUES
  ('Pay-As-You-Go', 1, 8500),
  ('Flexi 4', 2, 7500),
  ('Quarterly', 3, 7500),
  ('Bi-Monthly', 4, 7000),
  ('Monthly', 5, 6500),
  ('Fortnightly', 6, 6000),
  ('Weekly', 7, 5500)
ON CONFLICT (frequency) DO NOTHING;

ALTER TABLE pricing_frequency_fees ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON pricing_frequency_fees FROM PUBLIC, anon, authenticated;
GRANT SELECT ON pricing_frequency_fees TO authenticated;
GRANT ALL ON pricing_frequency_fees TO service_role;

DROP POLICY IF EXISTS "admin_select_pricing_frequency_fees" ON pricing_frequency_fees;
CREATE POLICY "admin_select_pricing_frequency_fees" ON pricing_frequency_fees
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "service_all_pricing_frequency_fees" ON pricing_frequency_fees;
CREATE POLICY "service_all_pricing_frequency_fees" ON pricing_frequency_fees
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE pricing_distance_bands ALTER COLUMN max_miles DROP NOT NULL;

UPDATE pricing_distance_bands SET max_miles = 15, surcharge_pence = 0 WHERE sort_order = 1 AND is_placeholder = true;
UPDATE pricing_distance_bands SET max_miles = 30, surcharge_pence = 1000 WHERE sort_order = 2 AND is_placeholder = true;
UPDATE pricing_distance_bands SET max_miles = 50, surcharge_pence = 2500 WHERE sort_order = 3 AND is_placeholder = true;
UPDATE pricing_distance_bands SET max_miles = 75, surcharge_pence = 4000 WHERE sort_order = 4 AND is_placeholder = true;

INSERT INTO pricing_distance_bands (sort_order, max_miles, surcharge_pence, is_placeholder) VALUES
  (5, 100, 5500, true),
  (6, NULL, 7000, true)
ON CONFLICT (sort_order) DO NOTHING;

ALTER TABLE quote_price_quotes
  ADD COLUMN IF NOT EXISTS frequency text,
  ADD COLUMN IF NOT EXISTS subtotal_pence integer,
  ADD COLUMN IF NOT EXISTS vat_pence integer;

COMMENT ON COLUMN quote_price_quotes.total_pence IS 'Total including VAT, in pence';

DROP TABLE IF EXISTS pricing_service_prices;

CREATE OR REPLACE FUNCTION save_pricing_config(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f record;
  b record;
  last_sort integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  FOR f IN
    SELECT * FROM jsonb_to_recordset(COALESCE(payload->'frequencies', '[]'::jsonb))
      AS x(frequency text, base_pence integer)
  LOOP
    IF f.base_pence IS NULL OR f.base_pence < 0 THEN
      RAISE EXCEPTION 'Base fees must be zero or more';
    END IF;
    UPDATE pricing_frequency_fees
      SET base_pence = f.base_pence, is_placeholder = false, updated_at = now()
      WHERE frequency = f.frequency;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown collection frequency';
    END IF;
  END LOOP;

  FOR b IN
    SELECT * FROM jsonb_to_recordset(COALESCE(payload->'bands', '[]'::jsonb))
      AS x(sort_order integer, max_miles numeric, surcharge_pence integer)
  LOOP
    IF b.surcharge_pence IS NULL OR b.surcharge_pence < 0 THEN
      RAISE EXCEPTION 'Distance surcharges must be zero or more';
    END IF;
    IF b.max_miles IS NOT NULL AND b.max_miles <= 0 THEN
      RAISE EXCEPTION 'Distance limits must be greater than zero';
    END IF;
    UPDATE pricing_distance_bands
      SET max_miles = b.max_miles, surcharge_pence = b.surcharge_pence, is_placeholder = false
      WHERE sort_order = b.sort_order;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown distance band';
    END IF;
  END LOOP;

  SELECT max(sort_order) INTO last_sort FROM pricing_distance_bands;
  IF EXISTS (SELECT 1 FROM pricing_distance_bands WHERE sort_order = last_sort AND max_miles IS NOT NULL) THEN
    RAISE EXCEPTION 'The last distance band must have no upper limit';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pricing_distance_bands p
    JOIN pricing_distance_bands n ON n.sort_order = p.sort_order + 1
    WHERE p.max_miles IS NULL OR (n.max_miles IS NOT NULL AND n.max_miles <= p.max_miles)
  ) THEN
    RAISE EXCEPTION 'Distance bands must increase in order';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION save_pricing_config(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION save_pricing_config(jsonb) TO authenticated;
