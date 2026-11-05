/*
  # Add Gmail Sync Schedule Settings

  ## Summary
  Adds a dedicated gmail_sync_config table to store Gmail sync schedule configuration
  including frequency, max results per sync, and enabled/disabled status.

  ## New Tables
  - `mw_gmail_sync_config`
    - `id` (text, primary key) — always 'default'
    - `enabled` (boolean) — whether auto-sync is enabled
    - `sync_frequency_minutes` (integer) — how often to sync in minutes
    - `max_results_per_sync` (integer) — max emails per sync call
    - `last_triggered_at` (timestamptz, nullable)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Only authenticated users can read/update
*/

CREATE TABLE IF NOT EXISTS mw_gmail_sync_config (
  id text PRIMARY KEY DEFAULT 'default',
  enabled boolean NOT NULL DEFAULT false,
  sync_frequency_minutes integer NOT NULL DEFAULT 30,
  max_results_per_sync integer NOT NULL DEFAULT 100,
  last_triggered_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO mw_gmail_sync_config (id, enabled, sync_frequency_minutes, max_results_per_sync)
VALUES ('default', false, 30, 100)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE mw_gmail_sync_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read gmail sync config"
  ON mw_gmail_sync_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update gmail sync config"
  ON mw_gmail_sync_config FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
