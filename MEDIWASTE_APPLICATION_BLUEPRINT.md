# Application Blueprint

A reusable starting specification for a React, Vite, Supabase and Netlify application with a public website, authenticated admin workspace, SEO-managed pages, prerendered HTML, transactional email and document workflows.

This document describes the structure and implementation patterns to reproduce. Replace the business names, routes, content and database entities with those for the new application.

## 1. Product shape

Build the application as two connected experiences:

- **Public website:** marketing pages, service pages, location pages, news, resources, contact and quote forms.
- **Authenticated admin workspace:** dashboard, customer records, operational workflows, documents, communications, SEO content, site settings and system tools.
- **Public secure views:** token-based quote, invoice, agreement, certificate or audit views where a customer can review, edit or sign a document without entering the admin workspace.

Use Supabase for authentication, database tables, row-level security, storage, realtime features where needed and Edge Functions. Use the browser client only for operations that are safe under RLS. Put privileged mutations, third-party API calls and secret-bearing work in Edge Functions.

## 2. Recommended project layout

```text
project/
├── public/
│   ├── brand-logo.svg
│   ├── brand-logo-white.png
│   ├── social-share-image.jpg
│   ├── favicon.png
│   ├── robots.txt
│   ├── _headers
│   └── _redirects
├── scripts/
│   └── prerender.mjs
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminRoute.tsx
│   │   │   └── FloatingActionWidget.tsx
│   │   ├── documents/
│   │   ├── forms/
│   │   ├── SEO.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Notification.tsx
│   ├── contexts/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useSiteSettings.ts
│   ├── lib/
│   │   └── supabase.ts
│   ├── pages/
│   │   ├── public pages
│   │   ├── admin/
│   │   ├── customer/
│   │   └── staff/
│   ├── types/
│   ├── utils/
│   │   ├── assetPath.ts
│   │   ├── documentDownload.ts
│   │   └── dateFormat.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── functions/
│       ├── send-email/
│       ├── generate-content/
│       ├── public-document/
│       └── sitemap/
├── netlify.toml
├── vite.config.ts
├── package.json
└── tsconfig.json
```

Keep each view responsible for one job. For example, use separate list, edit, preview and public-view screens rather than combining all states into one large page.

## 3. Frontend foundation

Use:

- React 18 with TypeScript.
- Vite for development and production builds.
- React Router for public, admin and token-based routes.
- Supabase JS for database and authentication.
- TanStack Query for server data, caching, polling and invalidation.
- React Helmet Async for browser-visible SEO metadata.
- Tailwind CSS or the existing design system for responsive styling.
- Lucide icons for interface controls.
- DOMPurify when rendering stored HTML.
- html2canvas and jsPDF for browser PDF downloads where a document must be downloaded from the screen.
- Resend through Supabase Edge Functions for email delivery.

