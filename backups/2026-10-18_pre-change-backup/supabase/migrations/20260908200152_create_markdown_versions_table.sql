/*
# Create Markdown Versions Table

1. New Tables
- `markdown_versions` — Stores versioned Markdown conversions of web pages.
  - `id` (uuid, primary key)
  - `source_url` (text, not null) — the URL that was converted
  - `source_type` (text, default 'manual') — 'manual' or 'news_article'
  - `article_id` (uuid, nullable, FK to news_articles) — linked article if source is a news article
  - `title` (text) — page title from metadata
  - `description` (text, nullable) — page description from metadata
  - `image` (text, nullable) — OG image URL
  - `markdown_content` (text, not null) — the full markdown output including frontmatter
  - `content_signal` (text, default 'ai-train=yes, search=yes, ai-input=yes')
  - `token_counts` (jsonb) — { original, markdown, savings, savingsPercent }
  - `jsonld_count` (integer, default 0)
  - `version_number` (integer, not null) — auto-incremented per source_url
  - `content_hash` (text, not null) — SHA-256 of markdown_content for change detection
  - `is_latest` (boolean, default true) — marks the current version for a given URL
  - `is_published` (boolean, default false) — if true, accessible by AI bots via public endpoint
  - `public_slug` (text, nullable, unique) — slug for public access URL
  - `created_by` (uuid, nullable, FK to auth.users) — admin who created the version
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `markdown_versions`.
- Admin (authenticated) can perform full CRUD.
- Public (anon) can SELECT only published versions (is_published = true).
- A trigger auto-increments version_number and manages is_latest when a new version is inserted for the same source_url.
- A trigger auto-generates public_slug from the title when is_published is set to true.

3. Indexes
- Index on source_url for version lookups
- Index on is_published for public queries
- Index on public_slug for public access
- Index on article_id for news article lookups
*/

CREATE TABLE IF NOT EXISTS markdown_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  source_type text NOT NULL DEFAULT 'manual',
  article_id uuid REFERENCES news_articles(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  description text,
  image text,
  markdown_content text NOT NULL,
  content_signal text NOT NULL DEFAULT 'ai-train=yes, search=yes, ai-input=yes',
  token_counts jsonb NOT NULL DEFAULT '{"original":0,"markdown":0,"savings":0,"savingsPercent":0}',
  jsonld_count integer NOT NULL DEFAULT 0,
  version_number integer NOT NULL DEFAULT 1,
  content_hash text NOT NULL DEFAULT '',
  is_latest boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT false,
  public_slug text UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE markdown_versions ENABLE ROW LEVEL SECURITY;

-- Admin (authenticated) can do full CRUD
DROP POLICY IF EXISTS "authenticated_select_markdown_versions" ON markdown_versions;
CREATE POLICY "authenticated_select_markdown_versions"
  ON markdown_versions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_markdown_versions" ON markdown_versions;
CREATE POLICY "authenticated_insert_markdown_versions"
  ON markdown_versions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_markdown_versions" ON markdown_versions;
CREATE POLICY "authenticated_update_markdown_versions"
  ON markdown_versions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_markdown_versions" ON markdown_versions;
CREATE POLICY "authenticated_delete_markdown_versions"
  ON markdown_versions FOR DELETE
  TO authenticated USING (true);

-- Public (anon) can SELECT only published versions — this is how AI bots access them
DROP POLICY IF EXISTS "anon_select_published_markdown_versions" ON markdown_versions;
CREATE POLICY "anon_select_published_markdown_versions"
  ON markdown_versions FOR SELECT
  TO anon USING (is_published = true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_markdown_versions_source_url ON markdown_versions(source_url);
CREATE INDEX IF NOT EXISTS idx_markdown_versions_is_published ON markdown_versions(is_published);
CREATE INDEX IF NOT EXISTS idx_markdown_versions_public_slug ON markdown_versions(public_slug);
CREATE INDEX IF NOT EXISTS idx_markdown_versions_article_id ON markdown_versions(article_id);

-- Function to auto-increment version_number and manage is_latest
CREATE OR REPLACE FUNCTION set_markdown_version_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Compute the next version number for this source_url
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO NEW.version_number
  FROM markdown_versions WHERE source_url = NEW.source_url;

  -- Mark all previous versions as not latest
  UPDATE markdown_versions SET is_latest = false WHERE source_url = NEW.source_url AND id != NEW.id;

  -- The new row is the latest
  NEW.is_latest = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_markdown_version_number ON markdown_versions;
CREATE TRIGGER trg_set_markdown_version_number
  BEFORE INSERT ON markdown_versions
  FOR EACH ROW EXECUTE FUNCTION set_markdown_version_number();

-- Function to auto-generate public_slug when is_published is set to true
CREATE OR REPLACE FUNCTION set_markdown_public_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published = true AND NEW.public_slug IS NULL THEN
    DECLARE
      base_slug text;
      candidate_slug text;
      counter integer := 0;
    BEGIN
      base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
      base_slug := trim(both '-' from base_slug);
      base_slug := substring(base_slug from 1 for 80);
      IF base_slug = '' THEN base_slug := 'markdown-version'; END IF;

      candidate_slug := base_slug;
      WHILE EXISTS (SELECT 1 FROM markdown_versions WHERE public_slug = candidate_slug AND id != NEW.id) LOOP
        counter := counter + 1;
        candidate_slug := base_slug || '-' || counter;
      END LOOP;

      NEW.public_slug := candidate_slug;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_markdown_public_slug ON markdown_versions;
CREATE TRIGGER trg_set_markdown_public_slug
  BEFORE INSERT OR UPDATE ON markdown_versions
  FOR EACH ROW EXECUTE FUNCTION set_markdown_public_slug();
