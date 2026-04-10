/*
  # Fix RLS Performance, Duplicate Indexes, Mutable Search Paths, and Public Table RLS

  1. Replaces auth.<function>() with (select auth.<function>()) in RLS policies for better performance
  2. Drops duplicate indexes
  3. Fixes mutable search_path on all functions by setting search_path = ''
  4. Enables RLS on public tables mw_sic_codes and mw_hazardous_properties
*/

-- =============================================
-- DROP DUPLICATE INDEXES
-- =============================================

DROP INDEX IF EXISTS public.idx_mw_customers_status;
DROP INDEX IF EXISTS public.system_notifications_created_at_idx;

-- =============================================
-- FIX RLS POLICIES: Replace auth.uid() with (select auth.uid())
-- =============================================

-- quote_addons
DROP POLICY IF EXISTS "Admins can manage quote addons" ON public.quote_addons;
CREATE POLICY "Admins can manage quote addons" ON public.quote_addons
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- mw_certificate_alerts
DROP POLICY IF EXISTS "Admin staff can update alerts" ON public.mw_certificate_alerts;
CREATE POLICY "Admin staff can update alerts" ON public.mw_certificate_alerts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin staff can view all alerts" ON public.mw_certificate_alerts;
CREATE POLICY "Admin staff can view all alerts" ON public.mw_certificate_alerts
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage certificate alerts" ON public.mw_certificate_alerts;
CREATE POLICY "Admins can manage certificate alerts" ON public.mw_certificate_alerts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- quote_requests
DROP POLICY IF EXISTS "Admins can delete quote requests" ON public.quote_requests;
CREATE POLICY "Admins can delete quote requests" ON public.quote_requests
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can update quote requests" ON public.quote_requests;
CREATE POLICY "Admins can update quote requests" ON public.quote_requests
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can view all quote requests" ON public.quote_requests;
CREATE POLICY "Admins can view all quote requests" ON public.quote_requests
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- news_categories
DROP POLICY IF EXISTS "Admins can delete categories" ON public.news_categories;
CREATE POLICY "Admins can delete categories" ON public.news_categories
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert categories" ON public.news_categories;
CREATE POLICY "Admins can insert categories" ON public.news_categories
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can update categories" ON public.news_categories;
CREATE POLICY "Admins can update categories" ON public.news_categories
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- news_article_categories
DROP POLICY IF EXISTS "Admins can delete article categories" ON public.news_article_categories;
CREATE POLICY "Admins can delete article categories" ON public.news_article_categories
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert article categories" ON public.news_article_categories;
CREATE POLICY "Admins can insert article categories" ON public.news_article_categories
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- quote_line_items
DROP POLICY IF EXISTS "Admins can manage quote line items" ON public.quote_line_items;
CREATE POLICY "Admins can manage quote line items" ON public.quote_line_items
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can view all quote line items" ON public.quote_line_items;
CREATE POLICY "Admins can view all quote line items" ON public.quote_line_items
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view their quote line items" ON public.quote_line_items;
CREATE POLICY "Customers can view their quote line items" ON public.quote_line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      JOIN public.customers c ON c.id = q.customer_id
      WHERE q.id = quote_line_items.quote_id
      AND c.user_id = (SELECT auth.uid())
    )
  );

-- quote_templates
DROP POLICY IF EXISTS "Admins can manage quote templates" ON public.quote_templates;
CREATE POLICY "Admins can manage quote templates" ON public.quote_templates
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- quote_template_line_items
DROP POLICY IF EXISTS "Admins can manage template line items" ON public.quote_template_line_items;
CREATE POLICY "Admins can manage template line items" ON public.quote_template_line_items
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- quote_template_faqs
DROP POLICY IF EXISTS "Admins can manage template FAQs" ON public.quote_template_faqs;
CREATE POLICY "Admins can manage template FAQs" ON public.quote_template_faqs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- collection_requests
DROP POLICY IF EXISTS "Admins can manage collection requests" ON public.collection_requests;
CREATE POLICY "Admins can manage collection requests" ON public.collection_requests
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can view all collection requests" ON public.collection_requests;
CREATE POLICY "Admins can view all collection requests" ON public.collection_requests
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can create collection requests" ON public.collection_requests;
CREATE POLICY "Customers can create collection requests" ON public.collection_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = collection_requests.customer_id
      AND c.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can view their collection requests" ON public.collection_requests;
CREATE POLICY "Customers can view their collection requests" ON public.collection_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = collection_requests.customer_id
      AND c.user_id = (SELECT auth.uid())
    )
  );