The production command should compile types, build the Vite application and then prerender routes:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && node scripts/prerender.mjs",
    "preview": "vite preview"
  }
}
```

Use a single Supabase client in `src/lib/supabase.ts`. Read only the public URL and anonymous key in browser code. Never put service-role keys, Resend keys or AI keys in the browser bundle.

Use an asset helper so images respect the configured base path:

```ts
export function assetPath(fileName: string): string {
  return `${import.meta.env.BASE_URL}${fileName}`;
}
```

## 4. Authentication and access control

Use Supabase email/password authentication unless another method is explicitly required.

Required flow:

1. Login page.
2. Signup page if new users need to create accounts.
3. Session loading state.
4. Protected route guard.
5. Sign-out action.
6. Auth listener that does not perform awaited Supabase work directly inside the listener callback.
7. Clear error messages for invalid credentials, duplicate accounts and network failures.

Admin access should be enforced twice:

- **Frontend:** hide admin navigation and redirect unauthorised users.
- **Database/server:** apply RLS and server-side role checks. Never treat hidden buttons as security.

Store authorisation data in immutable application metadata or a protected staff table. Do not make access decisions from user-editable profile metadata.

## 5. Admin workspace

Create an `AdminLayout` with:

- Responsive sidebar and mobile drawer.
- Grouped navigation sections.
- Active route highlighting.
- Collapsed sidebar preference saved locally.
- Optional dark mode saved locally.
- Breadcrumbs and page title.
- Sign-out action.
- Notification badges for unread quotes, enquiries, email and other work needing attention.
- A floating quick-action control for common actions.

Recommended navigation groups:

### Overview

- Dashboard.

### Operations

- Customers.
- Leads and quote requests.
- Quotes.
- Agreements.
- Jobs and collections.
- Staff or drivers.

### Finance and documents

- Invoices.
- Pending payments.
- Payment settings.
- Certificates.
- Transfer notes.
- Audits or inspection reports.

### Communications

- Email inbox.
- Contact enquiries.
- Mailing lists and subscriptions.
- AI-assisted drafts.
- Daily briefing.

### Content and administration

- SEO pages.
- News and articles.
- Resources.
- Directory listings.
- Site settings.
- Sitemap and robots controls.
- Backups or exports.
- Staff management.
- Security settings.

Each admin module should normally include:

- List view with search, filtering, sorting and pagination.
- Detail or edit view.
- Empty, loading and error states.
- Confirmation before destructive actions.
- Success notification after saves.
- Audit trail for important changes.
- Query invalidation after mutations.

## 6. Core data model

Create only the tables needed by the new application. The following groups mirror the current system and can be renamed.

### Identity and organisation

- `profiles` or `staff_users`: user profile, role, name and active status.
- `customers`: customer or organisation records, contacts and billing details.
- `customer_addresses`: reusable service and billing addresses.
- `staff`: internal users, permissions and staff details.
- `site_settings`: editable public settings such as site title, default description, phone, email and social links.

### Sales and operations

- `quote_requests`: public enquiries and unread status.
- `quotes`: quote header and lifecycle status.
- `quote_line_items`: services, quantities, rates and totals.
- `service_agreements`: agreement details, tokens, status and signatures.
- `service_jobs`: scheduled work, assigned staff, address and status.
- `collection_requests`: customer-submitted work requests.

### Finance and documents

- `invoices`: invoice number, customer, totals, due date, status and public token.
- `invoice_line_items`: individual charges.
- `payments`: payment records and reconciliation details.
- `certificates`: certificate number, issue date, expiry date and public visibility.
- `waste_transfer_notes` or equivalent operational records.
- `document_events`: immutable record of generated, sent, viewed, edited and signed events.

### Content and SEO

- `seo_pages`: slug, title, description, keywords, canonical URL, page content, schema data, publish status and dates.
- `news_articles`: slug, title, excerpt, body, SEO title, SEO description, keywords, status and published date.
- `news_categories`: article categories.
- `resources`: downloadable or informational content.
- `directory_listings`: public business or partner listings.
- `redirects`: legacy path to destination mapping.

### Communications and audit

- `contact_enquiries`: public contact submissions and read status.
- `mw_emails`: synchronised inbox messages and read status.
- `mailing_list_subscribers`: email subscription records.
- `email_logs`: recipient, template, provider ID, status and error details.
- `admin_notes`: private internal notes.
- `activity_logs`: who changed what and when.

Enable RLS on every table. Add separate SELECT, INSERT, UPDATE and DELETE policies. Signed-in tables should use `auth.uid()` and membership or ownership checks. Public submission tables should allow only the minimum anonymous insert or read access required. Use Edge Functions or protected database functions for privileged status changes, financial fields, roles, signatures and audit fields.

## 7. SEO system

Every indexable route should have unique:

- Page title, normally no more than 60 characters.
- Meta description, normally 150–160 characters.
- Keyword list where still useful for the project.
- Canonical URL.
- Open Graph title, description, URL and image.
- Twitter card metadata.
- Robots directive.
- Relevant JSON-LD schema.
- Visible H1 matching the page purpose.

Create a shared `SEO` component for client-side navigation. It should:

- Accept title, description, canonical, keywords, image, schema, page type and noindex options.
- Use site settings as defaults.
- Truncate descriptions at a word boundary.
- Normalise canonical URLs consistently.
- Use trailing slashes consistently for HTML routes.
- Never create duplicate title or description tags.

Recommended SEO page record:

```text
seo_pages
- id
- slug
- title
- meta_title
- meta_description
- meta_keywords
- h1
- content_html or content_markdown
- og_image
- schema_json
- status: draft | published | archived
- published_at
- updated_at
- canonical_url
```

The admin SEO editor should include a live preview, character counts, slug validation, publish status, canonical preview, heading preview and a checklist for missing fields.

## 8. Prerendering and crawlable HTML

Vite produces the application shell. A post-build script must then create route-specific HTML files so crawlers and social previews receive complete metadata without running JavaScript.

The prerender script should:

1. Read the built `dist/index.html` template.
2. Define static routes with their SEO data.
3. Fetch published `seo_pages` records through Supabase REST using the anonymous key.
4. Fetch published `news_articles` records.
5. Build each route's title, description, canonical, social metadata and schema.
6. Inject crawlable H1, summary and sanitised content inside a `<noscript>` block.
7. Write `/route/index.html` for each HTML route.
8. Write article and category routes.
9. Fail the build loudly if Supabase cannot be reached or a required fetch fails.
10. Escape every value inserted into HTML attributes, title tags and visible text.
11. Preserve file routes such as `sitemap.xml` without adding a trailing slash.

Use directory output:

```text
/c                    → dist/c/index.html
/c/example-page       → dist/c/example-page/index.html
/news/example-story   → dist/news/example-story/index.html
```

Do not silently continue when dynamic content cannot be fetched. A successful build with homepage HTML copied into every dynamic route creates duplicate SEO pages and is harder to detect than a failed build.

After every production build verify:

- Published SEO records have matching directories in `dist/`.
- Published news records have matching directories in `dist/news/`.
- Each HTML file contains its own title, description and canonical.
- Canonicals match the URL format actually served.
- No route unexpectedly contains the homepage title.
- The logo and other public assets exist in `dist/`.

## 9. Vite public assets

If the project needs a cleaned public directory, keep the process explicit and deterministic:

1. Remove the temporary directory at the start of the build.
2. Recreate it.
3. Copy every public asset into it.
4. Rename only known legacy files.
5. Set Vite `publicDir` to that directory.
6. Remove stale `dist/` output before a production build.
7. Verify that key assets exist in `dist/` after the build.

Avoid relying on an old `dist/` directory. A stale output directory can contain an old logo, old footer or missing SVG even when the source asset is correct.

Keep one canonical logo filename and use it everywhere. For example:

- `/brand-logo.svg` for light backgrounds and documents.
- `/brand-logo-white.png` for dark admin navigation.
- `/social-share-image.jpg` for Open Graph previews.

Use meaningful alt text and do not rely on an icon plus fallback text as a logo substitute.

## 10. Netlify deployment

Use a build configuration equivalent to:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = false
```

