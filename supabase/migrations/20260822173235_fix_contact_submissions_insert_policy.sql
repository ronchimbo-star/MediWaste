-- The insert policy on contact_submissions was scoped to anon only,
-- so authenticated users (e.g. logged-in admins) could not submit
-- the general contact form. Drop and recreate with both roles.

DROP POLICY IF EXISTS "Enable insert for anon users" ON contact_submissions;

CREATE POLICY "Enable insert for all users" ON contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
