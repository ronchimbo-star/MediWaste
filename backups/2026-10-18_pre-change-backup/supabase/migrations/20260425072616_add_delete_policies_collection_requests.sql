/*
  # Add delete policies for collection requests

  1. Security Changes
    - Add DELETE policy on `collection_requests` for authenticated users
    - Add DELETE policy on `collection_request_items` for authenticated users
    - Add DELETE policy on `collection_request_supplies` for authenticated users

  2. Notes
    - Only authenticated users (admin/staff) can delete collection requests
    - Child records (items, supplies) must be deletable so parent can be cleaned up
*/

CREATE POLICY "Authenticated users can delete collection requests"
  ON collection_requests
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete collection request items"
  ON collection_request_items
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete collection request supplies"
  ON collection_request_supplies
  FOR DELETE
  TO authenticated
  USING (true);
