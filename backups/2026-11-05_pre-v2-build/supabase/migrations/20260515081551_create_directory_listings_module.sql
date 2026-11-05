/*
  # Create Directory Listings Module

  1. New Tables
    - `directory_listings`
      - `id` (uuid, primary key)
      - `directory_name` (text, not null) - Name of the directory
      - `directory_link` (text, not null) - URL where listing lives
      - `category` (text, not null) - General, Medical, Aesthetic, Local, Niche
      - `status` (text, not null, default 'pending') - live, pending, expired
      - `notes` (text) - Admin notes about listing
      - `use_nofollow` (boolean, default false) - Whether to add rel="nofollow"
      - `date_added` (timestamptz, default now())
      - `last_checked` (timestamptz)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

    - `directory_settings`
      - `id` (uuid, primary key)
      - `business_name` (text)
      - `business_address` (text)
      - `about_short` (text) - 50-100 word description
      - `about_long` (text) - 200-400 word description
      - `services` (text) - comma-separated
      - `keywords` (text) - comma-separated
      - `contact_email` (text)
      - `contact_phone` (text)
      - `website_url` (text)
      - `social_media_links` (jsonb) - object of platform:url pairs
      - `opening_hours` (text)
      - `public_intro` (text) - Intro paragraph for public page
      - `meta_title_override` (text) - Optional meta title override
      - `meta_description_override` (text) - Optional meta description override
      - `show_status_badges` (boolean, default true)
      - `show_notes_publicly` (boolean, default false)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - RLS enabled on both tables
    - Authenticated users can perform all CRUD operations
    - Anon users can read live listings and settings (for public page)

  3. Indexes
    - Index on directory_listings.status for filtering live listings
    - Index on directory_listings.category for grouping
*/

-- Create directory_listings table
CREATE TABLE IF NOT EXISTS directory_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_name text NOT NULL,
  directory_link text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  use_nofollow boolean DEFAULT false,
  date_added timestamptz DEFAULT now(),
  last_checked timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create directory_settings table (singleton row pattern)
CREATE TABLE IF NOT EXISTS directory_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text DEFAULT '',
  business_address text DEFAULT '',
  about_short text DEFAULT '',
  about_long text DEFAULT '',
  services text DEFAULT '',
  keywords text DEFAULT '',
  contact_email text DEFAULT '',
  contact_phone text DEFAULT '',
  website_url text DEFAULT '',
  social_media_links jsonb DEFAULT '{}',
  opening_hours text DEFAULT '',
  public_intro text DEFAULT '',
  meta_title_override text DEFAULT '',
  meta_description_override text DEFAULT '',
  show_status_badges boolean DEFAULT true,
  show_notes_publicly boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_directory_listings_status ON directory_listings(status);
CREATE INDEX IF NOT EXISTS idx_directory_listings_category ON directory_listings(category);

-- Enable RLS
ALTER TABLE directory_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for directory_listings
CREATE POLICY "Authenticated can read all directory listings"
  ON directory_listings FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert directory listings"
  ON directory_listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update directory listings"
  ON directory_listings FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete directory listings"
  ON directory_listings FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can read live directory listings"
  ON directory_listings FOR SELECT
  TO anon
  USING (status = 'live');

-- RLS policies for directory_settings
CREATE POLICY "Authenticated can read directory settings"
  ON directory_settings FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert directory settings"
  ON directory_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update directory settings"
  ON directory_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public can read directory settings"
  ON directory_settings FOR SELECT
  TO anon
  USING (true);

-- Insert default settings row
INSERT INTO directory_settings (business_name, about_short, about_long, services, keywords, website_url, public_intro)
VALUES (
  'MediWaste',
  'MediWaste provides fully licensed clinical waste disposal services across London and the South East. We serve healthcare providers, dental practices, beauty clinics, and veterinary surgeries.',
  'MediWaste is a fully licensed clinical waste disposal company serving healthcare providers, dental practices, beauty and aesthetics clinics, veterinary surgeries, and GP practices across London, Kent, Essex, Surrey, Sussex, and Hampshire. We provide compliant waste collection, segregation guidance, duty of care documentation, and certificates of destruction. Our services are tailored to your practice size and waste volumes, ensuring you remain fully compliant with Environmental Protection Act 1990 and Duty of Care regulations.',
  'Clinical Waste Collection, Sharps Disposal, Pharmaceutical Waste, Dental Waste, Hazardous Waste, Anatomical Waste, Beauty & Aesthetics Waste',
  'clinical waste, medical waste disposal, sharps collection, healthcare waste, dental waste disposal',
  'https://www.mediwaste.co.uk',
  'We are listed across trusted UK directories to help healthcare practitioners, beauty professionals, and dental practices find our clinical waste disposal services. Below you can verify our presence and find us on each platform.'
);
