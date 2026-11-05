/*
  # Allow Public Form Submissions

  1. Changes
    - Add INSERT policies for public users to submit contact forms
    - Add INSERT policies for public users to submit quote requests
    - Keep SELECT policies restricted to authenticated users only
  
  2. Security
    - Public users can INSERT but cannot SELECT
    - Only authenticated admin users can view submissions
    - This allows form submissions while protecting data privacy
*/

CREATE POLICY "Allow public to submit contact forms"
  ON contact_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public to submit quote requests"
  ON quote_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);