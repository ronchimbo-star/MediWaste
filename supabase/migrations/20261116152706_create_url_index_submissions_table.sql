/*
# Create URL index submission log

1. Summary
This migration creates the database backing for the new "Google indexing"
feature. When a new page is published on the MediWaste website, the site
notifies search engines (IndexNow for Bing/Seznam/Naver/Yandex, and Google's
Indexing API endpoints where applicable) so the page gets crawled quickly
instead of waiting for the next natural crawl. This table is the audit log of
those notifications, and also acts as a to-do list of URLs still awaiting
their first successful submission.

2. New Tables
- `url_index_submissions`
  - `id` (uuid, primary key) — row identifier.
  - `url` (text, not null) — the full absolute URL that was submitted.
  - `source` (text, not null, default 'manual') — where the submission came
    from: `publish_auto` (fired automatically when a page was published),
    `sitemap_ping` (bulk submission from the admin sitemap page), or
    `manual` (submitted by hand from the admin indexing page).
  - `engine` (text, not null, default 'indexnow') — which endpoint received
    the submission: `indexnow` or `google`.
  - `status` (text, not null, default 'pending') — `pending`, `success` or
    `failed`.
  - `response_code` (integer, nullable) — HTTP status returned by the search
    engine endpoint, when known.
  - `response_detail` (text, nullable) — short engine response or error text.
  - `created_at` (timestamptz, default now()) — when the submission happened.

3. Security
- RLS is enabled on `url_index_submissions`.
- Grant: SELECT, INSERT, DELETE to `authenticated` only (this feature lives
  in the signed-in admin area; the public never reads it), plus SELECT,
  INSERT, UPDATE, DELETE to `service_role` because the edge function that
  talks to the search engines writes rows with the service role key.
- Policies: authenticated admins can list, add and clear submissions;
  everyone else is denied.

4. Notes
- A unique index on (url, engine, created_at) is intentionally NOT added:
  repeat submissions of the same URL are meaningful (re-ping after content
  change), so duplicates are allowed by design.
- An index on (status, created_at) supports the admin list view, which shows
  pending submissions first, newest first.
*/

CREATE TABLE IF NOT EXISTS url_index_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  engine text NOT NULL DEFAULT 'indexnow',
  status text NOT NULL DEFAULT 'pending',
  response_code integer,
  response_detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE url_index_submissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON url_index_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON url_index_submissions TO service_role;

DROP POLICY IF EXISTS "authenticated_select_submissions" ON url_index_submissions;
CREATE POLICY "authenticated_select_submissions"
ON url_index_submissions FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_submissions" ON url_index_submissions;
CREATE POLICY "authenticated_insert_submissions"
ON url_index_submissions FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_submissions" ON url_index_submissions;
CREATE POLICY "authenticated_delete_submissions"
ON url_index_submissions FOR DELETE
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_url_index_submissions_status_created
ON url_index_submissions (status, created_at DESC);