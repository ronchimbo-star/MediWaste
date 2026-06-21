CREATE POLICY "anon_can_insert_media" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'media');