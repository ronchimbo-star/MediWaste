# MediWaste — Build History & Feature Documentation

This file documents every feature in the current build and serves as a running changelog for all future updates. The backup snapshot for this version is at `backups/2026-10-18_pre-change-backup/`.

---

## Current Build: 2026-10-18

### Technology Stack
- **Frontend:** React 18 + TypeScript + Vite 5
- **Styling:** Tailwind CSS 3
- **Routing:** React Router 6
- **Data fetching:** TanStack React Query 5
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **PDF generation:** jsPDF + html2canvas
- **Icons:** lucide-react
- **SEO:** react-helmet-async
- **Deployment:** Netlify (with prerendered static HTML via `scripts/prerender.mjs`)

---

## Public Website Pages

### Home Page (`/`)
- Hero section with call-to-action
- Service highlights
- Homepage FAQ section
- Testimonials carousel
- Bottom CTA with phone number (01322 879 713)
- Mobile sticky CTA bar

### Waste Services Pages
- `/waste-services` — Main services overview with service comparison table
- `/waste-services/infectious-waste` — Infectious waste page
- `/waste-services/sharps-waste` — Sharps waste page
- `/waste-services/pharmaceutical-waste` — Pharmaceutical waste page
- `/waste-services/cytotoxic-waste` — Cytotoxic waste page
- `/waste-services/dental-waste` — Dental waste page
- `/waste-services/anatomical-waste` — Anatomical waste page

### Service Area Pages
- `/service-coverage` — Main service area page
- `/service-areas/:countySlug` — Dynamic county pages (London, Kent, Essex, Surrey, Sussex, Hampshire)
- `/clinical-waste-disposal-:county` — SEO-friendly disposal pages per county
- `/c/:slug` — AI-generated SEO content pages (40+ location pages stored in Supabase)

### News & Content
- `/news` — News listing with category filtering
- `/news/category/:categorySlug` — Category-filtered news
- `/news/:slug` — Individual article pages (36 articles, prerendered)
- Articles have SEO fields: `seo_title`, `seo_description`, `meta_keywords`

### Quote System
- `/quote` — Public quote request form (saves to `quote_requests` table)
- `/quote/:token` — Public quote view (shared via unique token)

### Compliance & Certificates
- `/compliance` — Compliance information page
- `/compliance/:token` — Public certificate verification page showing:
  - Full certificate preview (CertificatePreview component)
  - Certificate details (number, status, issue/expiry dates)
  - Client details
  - Waste types covered
  - **Waste Transfer Notes** table (view + PDF download)
  - **Hazardous Waste Consignment Notes** table (view + PDF download) — added 2026-10-17
  - Financial section (for logged-in users)
  - Collection request modal

### Service Agreements
- `/service-agreement/:token` — Public service agreement view with versioning support

### Audit Tool
- `/audit` — Public audit intake page
- `/audit/:token` — Public waste audit view (client review/signing workflow)

### Other Public Pages
- `/about` — About MediWaste
- `/contact` — Contact form (saves to `contact_enquiries` table)
- `/faq` — FAQ page
- `/terms` — Terms of service
- `/privacy` — Privacy policy
- `/cookies` — Cookie policy
- `/directory-listings` — Business directory
- `/driver-upload` — Driver photo upload page (for staff/drivers)
- `/invoice/:token` — Public invoice view/payment page
- `/login` — Admin/staff/customer login

---

## Admin Panel

### Layout & Navigation
- Collapsible sidebar with dark mode toggle
- Sections: Overview, Operations, Finance, Communications, Admin
- Live badge counts for pending quotes, contact enquiries, unread emails
- Mobile-responsive with slide-out sidebar
- Floating action widget

### Admin Dashboard (`/admin`)
- Overview metrics and quick access to all modules

### Operations Section

#### Customers (`/admin/customers`, `/admin/customers/:id`)
- Customer list with search and filtering
- Customer profile pages with full details
- Auto-generated customer numbers
- Customer addresses (primary + multiple)

#### Waste Carriers (`/admin/waste-carriers`)
- Manage registered waste carriers
- Registration number, type (upper/lower tier), validity, address

#### Audit Tool (`/admin/audits`, `/admin/audits/:id`)
- On-site waste audit sessions for drivers/staff

#### Quote Requests (`/admin/quote-requests`)
- Inbound quote requests with read/unread badges
- Convert to quotes

