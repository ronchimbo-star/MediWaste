-- Migrate existing meta_title/meta_description/meta_keywords data
-- into seo_title/seo_description/seo_keywords columns.
-- Only updates rows where seo_* fields are NULL or empty and meta_* fields have data.

UPDATE news_articles
SET
  seo_title = CASE
    WHEN (seo_title IS NULL OR seo_title = '') AND (meta_title IS NOT NULL AND meta_title != '')
    THEN meta_title
    ELSE seo_title
  END,
  seo_description = CASE
    WHEN (seo_description IS NULL OR seo_description = '') AND (meta_description IS NOT NULL AND meta_description != '')
    THEN meta_description
    ELSE seo_description
  END,
  seo_keywords = CASE
    WHEN (seo_keywords IS NULL OR array_length(seo_keywords, 1) IS NULL) AND (meta_keywords IS NOT NULL AND meta_keywords != '')
    THEN string_to_array(meta_keywords, ',')
    ELSE seo_keywords
  END
WHERE
  ((seo_title IS NULL OR seo_title = '') AND meta_title IS NOT NULL AND meta_title != '')
  OR
  ((seo_description IS NULL OR seo_description = '') AND meta_description IS NOT NULL AND meta_description != '')
  OR
  ((seo_keywords IS NULL OR array_length(seo_keywords, 1) IS NULL) AND meta_keywords IS NOT NULL AND meta_keywords != '');