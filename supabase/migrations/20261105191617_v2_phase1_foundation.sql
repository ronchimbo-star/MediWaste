/*
# MediWaste v2 Phase 1 - Foundation (flags, audit log, email queue, alerts, sync log, analytics)

1. Plain-English summary
- Adds a per-customer switch that turns on v2 for one customer. Only admins can change it.
- Adds an audit trail that records every insert, change and delete on customers, certificates, transfer notes, consignment notes and collection requests.
- Adds an email queue that sends through Resend with up to 3 retries (exponential backoff), and logs every send attempt.
- Sends admin alert emails when a new customer, certificate or collection request is created.
- Adds a sync log table and an analytics events table for later phases.

2. New tables
- `audit_log`: one row per change. Columns: id, created_at, actor_id (who made the change, null for system or anonymous), action (insert/update/delete), entity_type (table name), entity_id, entity_label (company name, certificate number etc.), changed_fields (names of columns that changed, updates only).
- `email_queue`: one row per email to send. Columns: to_email, from_name, from_email, reply_to, subject, html, category, entity_type, entity_id, status (queued, sending, sent, failed), attempts, max_attempts (default 4 = 1 try + 3 retries), next_attempt_at, last_error, provider, provider_message_id, sent_at.
- `email_send_log`: one row per send attempt against an email_queue row (attempt number, outcome sent/failed, provider message id, error text).
- `sync_log`: records of background sync runs (source, status running/success/error, records processed, error message, duration, metadata).
- `analytics_events`: product analytics events (event name, customer, session id, page path, small JSON properties).

3. Modified tables
- `mw_customers`: new column `v2_enabled` (boolean, default false). A trigger forces it to false on insert and blocks changes by anyone who is not an active admin, so customers cannot switch v2 on for themselves.

4. Functions
- `guard_customer_v2_flag()`: enforces the v2_enabled rule above.
- `audit_row_change()`: writes audit_log rows; used by triggers only.
- `queue_admin_alert()`: queues admin alert emails; used by triggers only.
- `track_analytics_event(...)`: records an analytics event for the signed-in customer.
- `email_queue_secret_matches(text)`: lets the email processor check its shared secret without the secret being readable by clients.

5. Scheduling
- A shared secret for the email processor is stored in the secure vault.
- A scheduled job runs every minute and calls the `process-email-queue` edge function with that secret.

6. Security
- RLS enabled on every new table.
- Audit log, email queue, send log, sync log and analytics events are readable only by active admins (is_admin()). No client can write to them directly.
- Email queue admins may change only status, attempts, next_attempt_at and last_error (used for manual retry).
- Analytics recording is available to signed-in users only, through the function above.
- Internal functions are not callable by anon or authenticated clients.

7. Important notes
- Audit triggers record only the names of changed columns, not old and new values, so signatures and personal details are not duplicated into the log.
- Admin alerts go to the existing admin address used across the app.
- Sending uses the Resend account already configured. Gmail is not used for sending in this phase.
*/

-- 1. Per-customer v2 flag with server-side guard
ALTER TABLE mw_customers ADD COLUMN IF NOT EXISTS v2_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_customer_v2_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.v2_enabled := false;
    ELSIF NEW.v2_enabled IS DISTINCT FROM OLD.v2_enabled THEN
      NEW.v2_enabled := OLD.v2_enabled;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_customer_v2_flag ON mw_customers;
CREATE TRIGGER guard_customer_v2_flag
  BEFORE INSERT OR UPDATE ON mw_customers
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_v2_flag();

-- 2. Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_label text,
  changed_fields text[]
);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON audit_log TO authenticated;
GRANT ALL ON audit_log TO service_role;

DROP POLICY IF EXISTS "admin_select_audit_log" ON audit_log;
CREATE POLICY "admin_select_audit_log" ON audit_log FOR SELECT
  TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label_key text;
  v_row jsonb;
  v_changed text[] := NULL;
BEGIN
  v_label_key := TG_ARGV[0];
  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(n.key ORDER BY n.key) INTO v_changed
    FROM jsonb_each(to_jsonb(NEW)) AS n(key, value)
    WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key);

    IF v_changed IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, entity_label, changed_fields)
  VALUES (
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    v_row ->> 'id',
    v_row ->> v_label_key,
    v_changed
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_mw_customers ON mw_customers;
CREATE TRIGGER audit_mw_customers AFTER INSERT OR UPDATE OR DELETE ON mw_customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('company_name');

DROP TRIGGER IF EXISTS audit_mw_certificates ON mw_certificates;
CREATE TRIGGER audit_mw_certificates AFTER INSERT OR UPDATE OR DELETE ON mw_certificates
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('certificate_number');

DROP TRIGGER IF EXISTS audit_mw_waste_transfer_notes ON mw_waste_transfer_notes;
CREATE TRIGGER audit_mw_waste_transfer_notes AFTER INSERT OR UPDATE OR DELETE ON mw_waste_transfer_notes
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('wtn_number');

DROP TRIGGER IF EXISTS audit_mw_hw_consignment_notes ON mw_hw_consignment_notes;
CREATE TRIGGER audit_mw_hw_consignment_notes AFTER INSERT OR UPDATE OR DELETE ON mw_hw_consignment_notes
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('hwcn_number');

DROP TRIGGER IF EXISTS audit_mw_collection_requests ON mw_collection_requests;
CREATE TRIGGER audit_mw_collection_requests AFTER INSERT OR UPDATE OR DELETE ON mw_collection_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('request_number');

-- 3. Email queue and send log
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  to_email text NOT NULL,
  from_name text NOT NULL,
  from_email text NOT NULL,
  reply_to text,
  subject text NOT NULL,
  html text NOT NULL,
  category text NOT NULL,
  entity_type text,
  entity_id text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 4,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text,
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS email_queue_due_idx ON email_queue (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS email_queue_created_idx ON email_queue (created_at DESC);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE (status, attempts, next_attempt_at, last_error, updated_at) ON email_queue TO authenticated;
GRANT ALL ON email_queue TO service_role;

DROP POLICY IF EXISTS "admin_select_email_queue" ON email_queue;
CREATE POLICY "admin_select_email_queue" ON email_queue FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_email_queue" ON email_queue;
CREATE POLICY "admin_update_email_queue" ON email_queue FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  queue_id uuid NOT NULL REFERENCES email_queue(id) ON DELETE CASCADE,
  attempt integer NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('sent', 'failed')),
  provider text NOT NULL,
  provider_message_id text,
  error text
);

