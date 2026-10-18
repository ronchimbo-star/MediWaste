/*
  # Add SEO page views RPC function

  1. New Functions
    - `increment_seo_page_views(page_slug text)` - Increments view counter for a published SEO page
  
  2. Security
    - Function is accessible to anon role for public page view tracking
    - Only increments views for published pages
*/

CREATE OR REPLACE FUNCTION increment_seo_page_views(page_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE seo_pages
  SET views = COALESCE(views, 0) + 1
  WHERE url_slug = page_slug AND status = 'published';
END;
$$;

GRANT EXECUTE ON FUNCTION increment_seo_page_views(text) TO anon;
GRANT EXECUTE ON FUNCTION increment_seo_page_views(text) TO authenticated;