#### Quotes (`/admin/quotes`, `/admin/quotes/create`, `/admin/quotes/:id/edit`)
- Full quote management with line items
- Public quote sharing via token
- Quote email sending (edge function)

#### Service Agreements (`/admin/service-agreements`, `/admin/service-agreements/create`, `/admin/service-agreements/edit/:id`)
- Service agreement creation and editing
- Company overrides per agreement
- Versioning support (added 2026-10-17)
- Public sharing via token
- Email sending (edge function)

#### Service Jobs (`/admin/jobs`)
- Job scheduling and management
- Auto-generated job numbers
- Multi-line items on jobs
- Calendar event integration
- Notes on jobs
- Photo uploads

### Finance Section

#### Invoicing (`/admin/invoices`, `/admin/invoices/create`, `/admin/invoices/:id/edit`, `/admin/invoices/:id/preview`)
- Full invoice management with line items
- Invoice preview component
- Draft/created/sent statuses
- Reminder tracking
- Invoice email sending (edge function)
- Payment receipt sending (edge function)
- New-from-conversation workflow (`/admin/invoices/new-from-conversation`)
- Invoice review page (`/admin/invoices/review`)
- Invoice settings table

#### Pending Payments (`/admin/finance/pending-payments`)
- Track outstanding payments

#### Payment Settings (`/admin/settings/payment-details`)
- Configure payment details

#### Financial PIN (`/admin/settings/financial-pin`)
- PIN-protected financial section on compliance page
- Set/verify/reset PIN (edge functions)

#### Waste Transfer Notes (`/admin/waste-transfer-notes`)
- Full WTN management with line items
- Linked to jobs, carriers, customers
- Photos (collection evidence)
- Public visibility on compliance page
- PDF download

#### Hazardous Waste Consignment Notes (`/admin/hw-consignment-notes`)
- Full HWCN management — added 2026-10-17
- Consignor, consignee, carrier details
- Line items with EWC codes and hazard codes
- Consignee return tracking (status, date, reference, document URL)
- Photos
- Public visibility on compliance page with PDF download — added 2026-10-17
- Storage bucket for consignee return documents

#### Certificates (`/admin/certificates`, `/admin/certificates/create`, `/admin/certificates/:id/edit`, `/admin/certificates/:id/preview`)
- Waste disposal certificate management
- Auto-generated certificate numbers
- QR code verification
- Statuses: active, expired, revoked, pending, suspended, archived
- Suspend/archive with reasons
- PDF/PNG download (certificateDownload utility)
- Certificate alerts table (auto-generated alerts for expiring certs)
- Certificate settings (carrier licence, signatory details)

#### Waste Audits (`/admin/waste-audits`, `/admin/waste-audits/:id/edit`)
- Pre-Acceptance Waste Audit module
- AI-powered audit draft generation (OpenAI gpt-4o-mini)
- 3-step creation wizard: select customer → practice details → waste streams
- 11 pre-seeded waste stream types
- Full lifecycle: draft → sent_to_client → client_editing → ready_for_review → finalised → signed
- Digital signatures (both admin + client)
- Email notifications via Resend (edge function)
- PDF download (auditDownload utility)
- Audit trail logging
- Public client view at `/audit/:token` with inline editing
- Customer portal integration

### Communications Section

#### Email Inbox (`/admin/email-inbox`)
- Gmail sync integration (edge function)
- Read/unread tracking
- Email sync tables

#### AI Daily Briefing (`/admin/ai-briefing`)
- AI-generated daily email briefings
- Cron-scheduled (pg_cron)
- Briefing history

#### AI Quote Drafts (`/admin/ai-quote-drafts`)
- AI-powered quote reply drafting (OpenAI)
- Conversation analysis (edge function)
- Quote training examples table
- Quote agent training and triggering (edge functions)

#### AI Customer Setup (`/admin/ai-customer-setup`)
- AI-powered customer setup drafting (edge function)

#### Contact Enquiries (`/admin/contact-enquiries`)
- Contact form submissions with read/unread
- Migrated from older form submissions system

#### Mailing Lists (`/admin/mailing-lists`)
- Mailing list management

#### Subscriptions (`/admin/subscriptions`)
- Subscription management

### Admin Section