`force = false` is important: Netlify should serve a prerendered `route/index.html` when it exists and use the SPA fallback only for routes without a static file.

Use `public/_redirects` for:

- Domain canonicalisation.
- Sitemap proxying.
- Markdown or AI-agent content endpoints.
- Legacy route redirects.
- Old WordPress paths.
- Deliberate 410 responses for obsolete assets.

Use `public/_headers` for security and caching headers. Keep redirects ordered from most specific to most general.

## 11. Resend email architecture

Never call Resend directly from browser code. Create one or more Supabase Edge Functions that:

1. Handle CORS preflight.
2. Authenticate the caller where the action is private.
3. Validate the request body.
4. Load the relevant record from Supabase.
5. Generate branded HTML from trusted templates.
6. Call Resend using the server-side secret.
7. Check the provider response.
8. Record success or failure in `email_logs`.
9. Return a generic error to the browser without exposing secrets.

Use separate functions when workflows have different permissions, such as:

- `send-contact-email`
- `send-quote-email`
- `send-invoice-email`
- `send-service-agreement-email`
- `send-audit-email`
- `send-payment-receipt`
- `send-collection-email`

Every function response, including errors and OPTIONS responses, must include the same CORS headers. Functions should use `try/catch`, validate required IDs, and avoid trusting recipient addresses supplied by an unauthorised browser request.

Email templates should include:

- Consistent brand header and footer.
- Plain-language subject line.
- Clear primary action button.
- Human-readable fallback link.
- Contact details.
- No sensitive data beyond what the recipient needs.
- An internal log entry with provider response ID and status.

For public document links use a random, unique token, store only what is necessary, and validate the document status before displaying or allowing changes.