-- product_requests
DROP POLICY IF EXISTS "Admins can manage product requests" ON public.product_requests;
CREATE POLICY "Admins can manage product requests" ON public.product_requests
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can view all product requests" ON public.product_requests;
CREATE POLICY "Admins can view all product requests" ON public.product_requests
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can create product requests" ON public.product_requests;
CREATE POLICY "Customers can create product requests" ON public.product_requests
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view their product requests" ON public.product_requests;
CREATE POLICY "Customers can view their product requests" ON public.product_requests
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- contact_enquiries
DROP POLICY IF EXISTS "Admins can delete contact enquiries" ON public.contact_enquiries;
CREATE POLICY "Admins can delete contact enquiries" ON public.contact_enquiries
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can update contact enquiries" ON public.contact_enquiries;
CREATE POLICY "Admins can update contact enquiries" ON public.contact_enquiries
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can view all contact enquiries" ON public.contact_enquiries;
CREATE POLICY "Admins can view all contact enquiries" ON public.contact_enquiries
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- system_notifications
DROP POLICY IF EXISTS "Admins can update notifications" ON public.system_notifications;
CREATE POLICY "Admins can update notifications" ON public.system_notifications
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can view all notifications" ON public.system_notifications;
CREATE POLICY "Admins can view all notifications" ON public.system_notifications
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- mw_certificates
DROP POLICY IF EXISTS "Admin can insert certificates" ON public.mw_certificates;
CREATE POLICY "Admin can insert certificates" ON public.mw_certificates
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin can update certificates" ON public.mw_certificates;
CREATE POLICY "Admin can update certificates" ON public.mw_certificates
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin can view all certificates" ON public.mw_certificates;
CREATE POLICY "Admin can view all certificates" ON public.mw_certificates
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage certificates" ON public.mw_certificates;
CREATE POLICY "Admins can manage certificates" ON public.mw_certificates
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view own certificates" ON public.mw_certificates;
CREATE POLICY "Customers can view own certificates" ON public.mw_certificates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mw_customers mc
      WHERE mc.id = mw_certificates.customer_id
      AND mc.user_id = (SELECT auth.uid())
    )
  );

-- mw_certificate_settings
DROP POLICY IF EXISTS "Admin can update certificate settings" ON public.mw_certificate_settings;
CREATE POLICY "Admin can update certificate settings" ON public.mw_certificate_settings
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin can view certificate settings" ON public.mw_certificate_settings;
CREATE POLICY "Admin can view certificate settings" ON public.mw_certificate_settings
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage certificate settings" ON public.mw_certificate_settings;
CREATE POLICY "Admins can manage certificate settings" ON public.mw_certificate_settings
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- mw_wtn_items
DROP POLICY IF EXISTS "Admin and staff can delete WTN items" ON public.mw_wtn_items;
CREATE POLICY "Admin and staff can delete WTN items" ON public.mw_wtn_items
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin and staff can insert WTN items" ON public.mw_wtn_items;
CREATE POLICY "Admin and staff can insert WTN items" ON public.mw_wtn_items
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin and staff can update WTN items" ON public.mw_wtn_items;
CREATE POLICY "Admin and staff can update WTN items" ON public.mw_wtn_items
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin and staff can view WTN items" ON public.mw_wtn_items;
CREATE POLICY "Admin and staff can view WTN items" ON public.mw_wtn_items
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- landing_page_visits
DROP POLICY IF EXISTS "Admin users can view all visit data" ON public.landing_page_visits;
CREATE POLICY "Admin users can view all visit data" ON public.landing_page_visits
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- news_articles
DROP POLICY IF EXISTS "Admins can read all news articles" ON public.news_articles;
CREATE POLICY "Admins can read all news articles" ON public.news_articles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- industry_faqs
DROP POLICY IF EXISTS "Admins can manage industry FAQs" ON public.industry_faqs;
CREATE POLICY "Admins can manage industry FAQs" ON public.industry_faqs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- mw_customer_addresses
DROP POLICY IF EXISTS "Admin can manage all customer addresses" ON public.mw_customer_addresses;
CREATE POLICY "Admin can manage all customer addresses" ON public.mw_customer_addresses
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view their own addresses" ON public.mw_customer_addresses;
CREATE POLICY "Customers can view their own addresses" ON public.mw_customer_addresses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mw_customers mc
      WHERE mc.id = mw_customer_addresses.customer_id
      AND mc.user_id = (SELECT auth.uid())
    )
  );

