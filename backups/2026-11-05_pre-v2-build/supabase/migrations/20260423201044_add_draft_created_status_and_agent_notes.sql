/*
  # Add draft_created status and agent notes to quote_requests

  1. Modified Tables
    - `quote_requests`
      - `agent_notes` (text, nullable) - Notes from the automated quote agent
      - `agent_drafted_at` (timestamptz, nullable) - When the agent created a draft

  2. Notes
    - A new status 'draft_created' is now valid for quote_requests
    - This sits between 'pending/read' and 'actioned' in the workflow
    - Status is enforced at the application level (no DB constraint change needed)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'agent_notes'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN agent_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'agent_drafted_at'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN agent_drafted_at timestamptz;
  END IF;
END $$;
