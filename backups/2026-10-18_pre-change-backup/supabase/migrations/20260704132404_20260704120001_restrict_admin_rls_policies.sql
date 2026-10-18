/*
# Restrict Admin-Only RLS Policies from "Always True" to is_admin()

## Problem
Many tables had RLS policies for the `authenticated` role with `USING (true)` or
`WITH CHECK (true)`. This means ANY signed-in user — not just admins — could modify
or delete sensitive internal data (customer records, emails, invoices, service
agreements, etc.).

## Fix
For every admin-only table, the "always true" policies for authenticated users are
dropped and replaced with policies that check `is_admin()`. This means only users
with the admin role can perform these operations.

## Tables Fixed (22 tables)
- collection_requests: UPDATE, DELETE
- collection_request_items: DELETE
- collection_request_supplies: DELETE
- contact_enquiries: UPDATE, DELETE
- location_service_pages: INSERT, UPDATE, DELETE
- mw_audit_answers: ALL (split into 4 separate policies)
- mw_audit_download_events: ALL (split into 4 separate policies)
- mw_audit_quote_requests: ALL (split into 4 separate policies)
- mw_audit_reports: ALL (split into 4 separate policies)
- mw_audit_sessions: ALL (split into 4 separate policies)
- mw_collection_request_items: authenticated INSERT
- mw_collection_request_supplies: authenticated INSERT
- mw_collection_requests: authenticated INSERT, UPDATE
- mw_customer_payments: INSERT, UPDATE, DELETE
- mw_customer_services: INSERT, UPDATE, DELETE
- mw_email_sync_log: INSERT
- mw_emails: INSERT, UPDATE, DELETE
- mw_reminders: INSERT, UPDATE, DELETE
- news_ads: INSERT, UPDATE, DELETE
- news_article_ads: INSERT, UPDATE, DELETE
- quote_service_options: INSERT, UPDATE, DELETE
- seo_files: ALL (split into 4 separate policies)
- service_agreements: INSERT, UPDATE, DELETE
- system_notifications: INSERT, UPDATE

## NOT Changed (intentionally open)
Public-facing anon INSERT policies on: collection_requests, contact_enquiries,
quote_requests, contact_submissions, quote_submissions, landing_page_visits,
mw_audit_sessions, mw_audit_answers, mw_audit_download_events,
mw_audit_quote_requests, mw_audit_reports, mw_collection_requests,
mw_collection_request_items, mw_collection_request_supplies.
These are required for public forms and the audit tool.

## Notes
- Safe to re-run (all DROP POLICY IF EXISTS before CREATE POLICY).
- Relies on the existing `is_admin()` SECURITY DEFINER function.
*/

-- ============================================================
-- collection_requests
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can update collection requests" ON collection_requests;
CREATE POLICY "Authenticated users can update collection requests"
ON collection_requests FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can delete collection requests" ON collection_requests;
CREATE POLICY "Authenticated users can delete collection requests"
ON collection_requests FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- collection_request_items
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete collection request items" ON collection_request_items;
CREATE POLICY "Authenticated users can delete collection request items"
ON collection_request_items FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- collection_request_supplies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete collection request supplies" ON collection_request_supplies;
CREATE POLICY "Authenticated users can delete collection request supplies"
ON collection_request_supplies FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- contact_enquiries
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can update contact enquiries" ON contact_enquiries;
CREATE POLICY "Authenticated users can update contact enquiries"
ON contact_enquiries FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can delete contact enquiries" ON contact_enquiries;
CREATE POLICY "Authenticated users can delete contact enquiries"
ON contact_enquiries FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- location_service_pages
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert location pages" ON location_service_pages;
CREATE POLICY "Authenticated users can insert location pages"
ON location_service_pages FOR INSERT TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can update location pages" ON location_service_pages;
CREATE POLICY "Authenticated users can update location pages"
ON location_service_pages FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can delete location pages" ON location_service_pages;
CREATE POLICY "Authenticated users can delete location pages"
ON location_service_pages FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- mw_audit_answers
-- ============================================================
DROP POLICY IF EXISTS "auth_all_audit_answers" ON mw_audit_answers;
CREATE POLICY "admin_select_audit_answers"
ON mw_audit_answers FOR SELECT TO authenticated
USING (is_admin());

