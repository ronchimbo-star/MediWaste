-- Allow public (anon + authenticated) to read WTN photos and job photos
-- so clients can view collection evidence on the compliance/certificate page

CREATE POLICY "public_can_read_wtn_photos" ON mw_wtn_photos
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "public_can_read_job_photos" ON mw_job_photos
  FOR SELECT TO anon, authenticated
  USING (true);