-- mw_service_plans
DROP POLICY IF EXISTS "Admin can manage service plans" ON public.mw_service_plans;
CREATE POLICY "Admin can manage service plans" ON public.mw_service_plans
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- mw_subscriptions
DROP POLICY IF EXISTS "Admin can manage all subscriptions" ON public.mw_subscriptions;
CREATE POLICY "Admin can manage all subscriptions" ON public.mw_subscriptions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view their own subscriptions" ON public.mw_subscriptions;
CREATE POLICY "Customers can view their own subscriptions" ON public.mw_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mw_customers mc
      WHERE mc.id = mw_subscriptions.customer_id
      AND mc.user_id = (SELECT auth.uid())
    )
  );

-- mw_job_photos
DROP POLICY IF EXISTS "Admin can manage all job photos" ON public.mw_job_photos;
CREATE POLICY "Admin can manage all job photos" ON public.mw_job_photos
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff can upload photos for their jobs" ON public.mw_job_photos;
CREATE POLICY "Staff can upload photos for their jobs" ON public.mw_job_photos
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff can view photos for their jobs" ON public.mw_job_photos;
CREATE POLICY "Staff can view photos for their jobs" ON public.mw_job_photos
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- mw_job_issues
DROP POLICY IF EXISTS "Admin can manage all job issues" ON public.mw_job_issues;
CREATE POLICY "Admin can manage all job issues" ON public.mw_job_issues
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff can report issues for their jobs" ON public.mw_job_issues;
CREATE POLICY "Staff can report issues for their jobs" ON public.mw_job_issues
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff can view issues for their jobs" ON public.mw_job_issues;
CREATE POLICY "Staff can view issues for their jobs" ON public.mw_job_issues
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- mw_job_completion
DROP POLICY IF EXISTS "Admin can manage all job completions" ON public.mw_job_completion;
CREATE POLICY "Admin can manage all job completions" ON public.mw_job_completion
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff can create completion for their jobs" ON public.mw_job_completion;
CREATE POLICY "Staff can create completion for their jobs" ON public.mw_job_completion
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff can view completion for their jobs" ON public.mw_job_completion;
CREATE POLICY "Staff can view completion for their jobs" ON public.mw_job_completion
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- mw_invoices
DROP POLICY IF EXISTS "Admin can manage all invoices" ON public.mw_invoices;
CREATE POLICY "Admin can manage all invoices" ON public.mw_invoices
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view their own invoices" ON public.mw_invoices;
CREATE POLICY "Customers can view their own invoices" ON public.mw_invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mw_customers mc
      WHERE mc.id = mw_invoices.customer_id
      AND mc.user_id = (SELECT auth.uid())
    )
  );

-- mw_invoice_line_items
DROP POLICY IF EXISTS "Admin can manage all invoice line items" ON public.mw_invoice_line_items;
CREATE POLICY "Admin can manage all invoice line items" ON public.mw_invoice_line_items
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view their invoice line items" ON public.mw_invoice_line_items;
CREATE POLICY "Customers can view their invoice line items" ON public.mw_invoice_line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mw_invoices i
      JOIN public.mw_customers mc ON mc.id = i.customer_id
      WHERE i.id = mw_invoice_line_items.invoice_id
      AND mc.user_id = (SELECT auth.uid())
    )
  );

-- mw_payments
DROP POLICY IF EXISTS "Admin can manage all payments" ON public.mw_payments;
CREATE POLICY "Admin can manage all payments" ON public.mw_payments
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view their own payments" ON public.mw_payments;
CREATE POLICY "Customers can view their own payments" ON public.mw_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mw_invoices i
      JOIN public.mw_customers mc ON mc.id = i.customer_id
      WHERE i.id = mw_payments.invoice_id
      AND mc.user_id = (SELECT auth.uid())
    )
  );

-- mw_receipts
DROP POLICY IF EXISTS "Admin can manage all receipts" ON public.mw_receipts;
CREATE POLICY "Admin can manage all receipts" ON public.mw_receipts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view their own receipts" ON public.mw_receipts;
CREATE POLICY "Customers can view their own receipts" ON public.mw_receipts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mw_customers mc
      WHERE mc.id = mw_receipts.customer_id
      AND mc.user_id = (SELECT auth.uid())
    )
  );

-- mw_customer_documents
DROP POLICY IF EXISTS "Admin can manage all customer documents" ON public.mw_customer_documents;
CREATE POLICY "Admin can manage all customer documents" ON public.mw_customer_documents
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view their own documents" ON public.mw_customer_documents;
CREATE POLICY "Customers can view their own documents" ON public.mw_customer_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mw_customers mc
      WHERE mc.id = mw_customer_documents.customer_id
      AND mc.user_id = (SELECT auth.uid())
    )
  );

