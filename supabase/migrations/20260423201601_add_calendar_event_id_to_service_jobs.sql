/*
  # Add calendar_event_id to service_jobs

  1. Modified Tables
    - `mw_service_jobs`
      - `calendar_event_id` (text, nullable) - Google Calendar event ID for synced events

  2. Notes
    - Used to track which jobs have been synced to Google Calendar
    - Nullable since not all jobs need calendar sync
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mw_service_jobs' AND column_name = 'calendar_event_id'
  ) THEN
    ALTER TABLE mw_service_jobs ADD COLUMN calendar_event_id text;
  END IF;
END $$;
