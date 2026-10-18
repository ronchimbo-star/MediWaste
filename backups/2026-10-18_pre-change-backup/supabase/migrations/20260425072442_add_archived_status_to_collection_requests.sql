/*
  # Add archived support to collection requests

  1. Modified Tables
    - `collection_requests`
      - Add `archived_at` (timestamptz) - timestamp when request was archived

  2. Notes
    - The status column already supports free-text values, so 'archived' status works without constraint changes
    - archived_at tracks when the archive action occurred
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_requests' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE collection_requests ADD COLUMN archived_at timestamptz;
  END IF;
END $$;
