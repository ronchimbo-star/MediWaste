/*
  # Create contact_enquiries table and migrate data from contact_submissions

  ## Summary
  The admin dashboard reads from `contact_enquiries` but the contact form was saving
  to `contact_submissions`. This migration:

  1. New Tables
    - `contact_enquiries`
      - `id` (uuid, primary key)
      - `contact_name` (text) - the submitter's name
      - `email` (text)
      - `phone` (text, nullable)
      - `subject` (text, nullable)
      - `message` (text)
      - `status` (text) - pending, read, actioned, archived
      - `read_at` (timestamptz, nullable)
      - `actioned_at` (timestamptz, nullable)
      - `archived_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Data Migration
    - Copies all 6 existing rows from `contact_submissions` into `contact_enquiries`
    - All migrated rows are marked as `pending` (unread/new in admin)
    - Subject is extracted from the first line of the message field

  3. Trigger
    - Adds a trigger on `contact_submissions` so any future inserts automatically
      sync into `contact_enquiries` as well

  4. Security
    - RLS enabled
    - Authenticated users (admin) can read, update, delete
    - Public cannot access
*/

CREATE TABLE IF NOT EXISTS contact_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  subject text,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  read_at timestamptz,
  actioned_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contact enquiries"
  ON contact_enquiries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update contact enquiries"
  ON contact_enquiries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contact enquiries"
  ON contact_enquiries FOR DELETE
  TO authenticated
  USING (true);

INSERT INTO contact_enquiries (id, contact_name, email, phone, subject, message, status, created_at)
SELECT
  gen_random_uuid(),
  name,
  email,
  phone,
  CASE
    WHEN position(E'\n' IN message) > 0
    THEN left(message, position(E'\n' IN message) - 1)
    ELSE left(message, 100)
  END AS subject,
  message,
  'pending',
  created_at
FROM contact_submissions;

CREATE OR REPLACE FUNCTION sync_contact_submission_to_enquiries()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO contact_enquiries (contact_name, email, phone, subject, message, status, created_at)
  VALUES (
    NEW.name,
    NEW.email,
    NEW.phone,
    CASE
      WHEN position(E'\n' IN NEW.message) > 0
      THEN left(NEW.message, position(E'\n' IN NEW.message) - 1)
      ELSE left(NEW.message, 100)
    END,
    NEW.message,
    'pending',
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_contact_submission ON contact_submissions;

CREATE TRIGGER trigger_sync_contact_submission
  AFTER INSERT ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION sync_contact_submission_to_enquiries();
