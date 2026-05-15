/*
  # Add meta_keywords column to seo_pages

  1. Modified Tables
    - `seo_pages`
      - Added `meta_keywords` (text) - Comma-separated SEO keywords for meta tag

  2. Notes
    - Used by AI content generation to store generated keywords
    - Rendered as <meta name="keywords"> on public pages for crawler indexing
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seo_pages' AND column_name = 'meta_keywords'
  ) THEN
    ALTER TABLE seo_pages ADD COLUMN meta_keywords text;
  END IF;
END $$;