#### SEO Pages (`/admin/seo-pages`, `/admin/seo-pages/create`, `/admin/seo-pages/:id/edit`)
- AI-generated SEO content pages (40 location pages)
- Generate content via edge function (OpenAI)
- Import SEO CSV (edge function)
- SEO validation checklist
- Pre-publish modal
- Page views tracking (RPC)
- Meta title, description, keywords
- Schema markup (Article, LocalBusiness, FAQPage)

#### Directory Listings (`/admin/directory-listings`)
- Business directory management

#### Notes (`/admin/notes`)
- Admin notes system
- Notes panel component (contextual)

#### Resources (`/admin/resources`)
- Resource/document management

#### Staff Management (`/admin/staff`)
- Staff management with auto-generated staff numbers
- Link staff to user accounts

#### News Management (`/admin/news`, `/admin/news/create`, `/admin/news/:id/edit`)
- Full news article CMS
- Categories, excerpts, SEO fields
- Article content upload (edge function)

#### Sitemap & Robots (`/admin/sitemap`)
- Sitemap generation (edge function)
- Robots.txt management
- Broken links checker (edge function)

#### Backup (`/admin/backup`)
- Database backup utilities

#### Markdown for Agents (`/admin/markdown-for-agents`)
- Markdown versioning for AI agents
- Fetch markdown (edge function)
- Serve markdown / LLMS.txt (edge functions)

#### Site Settings (`/admin/settings`)
- Company details (name, address, phone, email)
- Certificate settings
- Gmail sync schedule
- Site-wide configuration

---

## Staff Pages
- `/staff/dashboard` — Staff dashboard with job assignments, photo uploads

## Customer Pages
- `/customer/dashboard` — Customer portal showing:
  - Certificates
  - Waste transfer notes
  - Hazardous waste consignment notes
  - Waste audits (linked to customer)
  - Invoices
  - Collection requests

---

## Edge Functions (Supabase)

| Function | Purpose |
|----------|---------|
| `analyze-conversation` | AI analysis of customer conversations |
| `audit-notification` | Email notifications for waste audit lifecycle |
| `check-broken-links` | Scan site for broken internal links |
| `daily-email-briefing` | AI-generated daily summary email |
| `draft-customer-setup` | AI draft for new customer setup |
| `draft-quote-reply` | AI draft for quote replies |
| `fetch-markdown` | Fetch markdown versions of pages |
| `fix-seo-issues` | Auto-fix SEO problems |
| `generate-audit-draft` | AI generate/proofread waste audit drafts |
| `generate-audit-report` | Generate audit reports |
| `generate-seo-content` | AI generate SEO location pages |
| `import-seo-csv` | Import SEO page data from CSV |
| `reset-financial-pin` | Reset financial PIN |
| `send-audit-email` | Send audit emails |
| `send-collection-email` | Send collection notification emails |
| `send-contact-email` | Send contact form emails |
| `send-invoice-email` | Send invoice emails to customers |
| `send-payment-receipt` | Send payment receipt emails |
| `send-quote-email` | Send quote emails |
| `send-service-agreement-email` | Send service agreement emails |
| `seo-sitemap` | Generate XML sitemap |
| `serve-llms-txt` | Serve llms.txt for AI crawlers |
| `serve-markdown` | Serve markdown versions of pages |
| `set-financial-pin` | Set financial PIN |
| `sync-gmail` | Sync Gmail inbox |
| `train-quote-agent` | Train quote AI on examples |
| `trigger-quote-agent` | Trigger quote AI agent |
| `update-quote-status` | Update quote status |
| `upload-article-content` | Upload news article content |
| `verify-financial-pin` | Verify financial PIN |

---

## Database Tables (Supabase — public schema)

### Core Customer/Quote Tables
- `mw_customers` — Customer records with auto-generated numbers
- `mw_customer_addresses` — Multiple addresses per customer
- `quote_requests` — Inbound quote requests
- `contact_enquiries` — Contact form submissions

### Operations Tables
- `mw_service_jobs` — Service jobs with auto-generated numbers
- `mw_service_agreements` — Service agreements with versioning
- `mw_staff` — Staff records with auto-generated numbers
- `mw_collection_requests` — Collection requests (one-off)
- `mw_waste_carriers` — Registered waste carriers

### Waste Transfer Notes
- `mw_waste_transfer_notes` — WTN records
- `mw_wtn_line_items` — WTN line items (multi-item)
- `mw_wtn_photos` — WTN collection evidence photos

