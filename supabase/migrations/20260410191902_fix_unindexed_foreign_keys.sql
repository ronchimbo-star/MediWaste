/*
  # Fix Unindexed Foreign Keys

  Adds covering indexes for all foreign key columns that were missing indexes.
  This improves query performance for JOIN operations and cascading operations.
*/

CREATE INDEX IF NOT EXISTS idx_benefit_company_users_invited_by ON public.benefit_company_users(invited_by);
CREATE INDEX IF NOT EXISTS idx_benefit_company_users_user_id ON public.benefit_company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_benefit_employees_company_id ON public.benefit_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_benefit_employees_user_id ON public.benefit_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_benefit_invoices_company_id ON public.benefit_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_benefit_orders_company_id ON public.benefit_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_benefit_orders_employee_id ON public.benefit_orders(employee_id);
CREATE INDEX IF NOT EXISTS idx_collection_requests_scheduled_job_id ON public.collection_requests(scheduled_job_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON public.documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_invoice_id ON public.documents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_by ON public.media_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_mw_admin_notes_created_by ON public.mw_admin_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_mw_certificate_alerts_dismissed_by ON public.mw_certificate_alerts(dismissed_by);
CREATE INDEX IF NOT EXISTS idx_mw_certificates_authorised_by ON public.mw_certificates(authorised_by);
CREATE INDEX IF NOT EXISTS idx_mw_collection_request_items_request_id ON public.mw_collection_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_mw_collection_request_supplies_request_id ON public.mw_collection_request_supplies(request_id);
CREATE INDEX IF NOT EXISTS idx_mw_collection_requests_approved_by ON public.mw_collection_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_mw_collection_requests_customer_id ON public.mw_collection_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_mw_collection_requests_job_id ON public.mw_collection_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_mw_customer_documents_customer_id ON public.mw_customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_mw_customer_documents_uploaded_by ON public.mw_customer_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_mw_invoice_line_items_invoice_id ON public.mw_invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_mw_invoice_line_items_service_job_id ON public.mw_invoice_line_items(service_job_id);
CREATE INDEX IF NOT EXISTS idx_mw_invoices_subscription_id ON public.mw_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_mw_job_completion_completed_by ON public.mw_job_completion(completed_by);
CREATE INDEX IF NOT EXISTS idx_mw_job_issues_job_id ON public.mw_job_issues(job_id);
CREATE INDEX IF NOT EXISTS idx_mw_job_issues_reported_by ON public.mw_job_issues(reported_by);
CREATE INDEX IF NOT EXISTS idx_mw_job_issues_resolved_by ON public.mw_job_issues(resolved_by);
CREATE INDEX IF NOT EXISTS idx_mw_job_photos_job_id ON public.mw_job_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_mw_job_photos_uploaded_by ON public.mw_job_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_mw_payments_invoice_id ON public.mw_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_mw_receipts_customer_id ON public.mw_receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_mw_resources_uploaded_by ON public.mw_resources(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_mw_service_jobs_address_id ON public.mw_service_jobs(address_id);
CREATE INDEX IF NOT EXISTS idx_mw_service_jobs_collection_request_id ON public.mw_service_jobs(collection_request_id);
CREATE INDEX IF NOT EXISTS idx_mw_service_jobs_subscription_id ON public.mw_service_jobs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_mw_subscriptions_address_id ON public.mw_subscriptions(address_id);
CREATE INDEX IF NOT EXISTS idx_mw_subscriptions_service_plan_id ON public.mw_subscriptions(service_plan_id);
CREATE INDEX IF NOT EXISTS idx_mw_waste_transfer_notes_customer_id ON public.mw_waste_transfer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_mw_waste_transfer_notes_job_id ON public.mw_waste_transfer_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_author_id ON public.news_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_policy_pages_updated_by ON public.policy_pages(updated_by);
CREATE INDEX IF NOT EXISTS idx_product_feedback_employee_id ON public.product_feedback(employee_id);
CREATE INDEX IF NOT EXISTS idx_product_feedback_order_id ON public.product_feedback(order_id);
CREATE INDEX IF NOT EXISTS idx_product_feedback_product_id ON public.product_feedback(product_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_approved_by ON public.product_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_quote_addons_addon_id ON public.quote_addons(addon_id);
CREATE INDEX IF NOT EXISTS idx_quote_service_plans_service_plan_id ON public.quote_service_plans(service_plan_id);
CREATE INDEX IF NOT EXISTS idx_quote_template_faqs_template_id ON public.quote_template_faqs(template_id);
CREATE INDEX IF NOT EXISTS idx_quote_template_line_items_template_id ON public.quote_template_line_items(template_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON public.quotes(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_selected_service_option_id ON public.quotes(selected_service_option_id);
CREATE INDEX IF NOT EXISTS idx_service_agreements_created_by ON public.service_agreements(created_by);
CREATE INDEX IF NOT EXISTS idx_service_visits_customer_id ON public.service_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_visits_subscription_id ON public.service_visits(subscription_id);
CREATE INDEX IF NOT EXISTS idx_site_settings_updated_by ON public.site_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_social_shares_employee_id ON public.social_shares(employee_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_service_id ON public.subscriptions(service_id);