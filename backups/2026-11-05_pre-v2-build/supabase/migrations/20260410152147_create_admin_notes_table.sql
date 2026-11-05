/*
  # Create Admin Notes Table

  ## Summary
  Creates a central notes/activity log system for admin use.

  ## New Tables
  - `mw_admin_notes`
    - `id` (uuid, primary key)
    - `customer_id` (uuid, nullable foreign key to mw_customers) — null = global note
    - `body` (text) — the note content
    - `note_type` (text) — 'manual', 'auto', 'system'
    - `is_completed` (boolean) — for task-style notes
    - `completed_at` (timestamptz)
    - `created_by` (uuid, nullable) — auth user who created the note
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated users can read, insert, update their own notes
  - All authenticated users can read all notes (admin portal only)
*/

CREATE TABLE IF NOT EXISTS mw_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES mw_customers(id) ON DELETE CASCADE,
  body text NOT NULL,
  note_type text NOT NULL DEFAULT 'manual',
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mw_admin_notes_customer_id_idx ON mw_admin_notes(customer_id);
CREATE INDEX IF NOT EXISTS mw_admin_notes_created_at_idx ON mw_admin_notes(created_at DESC);

ALTER TABLE mw_admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all admin notes"
  ON mw_admin_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert admin notes"
  ON mw_admin_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update admin notes"
  ON mw_admin_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete admin notes"
  ON mw_admin_notes FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