### Hazardous Waste Consignment Notes (added 2026-10-17)
- `mw_hw_consignment_notes` — HWCN records with consignee return fields
- `mw_hwcn_line_items` — HWCN line items
- `mw_hwcn_photos` — HWCN photos

### Certificate System
- `mw_certificates` — Waste disposal certificates
- `mw_certificate_settings` — Certificate configuration
- `mw_certificate_alerts` — Auto-generated expiry alerts

### Invoicing
- `mw_invoices` — Invoice records
- `mw_invoice_settings` — Invoice configuration

### Waste Audit Module
- `waste_audits` — Pre-acceptance audit records
- `waste_streams` — 11 pre-seeded UK healthcare waste types
- `waste_audit_logs` — Audit trail

### Audit Tool
- `mw_audit_sessions` — On-site audit sessions
- `mw_audit_reports` — Audit reports

### SEO & Content
- `seo_pages` — AI-generated SEO location pages
- `news_articles` — News articles with SEO fields
- `directory_listings` — Business directory

### AI & Communications
- `ai_briefings` — AI daily briefing records
- `ai_quote_drafts` — AI quote draft records
- `ai_customer_drafts` — AI customer setup drafts
- `quote_training_examples` — Training data for quote AI
- `mw_emails` — Synced emails
- `mw_email_sync_state` — Gmail sync state

### Admin & System
- `mw_admin_notes` — Admin notes
- `resources` — Resource documents
- `mw_mailing_lists` — Mailing lists
- `mw_subscriptions` — Subscriptions
- `markdown_versions` — Markdown versions for AI agents
- `site_settings` — Site-wide configuration

### Job Photos
- `mw_job_photos` — Job photos with storage paths

---

## Key Features Summary

1. **Certificate Verification** — QR-code verified public certificates with WTNs, HWCNs, and financial section
2. **Waste Transfer Notes** — Full WTN management with public visibility, PDF download, photos, line items
3. **Hazardous Waste Consignment Notes** — Full HWCN management with consignee return tracking, public visibility, PDF download (added 2026-10-17)
4. **Pre-Acceptance Waste Audits** — AI-powered audit generation, client review/edit/sign workflow, PDF download
5. **AI Quote Engine** — Conversation analysis, quote reply drafting, training examples, agent triggering
6. **SEO Content Generation** — AI-generated location pages with schema markup, prerendered HTML
7. **Invoicing System** — Full invoice lifecycle, conversation-to-invoice workflow, email sending, payment receipts
8. **Service Agreement Versioning** — Versioned agreements with company overrides (added 2026-10-17)
9. **Email Sync** — Gmail inbox sync with AI briefings
10. **Prerendering** — 139 prerendered routes (27 static + 40 SEO + 36 news + category/SPA routes)

---

## Changelog

### 2026-10-17
- Added Hazardous Waste Consignment Notes module (database tables, admin page, public visibility on compliance page with PDF download)
- Added service agreement versioning
- Added consignee return fields and storage bucket for HWCN
- Added company details to site settings
- Added company overrides to service agreements
- Added quote training examples table

### 2026-10-18
- Created full system backup at `backups/2026-10-18_pre-change-backup/`
- Created this `CHANGELOG.md` to document all features and track future changes
- **Feature 1: Document Notification Emails** — Added "Notify Customer" button to Certificates, Waste Transfer Notes, and Hazardous Waste Consignment Notes admin pages. When clicked, admin sees a modal with a pre-filled message they can edit, then sends a branded email from `hello@mediwaste.co.uk` via Resend. The email includes a link to the customer's compliance portal. All notifications are logged in the new `mw_document_notifications` table with resend tracking. New edge function: `send-document-notification`.
- **Feature 2: Customer Correspondence Tab** — Added a "Correspondence" tab to the Customer Profile page showing all emails sent to and received from that customer, pulled from the existing `mw_emails` table (populated by Gmail sync). Each email shows direction (sent/received), subject, sender, date, and expandable body. Includes a "Sync Gmail Now" button to trigger an immediate sync.
- **Feature 2b: Weekly Gmail Sync Cron** — Scheduled a weekly Sunday 2am UTC cron job that automatically triggers the existing `sync-gmail` edge function to pull 150 latest emails and map them to customers by email address. This ensures the Correspondence tab stays up to date without manual intervention.

---

## Future Update Log

All future updates must be documented below with date, description of changes, and files affected.

| Date | Changes | Files Affected |
|------|---------|----------------|
| | | |
