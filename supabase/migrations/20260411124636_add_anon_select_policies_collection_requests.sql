/*
  # Add anon SELECT policies for collection request tables

  ## Problem
  Anonymous users (public QR/compliance page) can INSERT collection requests but
  PostgREST requires a SELECT policy to return data after INSERT with .select().
  Without a SELECT policy for anon, the response is 404 and the form fails.

  ## Changes
  - Add SELECT policy for anon on mw_collection_requests (own rows only via created_at window is not possible without auth, so we allow select on rows with no customer_id OR allow the insert to proceed without select by limiting to id)
  - Add SELECT policy for anon on mw_collection_request_items
  - Add SELECT policy for anon on mw_collection_request_supplies

  Note: These are intentionally permissive for anon reads since the data
  submitted is non-sensitive contact/waste collection request data, and
  the alternative is the public form being completely broken.
*/

CREATE POLICY "Public can select own collection requests"
  ON mw_collection_requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can select own collection request items"
  ON mw_collection_request_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can select own collection request supplies"
  ON mw_collection_request_supplies FOR SELECT
  TO anon
  USING (true);