-- quotes
DROP POLICY IF EXISTS "Admins can create quotes" ON public.quotes;
CREATE POLICY "Admins can create quotes" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can update quotes" ON public.quotes;
CREATE POLICY "Admins can update quotes" ON public.quotes
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins can view all quotes" ON public.quotes;
CREATE POLICY "Admins can view all quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can accept/decline their quotes" ON public.quotes;
CREATE POLICY "Customers can accept/decline their quotes" ON public.quotes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = quotes.customer_id
      AND c.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = quotes.customer_id
      AND c.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can view their quotes" ON public.quotes;
CREATE POLICY "Customers can view their quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = quotes.customer_id
      AND c.user_id = (SELECT auth.uid())
    )
  );

-- service_plans
DROP POLICY IF EXISTS "Admins can manage service plans" ON public.service_plans;
CREATE POLICY "Admins can manage service plans" ON public.service_plans
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- optional_addons
DROP POLICY IF EXISTS "Admins can manage addons" ON public.optional_addons;
CREATE POLICY "Admins can manage addons" ON public.optional_addons
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- quote_service_plans
DROP POLICY IF EXISTS "Admins can manage quote service plans" ON public.quote_service_plans;
CREATE POLICY "Admins can manage quote service plans" ON public.quote_service_plans
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- mw_staff
DROP POLICY IF EXISTS "Admin can manage all staff" ON public.mw_staff;
CREATE POLICY "Admin can manage all staff" ON public.mw_staff
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff can update their own profile" ON public.mw_staff;
CREATE POLICY "Staff can update their own profile" ON public.mw_staff
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Staff can view their own profile" ON public.mw_staff;
CREATE POLICY "Staff can view their own profile" ON public.mw_staff
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- mw_waste_transfer_notes
DROP POLICY IF EXISTS "Admin can manage all waste transfer notes" ON public.mw_waste_transfer_notes;
CREATE POLICY "Admin can manage all waste transfer notes" ON public.mw_waste_transfer_notes
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view their own waste transfer notes" ON public.mw_waste_transfer_notes;
CREATE POLICY "Customers can view their own waste transfer notes" ON public.mw_waste_transfer_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mw_customers mc
      WHERE mc.id = mw_waste_transfer_notes.customer_id
      AND mc.user_id = (SELECT auth.uid())
    )
  );

-- testimonials
DROP POLICY IF EXISTS "Admin users can delete testimonials" ON public.testimonials;
CREATE POLICY "Admin users can delete testimonials" ON public.testimonials
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin users can insert testimonials" ON public.testimonials;
CREATE POLICY "Admin users can insert testimonials" ON public.testimonials
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin users can update testimonials" ON public.testimonials;
CREATE POLICY "Admin users can update testimonials" ON public.testimonials
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- homepage_faqs
DROP POLICY IF EXISTS "Admin users can delete FAQs" ON public.homepage_faqs;
CREATE POLICY "Admin users can delete FAQs" ON public.homepage_faqs
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin users can insert FAQs" ON public.homepage_faqs;
CREATE POLICY "Admin users can insert FAQs" ON public.homepage_faqs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin users can update FAQs" ON public.homepage_faqs;
CREATE POLICY "Admin users can update FAQs" ON public.homepage_faqs
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- mw_customers
DROP POLICY IF EXISTS "Admin can delete customers" ON public.mw_customers;
CREATE POLICY "Admin can delete customers" ON public.mw_customers
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin can insert customers" ON public.mw_customers;
CREATE POLICY "Admin can insert customers" ON public.mw_customers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin can update all customers" ON public.mw_customers;
CREATE POLICY "Admin can update all customers" ON public.mw_customers
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin can view all customers" ON public.mw_customers;
CREATE POLICY "Admin can view all customers" ON public.mw_customers
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can update their own data" ON public.mw_customers;
CREATE POLICY "Customers can update their own data" ON public.mw_customers
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Customers can view their own data" ON public.mw_customers;
CREATE POLICY "Customers can view their own data" ON public.mw_customers
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- mw_admin_notes
DROP POLICY IF EXISTS "Authenticated users can delete admin notes" ON public.mw_admin_notes;
CREATE POLICY "Authenticated users can delete admin notes" ON public.mw_admin_notes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert admin notes" ON public.mw_admin_notes;
CREATE POLICY "Authenticated users can insert admin notes" ON public.mw_admin_notes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update admin notes" ON public.mw_admin_notes;
CREATE POLICY "Authenticated users can update admin notes" ON public.mw_admin_notes
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- mw_service_jobs
DROP POLICY IF EXISTS "Admin can manage all service jobs" ON public.mw_service_jobs;
CREATE POLICY "Admin can manage all service jobs" ON public.mw_service_jobs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view their own jobs" ON public.mw_service_jobs;
CREATE POLICY "Customers can view their own jobs" ON public.mw_service_jobs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mw_subscriptions s
      JOIN public.mw_customers mc ON mc.id = s.customer_id
      WHERE s.id = mw_service_jobs.subscription_id
      AND mc.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can update their assigned jobs" ON public.mw_service_jobs;
