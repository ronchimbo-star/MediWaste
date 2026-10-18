/*
  # Add Collection Address and Update Waste Items Structure

  1. Changes
    - Add `collection_address` field to store separate collection address
    - Add `waste_items` JSONB field to store waste lines with customizable collection frequencies
    - Add `accepted_by_date` field to store when the agreement was accepted
    
  2. New Fields
    - `collection_address` (text) - Separate collection address (may differ from business address)
    - `waste_items` (jsonb) - Array of waste items with description and frequency
      Example: [{"description": "Clinical waste bins (60L)", "frequency": "Weekly"}, {"description": "Sharps containers (5L)", "frequency": "Monthly"}]
    - `accepted_by_date` (date) - Date when agreement was accepted by client
    
  3. Notes
    - `waste_types` array remains for backward compatibility
    - `collection_frequency` remains for backward compatibility
*/

-- Add new columns to service_agreements table
DO $$
BEGIN
  -- Add collection_address column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_agreements' AND column_name = 'collection_address'
  ) THEN
    ALTER TABLE service_agreements ADD COLUMN collection_address text;
  END IF;

  -- Add waste_items column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_agreements' AND column_name = 'waste_items'
  ) THEN
    ALTER TABLE service_agreements ADD COLUMN waste_items jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add accepted_by_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_agreements' AND column_name = 'accepted_by_date'
  ) THEN
    ALTER TABLE service_agreements ADD COLUMN accepted_by_date date;
  END IF;
END $$;
