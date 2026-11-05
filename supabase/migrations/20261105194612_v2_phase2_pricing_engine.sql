/*
# Phase 2: server-side pricing engine (PLACEHOLDER values)

Plain-English summary
- Adds the tables the quote pricing engine needs: distance bands, base prices per service, and a log of every price calculated.
- All prices are whole pence. Every seeded price is a dummy placeholder (is_placeholder = true) and must be replaced before real prices are shown to clients.
- Clients never read these tables. Prices are calculated by a server-side function, which returns only the total to the client once real prices are in place.

1. New Tables
- `pricing_distance_bands`: distance bands measured in miles from the base at 56 Craydene Road, Erith, DA8 2HA. Each band has a surcharge in pence. Bands are checked in sort_order; the first band whose max_miles covers the distance applies.
- `pricing_service_prices`: base price in pence per service label (matching the quote form's service options). A NULL base_pence means the service is priced manually.
- `quote_price_quotes`: one row per price calculation (postcode, distance, base, surcharge, total, placeholder flag). Optionally linked to a quote request.

2. Security
- RLS enabled on all three tables.
- anon and authenticated: all privileges revoked. Platform default privileges would otherwise grant them.
- authenticated (admin only, via is_admin()): SELECT only.
- service_role (used by the pricing edge function): full access.

3. Important notes
- Placeholder seed values are NOT real prices. Replace them, then set is_placeholder = false on the rows you have confirmed.
- The surcharge is never exposed to clients; the edge function returns the total only when no placeholder rows were used.
*/

CREATE TABLE IF NOT EXISTS pricing_distance_bands (
  sort_order integer PRIMARY KEY,
  max_miles numeric(6,2) NOT NULL CHECK (max_miles > 0),
  surcharge_pence integer NOT NULL CHECK (surcharge_pence >= 0),
  is_placeholder boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pricing_service_prices (
  service_label text PRIMARY KEY,
  base_pence integer CHECK (base_pence IS NULL OR base_pence >= 0),
  is_placeholder boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_price_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid REFERENCES quote_requests(id) ON DELETE SET NULL,
  service_label text NOT NULL,
  postcode text NOT NULL,
  distance_miles numeric(7,2),
  base_pence integer,
  surcharge_pence integer,
  total_pence integer,
  is_placeholder boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quote_price_quotes_quote_request_id_idx ON quote_price_quotes (quote_request_id);

ALTER TABLE pricing_distance_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_service_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_price_quotes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON pricing_distance_bands FROM PUBLIC, anon, authenticated;
REVOKE ALL ON pricing_service_prices FROM PUBLIC, anon, authenticated;
REVOKE ALL ON quote_price_quotes FROM PUBLIC, anon, authenticated;

GRANT SELECT ON pricing_distance_bands TO authenticated;
GRANT SELECT ON pricing_service_prices TO authenticated;
GRANT SELECT ON quote_price_quotes TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON pricing_distance_bands TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON pricing_service_prices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON quote_price_quotes TO service_role;

DROP POLICY IF EXISTS "admin_select_pricing_distance_bands" ON pricing_distance_bands;
CREATE POLICY "admin_select_pricing_distance_bands" ON pricing_distance_bands FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_select_pricing_service_prices" ON pricing_service_prices;
CREATE POLICY "admin_select_pricing_service_prices" ON pricing_service_prices FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_select_quote_price_quotes" ON quote_price_quotes;
CREATE POLICY "admin_select_quote_price_quotes" ON quote_price_quotes FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "service_all_pricing_distance_bands" ON pricing_distance_bands;
CREATE POLICY "service_all_pricing_distance_bands" ON pricing_distance_bands FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_pricing_service_prices" ON pricing_service_prices;
CREATE POLICY "service_all_pricing_service_prices" ON pricing_service_prices FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_quote_price_quotes" ON quote_price_quotes;
CREATE POLICY "service_all_quote_price_quotes" ON quote_price_quotes FOR ALL
  TO service_role USING (true) WITH CHECK (true);

INSERT INTO pricing_distance_bands (sort_order, max_miles, surcharge_pence, is_placeholder) VALUES
  (1, 10, 0, true),
  (2, 20, 1500, true),
  (3, 35, 3000, true),
  (4, 60, 5000, true)
ON CONFLICT (sort_order) DO NOTHING;

INSERT INTO pricing_service_prices (service_label, base_pence, is_placeholder) VALUES
  ('Clinical Waste Collection', 4500, true),
  ('Sharps Disposal', 3500, true),
  ('Pharmaceutical Waste', 4000, true),
  ('Laboratory Waste', 4500, true),
  ('Dental Waste', 4000, true),
  ('Veterinary Waste', 4500, true),
  ('Tattoo & Piercing Waste', 3500, true),
  ('Other', NULL, true)
ON CONFLICT (service_label) DO NOTHING;