CREATE POLICY "Staff can update their assigned jobs" ON public.mw_service_jobs
  FOR UPDATE TO authenticated
  USING (assigned_staff_id = (SELECT auth.uid()))
  WITH CHECK (assigned_staff_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Staff can view their assigned jobs" ON public.mw_service_jobs;
CREATE POLICY "Staff can view their assigned jobs" ON public.mw_service_jobs
  FOR SELECT TO authenticated
  USING (assigned_staff_id = (SELECT auth.uid()));

-- mw_gmail_sync_config
DROP POLICY IF EXISTS "Authenticated users can update gmail sync config" ON public.mw_gmail_sync_config;
CREATE POLICY "Authenticated users can update gmail sync config" ON public.mw_gmail_sync_config
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- mw_resources
DROP POLICY IF EXISTS "Authenticated users can delete resources" ON public.mw_resources;
CREATE POLICY "Authenticated users can delete resources" ON public.mw_resources
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert resources" ON public.mw_resources;
CREATE POLICY "Authenticated users can insert resources" ON public.mw_resources
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update resources" ON public.mw_resources;
CREATE POLICY "Authenticated users can update resources" ON public.mw_resources
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =============================================
-- ENABLE RLS ON PUBLIC TABLES
-- =============================================

ALTER TABLE public.mw_sic_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read SIC codes" ON public.mw_sic_codes
  FOR SELECT TO anon, authenticated
  USING (true);

ALTER TABLE public.mw_hazardous_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read hazardous properties" ON public.mw_hazardous_properties
  FOR SELECT TO anon, authenticated
  USING (true);

-- =============================================
-- FIX MUTABLE SEARCH PATHS ON FUNCTIONS
-- =============================================

ALTER FUNCTION public.generate_mw_customer_number() SET search_path = '';
ALTER FUNCTION public.generate_mw_staff_number() SET search_path = '';
ALTER FUNCTION public.generate_mw_job_number() SET search_path = '';
ALTER FUNCTION public.generate_mw_wtn_number() SET search_path = '';
ALTER FUNCTION public.generate_mw_invoice_number() SET search_path = '';
ALTER FUNCTION public.generate_mw_payment_number() SET search_path = '';
ALTER FUNCTION public.update_quote_service_options_updated_at() SET search_path = '';
ALTER FUNCTION public.update_seo_files_updated_at() SET search_path = '';
ALTER FUNCTION public.generate_mw_receipt_number() SET search_path = '';
ALTER FUNCTION public.update_mw_updated_at() SET search_path = '';
ALTER FUNCTION public.generate_quote_number() SET search_path = '';
ALTER FUNCTION public.generate_product_request_number() SET search_path = '';
ALTER FUNCTION public.generate_share_token() SET search_path = '';
ALTER FUNCTION public.notify_quote_status_change() SET search_path = '';
ALTER FUNCTION public.sync_quote_submission_to_requests() SET search_path = '';
ALTER FUNCTION public.generate_certificate_alerts() SET search_path = '';
ALTER FUNCTION public.sync_contact_submission_to_enquiries() SET search_path = '';
ALTER FUNCTION public.generate_certificate_number() SET search_path = '';
ALTER FUNCTION public.generate_qr_token() SET search_path = '';
ALTER FUNCTION public.set_certificate_defaults() SET search_path = '';
ALTER FUNCTION public.update_certificate_status() SET search_path = '';
ALTER FUNCTION public.get_active_certificate_alerts() SET search_path = '';
ALTER FUNCTION public.generate_collection_request_number() SET search_path = '';
ALTER FUNCTION public.update_collection_request_timestamp() SET search_path = '';
ALTER FUNCTION public.is_admin() SET search_path = '';