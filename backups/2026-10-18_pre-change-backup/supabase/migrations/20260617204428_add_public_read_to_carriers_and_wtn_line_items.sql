-- Allow public (anon) read access to waste carrier details for compliance page display
CREATE POLICY "Public can view waste carriers"
  ON mw_waste_carriers FOR SELECT TO anon
  USING (true);

-- Allow public (anon) read access to WTN line items for compliance page display
CREATE POLICY "Public can view wtn line items"
  ON mw_wtn_line_items FOR SELECT TO anon
  USING (true);
