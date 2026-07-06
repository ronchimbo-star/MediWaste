DROP POLICY IF EXISTS "anon_can_read_active_jobs" ON mw_service_jobs;

CREATE POLICY "anon_can_read_active_jobs" ON mw_service_jobs
  FOR SELECT TO anon
  USING (status IN ('scheduled', 'in_progress', 'completed'));