CREATE INDEX IF NOT EXISTS email_send_log_queue_idx ON email_send_log (queue_id, attempt);

ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON email_send_log TO authenticated;
GRANT ALL ON email_send_log TO service_role;

DROP POLICY IF EXISTS "admin_select_email_send_log" ON email_send_log;
CREATE POLICY "admin_select_email_send_log" ON email_send_log FOR SELECT
  TO authenticated USING (public.is_admin());

-- 4. Admin alert emails for new customers, certificates and collection requests
CREATE OR REPLACE FUNCTION public.queue_admin_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_label text;
  v_safe text;
BEGIN
  v_kind := TG_ARGV[0];
  v_label := coalesce(to_jsonb(NEW) ->> TG_ARGV[1], '(no reference)');
  v_safe := replace(replace(replace(v_label, '&', '&amp;'), '<', '&lt;'), '>', '&gt;');

  INSERT INTO email_queue (to_email, from_name, from_email, reply_to, subject, html, category, entity_type, entity_id)
  VALUES (
    'ronchimbo@gmail.com',
    'Sarah Benson',
    'sarah.benson@mediwaste.co.uk',
    'sarah.benson@mediwaste.co.uk',
    format('New %s: %s', v_kind, v_label),
    format(
      '<p>A new %s was added to MediWaste: <strong>%s</strong>.</p><p>Recorded at %s (UK time).</p>',
      v_kind,
      v_safe,
      to_char(now() AT TIME ZONE 'Europe/London', 'DD Mon YYYY HH24:MI')
    ),
    'admin_alert',
    TG_TABLE_NAME,
    to_jsonb(NEW) ->> 'id'
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.queue_admin_alert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS alert_admin_new_customer ON mw_customers;
CREATE TRIGGER alert_admin_new_customer AFTER INSERT ON mw_customers
  FOR EACH ROW EXECUTE FUNCTION public.queue_admin_alert('customer', 'company_name');

DROP TRIGGER IF EXISTS alert_admin_new_certificate ON mw_certificates;
CREATE TRIGGER alert_admin_new_certificate AFTER INSERT ON mw_certificates
  FOR EACH ROW EXECUTE FUNCTION public.queue_admin_alert('certificate', 'certificate_number');

DROP TRIGGER IF EXISTS alert_admin_new_collection ON mw_collection_requests;
CREATE TRIGGER alert_admin_new_collection AFTER INSERT ON mw_collection_requests
  FOR EACH ROW EXECUTE FUNCTION public.queue_admin_alert('collection request', 'request_number');

-- 5. Shared secret for the scheduled queue processor
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'email_queue_secret') THEN
    PERFORM vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'email_queue_secret', 'Shared secret for process-email-queue');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.email_queue_secret_matches(p_secret text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT p_secret IS NOT NULL AND EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'email_queue_secret' AND decrypted_secret = p_secret
  );
$$;

REVOKE EXECUTE ON FUNCTION public.email_queue_secret_matches(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_queue_secret_matches(text) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue') THEN
    PERFORM cron.unschedule('process-email-queue');
  END IF;
END;
$$;

SELECT cron.schedule(
  'process-email-queue',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://xezovslgxkhzjumtfrjn.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-queue-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_secret')
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- 6. Sync log
CREATE TABLE IF NOT EXISTS sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'success', 'error')),
  records_processed integer NOT NULL DEFAULT 0,
  error_message text,
  duration_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS sync_log_created_idx ON sync_log (created_at DESC);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON sync_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sync_log TO service_role;

DROP POLICY IF EXISTS "admin_select_sync_log" ON sync_log;
CREATE POLICY "admin_select_sync_log" ON sync_log FOR SELECT
  TO authenticated USING (public.is_admin());

-- 7. Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_name text NOT NULL CHECK (char_length(event_name) BETWEEN 1 AND 80),
  customer_id uuid REFERENCES mw_customers(id) ON DELETE SET NULL,
  session_id text CHECK (char_length(session_id) <= 80),
  path text CHECK (char_length(path) <= 300),
  properties jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(properties) <= 4096)
);

CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events (event_name, created_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON analytics_events TO authenticated;
GRANT ALL ON analytics_events TO service_role;

DROP POLICY IF EXISTS "admin_select_analytics_events" ON analytics_events;
CREATE POLICY "admin_select_analytics_events" ON analytics_events FOR SELECT
  TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_event_name text,
  p_session_id text,
  p_path text,
  p_properties jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM mw_customers WHERE user_id = auth.uid() LIMIT 1;
  END IF;

  INSERT INTO analytics_events (event_name, customer_id, session_id, path, properties)
  VALUES (p_event_name, v_customer_id, p_session_id, p_path, coalesce(p_properties, '{}'::jsonb));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.track_analytics_event(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.track_analytics_event(text, text, text, jsonb) TO authenticated;
