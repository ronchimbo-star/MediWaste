# Project memory

## Product intent & audience

- MediWaste: clinical waste collection service for UK small/low-volume aesthetics practitioners — mobile, home-based, and small clinics. PAYG model, no contracts/minimums.
- Sister site AestheticList.co.uk: directory of UK aesthetics practitioners/clinics, partnered with MediWaste. Trust-building for mobile practitioners.
- Target users: low-volume producers (e.g., 2-3 Botox clients/month), sole practitioners, mobile practitioners needing flexible waste services.
- Service area: London, Kent, Essex, Surrey, Sussex, Hampshire.

## Brand personality & voice

- Professional, knowledgeable, reassuring. UK English. Emphasises compliance, safety, flexibility, and understanding of small-practice constraints.
- No hard-sell tone; positions MediWaste as supportive partner for small businesses.

## Visual design & UX direction

- Vite + React SPA with lazy-loaded route pages (`src/App.tsx`), prerendered static routes, and SEO/sitemap edge function.
- Pages: HomePage (~634 lines), news index with pagination (12 articles/page, Prev/Next, "Page X of Y"), service coverage, compliance, contact, quote, admin pages.
- Header has desktop + mobile nav; footer has service links and sitemap entries.
- News articles use HTML content with structured headings (h2/h3), FAQs, internal links, and external authority references (HSE, GOV.UK, NHS England, CQC).
- Removed from home page: free audit lead-magnet section and Clinical Waste Audit Builder section (unused imports/state cleaned up). Header "Waste Audit" links removed.
- New section on home page: "GLP-1 Sharps Safe Return Network" above testimonials, linking to `/glp1-sharps-safe-return`.
- GLP-1 page uses brief wording (6-12 months, 5-15 locations) over sample wording. Contact form redirects to existing contact page (no custom form endpoint).

## Decisions, constraints & rationale

- Audit tool routes (`/audit`, `/audit/:token`) kept live; only nav entries removed — route preservation for existing users/tokens.
- News index pagination added to avoid fetching all articles at once.
- GLP-1 page SEO (title, description, keywords), route, footer link, sitemap (edge function + admin SitemapPage list), and prerender `STATIC_ROUTES` entry all wired up.
- Production build passes after all changes.
- Not browser-tested; layout/pagination UI unverified by eye.

## Open questions & assumptions

- Footer still links "Clinical Waste Audit" to old `/audit` page — keep or remove?
- Signing FAQ promises an email that is never sent — fix or remove the promise?
- GLP-1 pilot wording (6-12 months / 5-15 locations) assumed correct per user brief over sample content.