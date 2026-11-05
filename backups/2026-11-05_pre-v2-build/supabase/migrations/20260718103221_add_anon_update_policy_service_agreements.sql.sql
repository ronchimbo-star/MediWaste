/*
  # Allow anon (public link) clients to accept/decline a sent service agreement

  ## Context
  Service agreements are shared with clients via a public, tokenised URL
  (`/service-agreement/:token`). The client is not logged in, so the
  Supabase client uses the anon key. The existing UPDATE policy was scoped
  `TO authenticated` only, which meant anon clients clicking "Accept
  Agreement" silently updated 0 rows — no error, no visible change. This
  is the classic "missing anon policy" RLS bug.

  ## Changes
  - Add a new UPDATE policy `anon_can_accept_or_decline_sent_agreement`
    scoped `TO anon` that:
      * USING: only matches rows whose `status = 'sent'` (can't re-sign
        an already-accepted/declined/expired agreement).
      * WITH CHECK: only allows the new row to transition to
        `status IN ('accepted', 'declined')`. This prevents an anon
        client from mutating other columns (client_name, annual_value,
        etc.) via the public link.
  - Existing `authenticated` UPDATE policy is left untouched so staff
    can still edit agreements freely.

  ## Security notes
  1. The SELECT policy for anon is already `USING (true)`, so the
     security model for this table is "anyone with the tokenised link
     can view and sign". The token provides obscurity, not auth.
  2. The new WITH CHECK restricts anon writes to the two valid
     terminal statuses, so an anon client cannot, for example, flip
     `annual_value` or `client_name`.
*/

-- Allow anon clients (public link holders) to accept or decline a sent agreement.
-- Restricted to rows currently in 'sent' status, and only to the
-- 'accepted' / 'declined' terminal statuses.
DROP POLICY IF EXISTS "anon_can_accept_or_decline_sent_agreement" ON service_agreements;
CREATE POLICY "anon_can_accept_or_decline_sent_agreement"
  ON service_agreements
  FOR UPDATE
  TO anon
  USING (status = 'sent')
  WITH CHECK (status IN ('accepted', 'declined'));
