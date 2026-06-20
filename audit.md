# MediWaste Clinical Waste Audit Module

A self-service lead-generation tool that guides healthcare businesses through a 4-step compliance audit, generates an AI-powered report, emails it to the user and admin, and tracks everything in an admin dashboard.

---

## Overview

The audit module sits at `/audit` on the public website. Any visitor can complete it without logging in. On completion, an AI report is generated and emailed automatically to the prospect and to the admin team. All data is stored in Supabase. The admin dashboard at `/admin/audits` provides full visibility, management, and export capabilities.

---

## Front End — `src/pages/AuditPage.tsx`

### Landing Page (Step 0)

- Marketing page explaining the free audit tool
- Trust signals, social proof, and a large "Start Free Audit" CTA button
- Clicking the CTA sets `step` to 1 and begins the wizard

### Wizard Structure

The wizard has 4 steps tracked in `useState`. A progress bar shows current position ("Sector → Your Details → Audit Questions → Your Report"). A `useEffect` on mount checks `localStorage` for a partial session (`mw_audit_session`) and restores the user's position if they left mid-way through.

**State variables:**

| Variable | Purpose |
|---|---|
| `step` | 0=landing, 1=sector, 2=business details, 3=audit questions, 4=report |
| `sessionId` | UUID of the Supabase `mw_audit_sessions` row |
| `sector` | Selected business sector (step 1) |
| `bizDetails` | Business name, contact, email, phone, address, consent flags |
| `auditQ` | Full set of audit answers (step 3) |
| `report` | The AI-generated report object once generated |
| `generating` | Boolean — shows loading spinner while report is being produced |
| `emailSent` | Boolean — set to true once the auto-email fires successfully |

---

### Step 1 — Sector Selection

User selects their business type from a grid of sector cards:

- Dental Practice
- GP / Medical Practice
- Nursing / Community Healthcare
- Tattoo / Piercing Studio
- Laboratory
- Care Home
- Beauty / Aesthetics Clinic
- Veterinary Practice
- Other Healthcare / Producer

On "Next", `createOrUpdateSession()` is called:
- If no session exists: inserts a new row into `mw_audit_sessions` with `sector` and `current_step: 1`. The returned UUID is stored in state and `localStorage`.
- If a session exists (restored from localStorage): updates the existing row.

---

### Step 2 — Business Details

Collects:

- Business name (required)
- Contact name (required)
- Email address (required, validated)
- Phone number (required)
- Site address (optional)
- Town / City (required)
- County (optional)
- Postcode (optional)
- Two consent checkboxes: data processing consent (required) and marketing consent (optional)

On "Next", `updateSession()` upserts these fields onto the existing `mw_audit_sessions` row and saves `current_step: 3` to localStorage.

---

### Step 3 — Audit Questions

Six sub-sections:

**1. Business Profile** — staff count, number of treatment rooms, number of sites

**2. Waste Streams** — user selects from 8 waste types with EWC codes:
- Clinical / Infectious Waste (18 01 03*)
- Sharps Waste (18 01 01)
- Pharmaceutical Waste (18 01 09)
- Cytotoxic / Cytostatic (18 01 08*)
- Dental Amalgam (18 01 10*)
- Anatomical Waste (18 01 02)
- Offensive / Hygiene Waste (18 01 04)
- Confidential / Data Waste

For each selected waste type the user enters an estimated volume (number) and unit (litres / kg / bags / bins / units).

**3. Current Contractor & Collection** — existing contractor name, collection frequency (Weekly / Fortnightly / Monthly / Every 6 weeks / Quarterly / On demand / Not currently collected), container types currently used (multi-select from a list of 11 standard container types), segregation method

**4. Storage & Compliance** — storage location, storage conditions, date of last audit, checkbox: written waste management policy in place, checkbox: staff formally trained

**5. Current Challenges (Pain Points)** — multi-select from 8 common pain points plus a free-text "other" field

**6. Additional Notes** — free text

Step 3 requires at least one waste stream to be selected (validated before proceeding).

On "Next":
1. `saveAnswers()` inserts/updates a row in `mw_audit_answers` linked to the session UUID
2. `setStep(4)` fires immediately — the user sees the "Generating…" screen straight away
3. `generateReport()` fires asynchronously in the background

---

### Step 4 — Report