## 12. Document workflows

For quotes, agreements, invoices, certificates, audits and transfer notes, model the lifecycle explicitly. Example:

```text
draft → sent → viewed → edited → ready_for_review → finalised → signed → archived
```

Store:

- Current status.
- Public access token where needed.
- Created, sent, viewed, edited, finalised and signed timestamps.
- Signer name and role.
- An immutable activity log.
- Versioned content when client edits are possible.

Use separate screens for:

- Admin list.
- Admin editor.
- Read-only preview.
- Public customer view.
- Signature view.

For PDF download, capture the document container with html2canvas and place it on multiple A4 jsPDF pages. Add document title, page numbers and a footer. Verify that external images are same-origin or otherwise usable by the canvas renderer.

## 13. AI-assisted features

AI generation must be server-side in an Edge Function. The browser should send an authorised record ID, not arbitrary prompts containing secrets or privileged data.

The function should:

- Load trusted source data from Supabase.
- Build a structured prompt.
- Request structured JSON.
- Validate the returned shape before saving.
- Store the generated draft separately from human-edited and final content.
- Record the action in an audit log.
- Never publish generated content without a human review step.

Use separate fields such as `ai_generated_content`, `admin_edited_content`, `client_edits` and `final_content` where a document passes through review stages.

## 14. Storage and uploads

Use Supabase Storage for customer or operational files. Create private buckets for sensitive documents and use signed URLs with short expiry. Public assets such as logos and social images can remain in `public/`.

For uploads:

- Validate file type and size at the boundary.
- Use generated storage paths rather than user-supplied filenames.
- Do not allow arbitrary path traversal.
- Restrict read, insert, update and delete storage policies separately.
- Do not grant broad anonymous upload or overwrite access.
- Record the owner, related record and upload metadata.

## 15. Settings and operational controls

Create a settings screen backed by `site_settings` for values that staff must be able to change without code deployment:

- Business name, phone, email and address.
- Default SEO title, description, keywords and social image.
- Logo and document branding.
- Email sender display name.
- Public service areas.
- Invoice payment instructions.
- Notification recipients.
- Feature-specific defaults.

Keep security-sensitive values out of this table. API keys, service-role credentials and provider secrets belong in Edge Function secrets. Sensitive finance settings should be protected by role checks and, where needed, an additional financial PIN or approval step.

## 16. Production checklist

Before accepting the new application:

- [ ] Public and admin routes load directly and through internal navigation.
- [ ] Unauthenticated users cannot open admin data.
- [ ] RLS is enabled on every table.
- [ ] Every table has only the required policies.
- [ ] Privileged fields cannot be changed through ordinary browser updates.
- [ ] Public token pages reveal only the intended document.
- [ ] All public forms show success and error states.
- [ ] All external API calls go through Edge Functions.
- [ ] Resend failures are visible to staff and logged.
- [ ] Every indexable URL has unique metadata.
- [ ] Canonicals use one consistent format.
- [ ] Prerendering fails loudly when dynamic content cannot be fetched.
- [ ] `dist/` contains the current logo and all required public assets.
- [ ] `dist/` contains one HTML directory for every published dynamic page.
- [ ] Old URLs redirect to current routes.
- [ ] `robots.txt`, sitemap and social previews are correct.
- [ ] PDFs render multi-page documents correctly.
- [ ] Mobile navigation, tables and forms are usable.
- [ ] Error, empty and loading states are designed rather than blank.
- [ ] Backups or exports are available for important data.
- [ ] Admin activity is auditable.

## 17. Recommended build order for a new project

1. Create the Vite React TypeScript shell and shared styling.
2. Add Supabase client, authentication and protected routes.
3. Add the database tables, indexes and RLS policies.
4. Build the public layout, settings hook and shared SEO component.
5. Build the admin layout, dashboard and site settings.
6. Add the main customer, content and document modules.
7. Add token-based public document views.
8. Add Edge Functions for Resend and other third-party services.
9. Add the prerender script and dynamic SEO page generation.
10. Configure Netlify redirects, headers and deployment.
11. Add audit logs, exports, backups and operational alerts.
12. Run the production checklist against a clean build.

This order keeps the application usable at every stage and prevents an admin screen, email button or public document link from becoming a dead end.
