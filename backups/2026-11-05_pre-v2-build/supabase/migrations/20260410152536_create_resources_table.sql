/*
  # Create Resources Table

  ## Summary
  Creates a resource library for storing and categorising documents, templates, guides, and files
  that admin staff can upload and share with customers.

  ## New Tables
  - `mw_resources`
    - `id` (uuid, primary key)
    - `title` (text) — display name of the resource
    - `description` (text, nullable) — optional description
    - `category` (text) — e.g. 'compliance', 'templates', 'guides', 'policies', 'forms', 'other'
    - `file_name` (text) — original filename
    - `file_url` (text) — public URL to the file (stored externally or as base64 for small files)
    - `file_type` (text) — mime type hint e.g. 'pdf', 'docx', 'image'
    - `file_size_bytes` (bigint, nullable)
    - `is_public` (boolean) — if true, customers can access this resource
    - `tags` (text[], nullable)
    - `uploaded_by` (uuid, nullable) — auth user
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated users can manage all resources (admin portal)
  - Public resources are readable by anyone (for customer portal)
*/

CREATE TABLE IF NOT EXISTS mw_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'pdf',
  file_size_bytes bigint,
  is_public boolean NOT NULL DEFAULT false,
  tags text[],
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mw_resources_category_idx ON mw_resources(category);
CREATE INDEX IF NOT EXISTS mw_resources_is_public_idx ON mw_resources(is_public);
CREATE INDEX IF NOT EXISTS mw_resources_created_at_idx ON mw_resources(created_at DESC);

ALTER TABLE mw_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all resources"
  ON mw_resources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read public resources"
  ON mw_resources FOR SELECT
  TO anon
  USING (is_public = true);

CREATE POLICY "Authenticated users can insert resources"
  ON mw_resources FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update resources"
  ON mw_resources FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete resources"
  ON mw_resources FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