**Generating state** (while `generating === true`):
- Spinning red ring animation
- "Generating your audit report…"
- "Our AI is analysing your responses and identifying compliance risks."
- "This usually takes 15–30 seconds."

**Report display** (once `report` is set):

A "printable" `div` referenced by `reportRef` contains the full formatted report:

1. **Report letterhead** — MediWaste logo, date, business and contact details in a two-column grid
2. **Risk score bar** — visual progress bar in red/amber/green based on score, with the risk badge (Low / Medium / High / Critical)
3. **Executive Summary** — 2-3 paragraph AI-written summary
4. **Compliance Risks Identified** — cards with severity badge, description, regulation reference, and recommended action
5. **Waste Stream Breakdown** — table with waste type, EWC code, recommended container, suggested collection frequency, handling notes
6. **Recommendations** — cards with priority (Immediate / Short Term / Ongoing), title, description, and expected benefit
7. **Compliance guarantee box** — "Regulation reference guide" with links to relevant regulations
8. **Quote CTA block** — red banner with "Request a Free Quote" button and phone call link (number pulled from admin site settings via `useSiteSettings`)

**Action buttons above the report:**

| Button | Action |
|---|---|
| Download PDF | Captures the report `div` with `html2canvas`, slices it into A4 pages with `jsPDF`, saves as a `.pdf` file. Also inserts a row in `mw_audit_download_events`. |
| Export Excel / CSV | Builds a CSV from the report data, triggers a download. Also inserts a row in `mw_audit_download_events`. |
| Resend Email | Calls `send-audit-email` edge function with `send_to_user: true`. Shows "Email Sent ✓" on success. The email is also sent automatically on generation — this button is for resending. |

**Quote request:**
"Request a Free Quote" button calls `handleRequestQuote()`, which:
1. Inserts a row into `mw_audit_quote_requests`
2. Navigates to `/quote` with the user's details pre-filled as URL params

---

## Session Persistence

Session state is persisted to `localStorage` under the key `mw_audit_session` as `{ id, sector, step }`. This allows a user who leaves mid-wizard to resume where they left off on the same browser. The localStorage entry is cleared when the report is generated (end of flow).

---

## Back End — Supabase Database

### Tables

#### `mw_audit_sessions`

One row per audit attempt. Created at Step 1.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `session_token` | UUID | Auto-generated, unique |
| `status` | text | `in_progress`, `completed`, `abandoned` |
| `sector` | text | Selected at step 1 |
| `business_name`, `contact_name`, `email`, `phone` | text | Collected at step 2 |
| `town`, `county`, `site_address`, `postcode` | text | Collected at step 2 |
| `consent_data`, `consent_marketing` | boolean | Step 2 consent checkboxes |
| `current_step` | integer | Tracks wizard progress |
| `completed_at` | timestamptz | Set when report is generated |
| `archived` | boolean | Admin can archive sessions (default `false`) |
| `ip_address`, `user_agent`, `referrer` | text | Tracking (reserved) |
| `created_at`, `updated_at` | timestamptz | Auto-managed |

#### `mw_audit_answers`

One row per session. Upserted at Step 3.

| Column | Type | Notes |
|---|---|---|
| `session_id` | UUID | FK → `mw_audit_sessions` (CASCADE DELETE) |
| `staff_count` | text | |
| `treatment_rooms`, `sites_count` | integer | |
| `waste_streams` | JSONB | Array of `{type, volume, unit}` |
| `current_contractor`, `collection_frequency` | text | |
| `container_types` | text[] | Multi-select values |
| `segregation_method` | text | |
| `storage_location`, `storage_conditions` | text | |
| `has_waste_policy`, `staff_trained` | boolean | |
| `last_audit_date`, `compliance_concerns` | text | |
| `pain_points` | text[] | Selected pain points |
| `pain_points_other`, `additional_notes` | text | |

#### `mw_audit_reports`

One row per session. Upserted by the edge function. Has a UNIQUE constraint on `session_id` to allow `upsert onConflict`.

