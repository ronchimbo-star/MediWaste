-- Fix mw_job_photos: add storage_path, make uploaded_by nullable, set default for photo_type
ALTER TABLE mw_job_photos
  ADD COLUMN IF NOT EXISTS storage_path text,
  ALTER COLUMN uploaded_by DROP NOT NULL,
  ALTER COLUMN photo_type SET DEFAULT 'collection';

-- Create mw_wtn_photos join table (links job photos to a WTN)
CREATE TABLE IF NOT EXISTS mw_wtn_photos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wtn_id     uuid NOT NULL REFERENCES mw_waste_transfer_notes(id) ON DELETE CASCADE,
  photo_id   uuid NOT NULL REFERENCES mw_job_photos(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (wtn_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_mw_wtn_photos_wtn_id  ON mw_wtn_photos (wtn_id);
CREATE INDEX IF NOT EXISTS idx_mw_wtn_photos_photo_id ON mw_wtn_photos (photo_id);

ALTER TABLE mw_wtn_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage wtn photos" ON mw_wtn_photos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
