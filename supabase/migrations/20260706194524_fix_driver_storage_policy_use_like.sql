-- Replace foldername-based policy with simpler LIKE check (more reliable across Supabase versions)
DROP POLICY IF EXISTS "Driver anon job photo upload" ON storage.objects;

CREATE POLICY "Driver anon job photo upload" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'media' AND name LIKE 'job-photos/%');