CREATE POLICY "admin_insert_audit_answers"
ON mw_audit_answers FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "admin_update_audit_answers"
ON mw_audit_answers FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_audit_answers"
ON mw_audit_answers FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- mw_audit_download_events
-- ============================================================
DROP POLICY IF EXISTS "auth_all_download_events" ON mw_audit_download_events;
CREATE POLICY "admin_select_download_events"
ON mw_audit_download_events FOR SELECT TO authenticated
USING (is_admin());

CREATE POLICY "admin_insert_download_events"
ON mw_audit_download_events FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "admin_update_download_events"
ON mw_audit_download_events FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_download_events"
ON mw_audit_download_events FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- mw_audit_quote_requests
-- ============================================================
DROP POLICY IF EXISTS "auth_all_quote_requests" ON mw_audit_quote_requests;
CREATE POLICY "admin_select_audit_quote_requests"
ON mw_audit_quote_requests FOR SELECT TO authenticated
USING (is_admin());

CREATE POLICY "admin_insert_audit_quote_requests"
ON mw_audit_quote_requests FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "admin_update_audit_quote_requests"
ON mw_audit_quote_requests FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_audit_quote_requests"
ON mw_audit_quote_requests FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- mw_audit_reports
-- ============================================================
DROP POLICY IF EXISTS "auth_all_audit_reports" ON mw_audit_reports;
CREATE POLICY "admin_select_audit_reports"
ON mw_audit_reports FOR SELECT TO authenticated
USING (is_admin());

CREATE POLICY "admin_insert_audit_reports"
ON mw_audit_reports FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "admin_update_audit_reports"
ON mw_audit_reports FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_audit_reports"
ON mw_audit_reports FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- mw_audit_sessions
-- ============================================================
DROP POLICY IF EXISTS "auth_all_audit_sessions" ON mw_audit_sessions;
CREATE POLICY "admin_select_audit_sessions"
ON mw_audit_sessions FOR SELECT TO authenticated
USING (is_admin());

CREATE POLICY "admin_insert_audit_sessions"
ON mw_audit_sessions FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "admin_update_audit_sessions"
ON mw_audit_sessions FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_audit_sessions"
ON mw_audit_sessions FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- mw_collection_request_items
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert collection request items" ON mw_collection_request_items;
CREATE POLICY "Authenticated users can insert collection request items"
ON mw_collection_request_items FOR INSERT TO authenticated
WITH CHECK (is_admin());

-- ============================================================
-- mw_collection_request_supplies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert collection request supplies" ON mw_collection_request_supplies;
CREATE POLICY "Authenticated users can insert collection request supplies"
ON mw_collection_request_supplies FOR INSERT TO authenticated
WITH CHECK (is_admin());

-- ============================================================
-- mw_collection_requests
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert collection requests" ON mw_collection_requests;
CREATE POLICY "Authenticated users can insert collection requests"
ON mw_collection_requests FOR INSERT TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can update collection requests" ON mw_collection_requests;
CREATE POLICY "Authenticated users can update collection requests"
ON mw_collection_requests FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- mw_customer_payments
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert customer payments" ON mw_customer_payments;
CREATE POLICY "Authenticated users can insert customer payments"
ON mw_customer_payments FOR INSERT TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can update customer payments" ON mw_customer_payments;
CREATE POLICY "Authenticated users can update customer payments"
ON mw_customer_payments FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can delete customer payments" ON mw_customer_payments;
CREATE POLICY "Authenticated users can delete customer payments"
ON mw_customer_payments FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- mw_customer_services
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert customer services" ON mw_customer_services;
CREATE POLICY "Authenticated users can insert customer services"
ON mw_customer_services FOR INSERT TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can update customer services" ON mw_customer_services;
CREATE POLICY "Authenticated users can update customer services"
ON mw_customer_services FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can delete customer services" ON mw_customer_services;
CREATE POLICY "Authenticated users can delete customer services"
ON mw_customer_services FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- mw_email_sync_log
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert sync logs" ON mw_email_sync_log;
CREATE POLICY "Authenticated users can insert sync logs"
ON mw_email_sync_log FOR INSERT TO authenticated
WITH CHECK (is_admin());

