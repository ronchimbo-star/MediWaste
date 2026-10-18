/*
  # Fix collection request INSERT policies for authenticated users

  ## Problem
  The existing INSERT policies on the collection request tables only allow the `anon` role.
  Authenticated users (customers logged into the portal) cannot insert records, causing a 404
  error from PostgREST when the insert returns no rows due to RLS blocking.

  ## Changes
  - Add INSERT policies for `authenticated` role on all three collection request tables
*/

CREATE POLICY "Authenticated users can insert collection requests"
  ON mw_collection_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert collection request items"
  ON mw_collection_request_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert collection request supplies"
  ON mw_collection_request_supplies FOR INSERT
  TO authenticated
  WITH CHECK (true);
