/*
# Create quote training examples table

1. Purpose
   Store patterns learned from analysing previously sent quote emails.
   The AI quote-drafting agent uses these as few-shot examples in its
   prompt to produce quotes that match MediWaste's real pricing and style.

2. New table: mw_quote_training_examples
   - id (uuid, primary key)
   - source_email_id (uuid, nullable, FK to mw_emails)
   - client_name (text)
   - client_business (text, nullable)
   - client_postcode (text, nullable)
   - waste_types (text[])
   - frequency (text, nullable)
   - quote_subject (text) — subject line used in the real sent quote
   - quote_body (text) — full body text of the real sent quote
   - key_details (jsonb) — extracted details (pricing, bin sizes, terms, etc.)
   - analysis_summary (text) — AI-generated summary of what makes this quote good
   - created_at (timestamptz)

3. Security
   Enable RLS. Admin-only access (authenticated).
*/

CREATE TABLE IF NOT EXISTS mw_quote_training_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_email_id uuid REFERENCES mw_emails(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_business text,
  client_postcode text,
  waste_types text[] DEFAULT '{}',
  frequency text,
  quote_subject text NOT NULL,
  quote_body text NOT NULL,
  key_details jsonb DEFAULT '{}',
  analysis_summary text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mw_quote_training_examples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_training_examples" ON mw_quote_training_examples;
CREATE POLICY "select_own_training_examples" ON mw_quote_training_examples
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_training_examples" ON mw_quote_training_examples;
CREATE POLICY "insert_own_training_examples" ON mw_quote_training_examples
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_own_training_examples" ON mw_quote_training_examples;
CREATE POLICY "delete_own_training_examples" ON mw_quote_training_examples
  FOR DELETE TO authenticated USING (true);
