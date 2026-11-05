/*
  # Fix broken form submission triggers

  ## Problem
  Two triggers are causing ALL public form submissions to fail with errors:

  1. `trigger_sync_contact_submission` on `contact_submissions`
     - Calls `sync_contact_submission_to_enquiries()`
     - Tries to INSERT into `contact_enquiries` table which does not exist
     - This crashes every contact form submission

  2. `trigger_sync_quote_submission` on `quote_submissions`
     - Calls `sync_quote_submission_to_requests()`
     - References columns that don't match the current schema
     - This table is no longer used for new submissions anyway

  ## Fix
  Drop both broken triggers and their associated functions.
  The forms insert directly into their target tables (contact_submissions,
  quote_requests) so no sync triggers are needed.
*/

DROP TRIGGER IF EXISTS trigger_sync_contact_submission ON contact_submissions;
DROP FUNCTION IF EXISTS sync_contact_submission_to_enquiries();

DROP TRIGGER IF EXISTS trigger_sync_quote_submission ON quote_submissions;
DROP FUNCTION IF EXISTS sync_quote_submission_to_requests();
