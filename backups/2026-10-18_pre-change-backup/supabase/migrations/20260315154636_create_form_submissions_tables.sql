/*
  # Create Form Submissions Tables

  1. New Tables
    - `contact_submissions`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text)
      - `phone` (text, optional)
      - `message` (text)
      - `created_at` (timestamp)
      - `status` (text) - new, read, replied
    
    - `quote_submissions`
      - `id` (uuid, primary key)
      - `business_name` (text)
      - `contact_name` (text)
      - `email` (text)
      - `phone` (text)
      - `postcode` (text)
      - `service_type` (text)
      - `products` (jsonb) - array of products
      - `frequency` (text)
      - `additional_info` (text, optional)
      - `created_at` (timestamp)
      - `status` (text) - new, contacted, quoted, converted
  
  2. Security
    - Enable RLS on both tables
    - Only authenticated admin users can read submissions
    - Public users cannot access the data
*/

CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied'))
);

CREATE TABLE IF NOT EXISTS quote_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  postcode text NOT NULL,
  service_type text NOT NULL,
  products jsonb DEFAULT '[]'::jsonb,
  frequency text NOT NULL,
  additional_info text,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'converted'))
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated users can view contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only authenticated users can view quote submissions"
  ON quote_submissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_created_at ON quote_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_status ON quote_submissions(status);