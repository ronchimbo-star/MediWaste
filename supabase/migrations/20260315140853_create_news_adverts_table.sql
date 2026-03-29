/*
  # Create news adverts table

  1. New Tables
    - `news_adverts`
      - `id` (uuid, primary key) - Unique identifier for the advert
      - `title` (text) - Title of the advert
      - `description` (text) - Description text for the advert
      - `link_text` (text) - Text for the call-to-action button
      - `link_url` (text) - URL the advert links to
      - `background_color` (text) - Optional background color for the advert box
      - `position` (integer) - Display order/priority of the advert (lower numbers display first)
      - `status` (text) - Status of the advert (active, inactive, archived)
      - `created_at` (timestamptz) - When the advert was created
      - `updated_at` (timestamptz) - When the advert was last updated
  
  2. Security
    - Enable RLS on `news_adverts` table
    - Add policy for public read access to active adverts
*/

CREATE TABLE IF NOT EXISTS news_adverts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  link_text text NOT NULL DEFAULT 'Learn More',
  link_url text NOT NULL,
  background_color text DEFAULT '#f9fafb',
  position integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE news_adverts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active news adverts"
  ON news_adverts
  FOR SELECT
  USING (status = 'active');

CREATE INDEX IF NOT EXISTS idx_news_adverts_status_position ON news_adverts(status, position);
