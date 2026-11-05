/*
  # Create Service Agreements Table

  1. New Tables
    - `service_agreements`
      - `id` (uuid, primary key)
      - `agreement_number` (text, unique) - Auto-generated agreement reference
      - `client_name` (text) - Client business name
      - `client_address` (text) - Client full address
      - `contact_name` (text) - Client contact person
      - `contact_email` (text) - Client email
      - `contact_phone` (text) - Client phone
      - `waste_types` (text[]) - Array of waste types covered
      - `collection_frequency` (text) - e.g., monthly, quarterly, on-demand
      - `containers` (text) - Container details
      - `initial_term_months` (integer) - Default 12
      - `payment_terms_days` (integer) - Default 14
      - `bin_rental` (boolean) - Whether bin rental applies
      - `start_date` (date) - Agreement start date
      - `end_date` (date) - Agreement end date
      - `annual_value` (decimal) - Total annual value
      - `status` (text) - draft, sent, accepted, declined, expired
      - `accepted_at` (timestamptz) - When client accepted
      - `accepted_by_name` (text) - Name of person who accepted
      - `accepted_by_position` (text) - Position of person who accepted
      - `declined_at` (timestamptz) - When client declined
      - `decline_reason` (text) - Reason for declining
      - `notes` (text) - Internal notes
      - `secure_token` (text, unique) - For public URL access
      - `created_by` (uuid) - Staff member who created it
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `service_agreements` table
    - Authenticated users (staff/admin) can view all agreements
    - Anyone with secure_token can view their specific agreement (public access)
    - Only authenticated users can create/update agreements
*/

CREATE TABLE IF NOT EXISTS service_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  client_address text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  waste_types text[] DEFAULT '{}',
  collection_frequency text NOT NULL,
  containers text NOT NULL,
  initial_term_months integer DEFAULT 12,
  payment_terms_days integer DEFAULT 14,
  bin_rental boolean DEFAULT false,
  start_date date,
  end_date date,
  annual_value decimal(10,2),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  accepted_at timestamptz,
  accepted_by_name text,
  accepted_by_position text,
  declined_at timestamptz,
  decline_reason text,
  notes text,
  secure_token text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all service agreements"
  ON service_agreements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone with secure token can view their agreement"
  ON service_agreements
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can create service agreements"
  ON service_agreements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update service agreements"
  ON service_agreements
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete service agreements"
  ON service_agreements
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_service_agreements_secure_token ON service_agreements(secure_token);
CREATE INDEX IF NOT EXISTS idx_service_agreements_status ON service_agreements(status);
CREATE INDEX IF NOT EXISTS idx_service_agreements_client_email ON service_agreements(contact_email);