| Column | Type | Notes |
|---|---|---|
| `session_id` | UUID | FK → `mw_audit_sessions` (CASCADE DELETE), UNIQUE |
| `executive_summary` | text | AI-written 2-3 paragraph summary |
| `compliance_risks` | JSONB | Array of `{title, description, regulation, severity, action}` |
| `waste_stream_breakdown` | JSONB | Array of `{waste_type, ewc_code, container, frequency, notes}` |
| `recommendations` | JSONB | Array of `{priority, title, description, benefit}` |
| `risk_rating` | text | `low`, `medium`, `high`, `critical` |
| `risk_score` | integer | 0–100 |
| `report_html` | text | Raw HTML from AI (stored but not currently rendered) |
| `ai_model` | text | `gpt-4o-mini` |
| `ai_tokens_used` | integer | Tokens consumed |
| `generation_status` | text | `pending`, `generating`, `complete`, `failed`, `fallback` |
| `generated_at` | timestamptz | |

#### `mw_audit_quote_requests`

One row per session. Created when the user clicks "Request a Free Quote". Has a UNIQUE constraint on `session_id` (one quote request per audit).

| Column | Type | Notes |
|---|---|---|
| `session_id` | UUID | FK → `mw_audit_sessions` (CASCADE DELETE), UNIQUE |
| `status` | text | `new`, `contacted`, `quoted`, `won`, `converted`, `lost` |
| `notes` | text | Admin notes |
| `contacted_at` | timestamptz | |

#### `mw_audit_download_events`

Append-only log. One row per download action (PDF, CSV, email).

| Column | Type | Notes |
|---|---|---|
| `session_id` | UUID | FK → `mw_audit_sessions` (CASCADE DELETE) |
| `format` | text | `pdf`, `excel`, `word`, `email` |

### Row Level Security

All audit tables have RLS enabled.

- **Anonymous users** (`anon` role): can INSERT and SELECT on all audit tables, and UPDATE `mw_audit_sessions` and `mw_audit_answers`. This allows the public wizard to function without authentication.
- **Authenticated users** (`authenticated` role): full access (`FOR ALL`) to all audit tables. This covers admin operations.
- **Service role**: used by edge functions — bypasses RLS entirely.

> Note: The anon policies are intentionally permissive (no row-level ownership check) because sessions are identified by UUID, not by auth user. The UUID is stored in localStorage and treated as a session token.

### Indexes

- `idx_audit_sessions_email` — on `email`
- `idx_audit_sessions_sector` — on `sector`
- `idx_audit_sessions_status` — on `status`
- `idx_audit_sessions_created` — on `created_at DESC`
- `idx_audit_sessions_archived` — on `archived`
- `idx_audit_answers_session` — on `session_id`
- `idx_audit_reports_session` — on `session_id`
- `idx_audit_quote_requests_session` — on `session_id`
- `idx_audit_download_events_session` — on `session_id`

---

## Back End — Edge Functions

### `generate-audit-report`

**Trigger:** Called from the front end after Step 3 answers are saved.  
**Auth:** No JWT required (called with anon key from public page).

**Flow:**

1. Receives `{ session_id }` in the request body
2. Fetches the `mw_audit_sessions` row and the `mw_audit_answers` row from Supabase
3. Upserts `mw_audit_reports` with `generation_status: "generating"` to mark it in-progress
4. Checks for `OPENAI_API_KEY` environment variable:
   - **If present:** Builds a detailed prompt and calls the OpenAI API (`gpt-4o-mini`, `temperature: 0.3`, `max_tokens: 3000`, `response_format: json_object`)
   - **If absent or if OpenAI fails:** Falls back to `fallbackReport()` which applies rule-based scoring

**AI prompt structure:**

The prompt presents the session and answers data in labelled sections and instructs the model to respond with a JSON object conforming to a strict schema:

```
{
  executive_summary: string,
  risk_rating: "low"|"medium"|"high"|"critical",
  risk_score: 0-100,
  compliance_risks: [{title, description, regulation, severity, action}],
  waste_stream_breakdown: [{waste_type, ewc_code, container, frequency, notes}],
  recommendations: [{priority, title, description, benefit}],
  report_summary_html: string  // full HTML body (not currently used in rendering)
}
```

The model is instructed to base advice on:
- HTM 07-01: Safe Management of Healthcare Waste
- Hazardous Waste Regulations 2005
- Environmental Protection Act 1990 (Duty of Care)
- UK English spelling throughout

**Fallback scoring (rule-based):**

Base score: 50  
-15 if contractor exists  
-10 if staff trained  
-10 if waste policy in place  
+15 if more than 3 waste streams  
+10 if last audit date unknown or never  
Clamped: 10–90  
Rating: ≥70 = high, ≥45 = medium, <45 = low