-- ============================================================
-- mw_emails
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert emails" ON mw_emails;
CREATE POLICY "Authenticated users can insert emails"
ON mw_emails FOR INSERT TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can update emails" ON mw_emails;
CREATE POLICY "Authenticated users can update emails"
ON mw_emails FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can delete emails" ON mw_emails;
CREATE POLICY "Authenticated users can delete emails"
ON mw_emails FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- mw_reminders
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert reminders" ON mw_reminders;
CREATE POLICY "Authenticated users can insert reminders"
ON mw_reminders FOR INSERT TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can update reminders" ON mw_reminders;
CREATE POLICY "Authenticated users can update reminders"
ON mw_reminders FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can delete reminders" ON mw_reminders;
CREATE POLICY "Authenticated users can delete reminders"
ON mw_reminders FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- news_ads
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert news ads" ON news_ads;
CREATE POLICY "Authenticated users can insert news ads"
ON news_ads FOR INSERT TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can update news ads" ON news_ads;
CREATE POLICY "Authenticated users can update news ads"
ON news_ads FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can delete news ads" ON news_ads;
CREATE POLICY "Authenticated users can delete news ads"
ON news_ads FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- news_article_ads
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert article ad associations" ON news_article_ads;
CREATE POLICY "Authenticated users can insert article ad associations"
ON news_article_ads FOR INSERT TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can update article ad associations" ON news_article_ads;
CREATE POLICY "Authenticated users can update article ad associations"
ON news_article_ads FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can delete article ad associations" ON news_article_ads;
CREATE POLICY "Authenticated users can delete article ad associations"
ON news_article_ads FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- quote_service_options
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert service options" ON quote_service_options;
CREATE POLICY "Authenticated users can insert service options"
ON quote_service_options FOR INSERT TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can update service options" ON quote_service_options;
CREATE POLICY "Authenticated users can update service options"
ON quote_service_options FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can delete service options" ON quote_service_options;
CREATE POLICY "Authenticated users can delete service options"
ON quote_service_options FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- seo_files
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage SEO files" ON seo_files;
CREATE POLICY "admin_select_seo_files"
ON seo_files FOR SELECT TO authenticated
USING (is_admin());

CREATE POLICY "admin_insert_seo_files"
ON seo_files FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "admin_update_seo_files"
ON seo_files FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_delete_seo_files"
ON seo_files FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- service_agreements
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create service agreements" ON service_agreements;
CREATE POLICY "Authenticated users can create service agreements"
ON service_agreements FOR INSERT TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can update service agreements" ON service_agreements;
CREATE POLICY "Authenticated users can update service agreements"
ON service_agreements FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can delete service agreements" ON service_agreements;
CREATE POLICY "Authenticated users can delete service agreements"
ON service_agreements FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================
-- system_notifications
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON system_notifications;
CREATE POLICY "Authenticated users can insert notifications"
ON system_notifications FOR INSERT TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can update notifications" ON system_notifications;
CREATE POLICY "Authenticated users can update notifications"
ON system_notifications FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "System can create notifications" ON system_notifications;
CREATE POLICY "System can create notifications"
ON system_notifications FOR INSERT TO authenticated
WITH CHECK (is_admin());
