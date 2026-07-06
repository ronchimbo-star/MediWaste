-- Allow anonymous users to read scheduled/in_progress jobs (job number, type, date only — no customer PII)
CREATE POLICY "anon_can_read_active_jobs" ON mw_service_jobs
  FOR SELECT TO anon
  USING (status IN ('scheduled', 'in_progress'));

-- Allow anonymous users to insert photos against a job (PIN-gated client-side)
CREATE POLICY "anon_can_upload_job_photos" ON mw_job_photos
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anonymous uploads to media bucket under job-photos/ path
CREATE POLICY "Driver anon job photo upload" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = 'job-photos');
