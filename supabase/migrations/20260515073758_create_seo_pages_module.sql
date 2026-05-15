/*
  # Create SEO Pages Module

  1. New Tables
    - `seo_categories`
      - `id` (uuid, primary key)
      - `name` (text) - e.g. "Sharps", "Dental", "Beauty & Aesthetics"
      - `slug` (text, unique)
      - `description` (text, optional)
      - `created_at` (timestamptz)

    - `seo_pages`
      - `id` (uuid, primary key)
      - `url_slug` (text, unique) - the URL path for this page
      - `target_keyword` (text) - primary SEO keyword
      - `location` (text, optional) - e.g. "London", "Kent"
      - `service_type` (text, optional) - e.g. "sharps-disposal"
      - `category_id` (uuid, FK to seo_categories)
      - `status` (text) - draft/published/archived
      - `meta_title` (text) - generated or manual
      - `meta_description` (text) - generated or manual
      - `h1` (text) - page heading
      - `content` (text) - full HTML body content
      - `internal_links` (jsonb) - array of internal link objects
      - `canonical_url` (text)
      - `og_title` (text)
      - `og_description` (text)
      - `og_image` (text)
      - `views` (integer, default 0)
      - `last_generated_at` (timestamptz)
      - `published_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `seo_generation_logs`
      - `id` (uuid, primary key)
      - `page_id` (uuid, FK to seo_pages)
      - `action` (text) - generate/regenerate/edit
      - `prompt_used` (text)
      - `tokens_used` (integer)
      - `model` (text)
      - `status` (text) - success/error
      - `error_message` (text, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Authenticated users can manage all records (admin only in practice)
    - Public users can read published seo_pages (for the frontend)
    - Public users can read seo_categories
*/

-- SEO Categories
CREATE TABLE IF NOT EXISTS seo_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE seo_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read seo categories"
  ON seo_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage seo categories"
  ON seo_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update seo categories"
  ON seo_categories FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete seo categories"
  ON seo_categories FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Insert default categories
INSERT INTO seo_categories (name, slug, description) VALUES
  ('Sharps', 'sharps', 'Sharps waste disposal and needle safety'),
  ('Dental', 'dental', 'Dental practice waste management'),
  ('Beauty & Aesthetics', 'beauty-aesthetics', 'Beauty clinics and aesthetic practices'),
  ('Hazardous', 'hazardous', 'Hazardous and chemical waste'),
  ('Pharmaceutical', 'pharmaceutical', 'Pharmaceutical and medicinal waste'),
  ('Veterinary', 'veterinary', 'Veterinary practice waste management'),
  ('GP Surgeries', 'gp-surgeries', 'GP and medical surgery waste'),
  ('Anatomical', 'anatomical', 'Anatomical and pathological waste')
ON CONFLICT (slug) DO NOTHING;

-- SEO Pages
CREATE TABLE IF NOT EXISTS seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_slug text UNIQUE NOT NULL,
  target_keyword text NOT NULL,
  location text,
  service_type text,
  category_id uuid REFERENCES seo_categories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  meta_title text,
  meta_description text,
  h1 text,
  content text,
  internal_links jsonb DEFAULT '[]'::jsonb,
  canonical_url text,
  og_title text,
  og_description text,
  og_image text,
  views integer DEFAULT 0,
  last_generated_at timestamptz,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE seo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published seo pages"
  ON seo_pages FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY "Authenticated can read all seo pages"
  ON seo_pages FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert seo pages"
  ON seo_pages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update seo pages"
  ON seo_pages FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete seo pages"
  ON seo_pages FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seo_pages_status ON seo_pages(status);
CREATE INDEX IF NOT EXISTS idx_seo_pages_category ON seo_pages(category_id);
CREATE INDEX IF NOT EXISTS idx_seo_pages_location ON seo_pages(location);
CREATE INDEX IF NOT EXISTS idx_seo_pages_url_slug ON seo_pages(url_slug);

-- SEO Generation Logs
CREATE TABLE IF NOT EXISTS seo_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES seo_pages(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT 'generate',
  prompt_used text,
  tokens_used integer,
  model text,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE seo_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read generation logs"
  ON seo_generation_logs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert generation logs"
  ON seo_generation_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