5. Upserts the report into `mw_audit_reports` with all fields and `generation_status: "complete"` (or `"fallback"`)
6. Updates `mw_audit_sessions` with `status: "completed"` and `completed_at`
7. Returns `{ success: true, status, report: <reportData> }`

**OpenAI model:** `gpt-4o-mini`  
**Typical token usage:** ~1,500–3,000 tokens per report  
**Cost estimate (as of 2025):** ~$0.001–$0.003 per report

---

### `send-audit-email`

**Trigger:** Called automatically from the front end immediately after the report is generated. Also callable from the admin detail page to resend.  
**Auth:** No JWT required.

**Parameters:** `{ session_id, send_to_user: boolean }`

**Flow:**

1. Fetches the session, report, and site settings (for the phone number) from Supabase
2. Reads `RESEND_API_KEY` from environment secrets
3. If `send_to_user: true` AND `session.email` is set: sends the user email via Resend
4. Always sends the admin notification email to the hardcoded admin address (`ronchimbo@gmail.com`)
5. Inserts a row in `mw_audit_download_events` with `format: "email"` to track the send

**Email service:** [Resend](https://resend.com)  
**From address:** `MediWaste Audits <onboarding@resend.dev>` (Resend's default sandbox sender — replace with a verified custom domain sender for production)  
**Reply-to (user email):** `info@mediwaste.co.uk`  
**Reply-to (admin email):** `session.email` (so admin can reply directly to the prospect)

**User email contains:**
- Greeting personalised with contact name
- Business name, sector, location
- Risk rating badge
- Risk score
- Executive summary
- Compliance risks table (title, description, action required)
- Recommendations list
- CTA block linking to `https://mediwaste.co.uk/quote`
- Phone number from site settings (falls back to `0800 046 9806`)

**Admin email contains:**
- Same content as user email
- Additional admin panel (yellow highlight box) showing: email, phone, address, risk score — for quick follow-up

**Environment secrets required:**
- `RESEND_API_KEY` — Resend API key
- `OPENAI_API_KEY` — OpenAI API key (for `generate-audit-report`)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — auto-configured by Supabase

---

## Admin Dashboard — `/admin/audits`

### `src/pages/admin/AdminAuditsPage.tsx`

**Access:** Authenticated admin users only (protected by `AdminLayout` auth guard).

**Stats panel (top row):**
- Total Audits, Completed, Incomplete, Quote Requests, Conversion Rate (quote requests / completed)
- Downloads by Format (PDF, Excel, Email counts)
- Completions by Sector (bar-chart style grid of top 8 sectors)

**View modes:**
- **Active** (default) — shows sessions where `archived = false`
- **Archived** — shows sessions where `archived = true`
- **All** — no filter on archived

**Filters:**
- Search (business name, contact, email, town, sector — client-side filter)
- Status filter (All / Completed / Started / Generating)
- Sector filter (populated dynamically from loaded sessions)
- Date range (from / to)

**Table columns:**
Business, Sector, Status, Risk, Location, Contact + Email, Date, Quote (yes/no), Actions

**Actions per row:**
- **View** — navigates to `/admin/audits/{id}` (detail page)
- **Archive / Unarchive** — toggles `archived` flag on the session. Archived rows are displayed at reduced opacity.
- **Delete** — shows an inline confirmation modal, then permanently deletes the session row. All child records cascade-delete automatically (answers, report, quote requests, download events).

**Export CSV:** Exports all filtered rows as a `.csv` file.

---

### `src/pages/admin/AdminAuditDetailPage.tsx`

Five-tab view for a single audit session:

**Overview tab:**
- Business details card (name, sector, contact, email, phone, address)
- Audit status card (status, timestamps, consent flags, risk rating, risk score, AI token usage)
- Actions: "Regenerate Report" (re-invokes `generate-audit-report` edge function), "Resend Email to Customer" (invokes `send-audit-email` with `send_to_user: true`)

**Audit Answers tab:**
- Waste streams table (type, volume, unit)
- Contractor & Collection details
- Storage & Compliance details
- Business profile (staff, rooms, sites, pain points)

**Generated Report tab:**
- Executive summary
- Compliance risks (severity badges, regulation refs, actions)
- Waste stream breakdown table
- Recommendations (priority / title / description / benefit)

**Downloads tab:**
- Log of all download events (format + datetime) — PDF, Excel/CSV, Email sends

**Quote Request tab:**
- Quote request details if one was submitted
- Status management buttons: New → Contacted → Quoted → Won / Lost

---

## PDF Generation

Done entirely client-side using two libraries:

1. **`html2canvas`** — renders the `reportRef` DOM node to a `<canvas>` at 2× scale with CORS enabled
2. **`jsPDF`** — creates an A4 portrait PDF and slices the canvas image across pages

The DOM node is cloned, positioned off-screen at a fixed width of 900px, rendered, then removed. Each A4 page shows the next 297mm slice of the full report image by shifting the y-offset by `-pageHeight × pageIndex`.

File is saved as `MediWaste-Audit-{businessName}.pdf`.

---

## CSV / Excel Export

Built from the structured `report` object in memory. Rows cover:
- Business details
- Audit summary (risk rating, score)
- Waste streams (type, EWC code, container, frequency)
- Compliance risks (title, severity, regulation, action)
- Recommendations (priority, title, description)

Downloaded as `MediWaste-Audit-{businessName}.csv`.

---

## Environment Secrets Required

| Secret | Used By | Notes |
|---|---|---|
| `OPENAI_API_KEY` | `generate-audit-report` | If absent, fallback rule-based report is used |
| `RESEND_API_KEY` | `send-audit-email` | Required for any emails to be sent |
| `SUPABASE_URL` | All edge functions | Auto-configured by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | All edge functions | Auto-configured by Supabase |
| `SUPABASE_ANON_KEY` | Front end | Auto-configured |

---

## Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | ^2.39.0 | Database client and edge function invocation |
| `@tanstack/react-query` | ^5.96.1 | Data fetching and cache management in admin pages |
| `html2canvas` | ^1.4.1 | DOM-to-canvas rendering for PDF |
| `jspdf` | ^4.2.1 | PDF generation |
| `lucide-react` | ^0.294.0 | Icons throughout the wizard and report |
| `react-router-dom` | ^6.20.1 | Navigation, URL params for quote pre-fill |
| Resend (via fetch) | n/a | Transactional email API |
| OpenAI (via fetch) | n/a | AI report generation (`gpt-4o-mini`) |

---

## Data Flow Summary

```
User visits /audit
  → Clicks "Start Free Audit"
  → Step 1: Selects sector
      → INSERT mw_audit_sessions (sector, status=in_progress)
      → Save {id, sector, step} to localStorage
  → Step 2: Enters business details
      → UPDATE mw_audit_sessions (contact info, consent)
  → Step 3: Completes audit questions
      → UPSERT mw_audit_answers (waste streams, compliance answers)
      → setStep(4) immediately → spinner shows
      → generate-audit-report edge function called:
          → Fetch session + answers from DB
          → Call OpenAI gpt-4o-mini (or fallback)
          → UPSERT mw_audit_reports (AI JSON output)
          → UPDATE mw_audit_sessions (status=completed)
      → Front end receives report, renders in DOM
      → send-audit-email edge function called (send_to_user: true):
          → Fetch site_settings for phone number
          → Send HTML email to user (Resend)
          → Send HTML email to admin (Resend)
          → INSERT mw_audit_download_events (format=email)
  → User can: Download PDF / Export CSV / Resend Email / Request Quote

Admin visits /admin/audits
  → Views all sessions with stats and filters
  → Can archive (soft) or delete (hard, cascades)
  → Clicks "View" → /admin/audits/{id}
      → Can regenerate report, resend email
      → Can update quote request status
```

---

## Replication Checklist

To replicate this module on a new domain/project:

- [ ] Supabase project with the 3 migration files applied (create tables, unique constraints, archived column)
- [ ] `OPENAI_API_KEY` secret added to Supabase edge function secrets
- [ ] `RESEND_API_KEY` secret added to Supabase edge function secrets
- [ ] Resend account with a verified sending domain configured (replace `onboarding@resend.dev` with your domain)
- [ ] Admin email address updated in `send-audit-email/index.ts` (currently `ronchimbo@gmail.com`)
- [ ] `site_settings` table populated with `phone_number` (used in email CTA and audit page call link)
- [ ] Both edge functions deployed: `generate-audit-report`, `send-audit-email`
- [ ] React front end with `AuditPage.tsx`, `AdminAuditsPage.tsx`, `AdminAuditDetailPage.tsx`
- [ ] Route `/audit` registered in the router
- [ ] Admin routes `/admin/audits` and `/admin/audits/:id` registered and guarded by auth
