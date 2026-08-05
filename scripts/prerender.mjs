/**
 * Post-build pre-render script.
 *
 * Runs after `vite build` to generate per-route HTML files with a fully
 * populated <head> (title, meta description, canonical, OG, Twitter,
 * JSON-LD schema) and crawlable content inside <div id="root"> containing
 * the page H1, description, and full article content where available.
 *
 * This makes every public route immediately crawlable by tools that do not
 * execute JavaScript — aHREFS, Bing, social-media link scrapers, etc.
 *
 * Static routes: defined below in STATIC_ROUTES with hardcoded SEO data.
 * Dynamic routes: fetched from Supabase at build time.
 *   /c/:slug    → seo_pages table  (published only)
 *   /news/:slug → news_articles table  (published only)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BASE_URL = 'https://mediwaste.co.uk';
const DEFAULT_OG_IMAGE = `${BASE_URL}/Medical-Waste-Hero.jpg`;

// ─────────────────────────────────────────────────────────────────────────────
// Environment
// ─────────────────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
  return env;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase REST helper (no SDK — no extra deps)
// ─────────────────────────────────────────────────────────────────────────────

async function supabaseFetch(supabaseUrl, anonKey, table, params) {
  const qs = new URLSearchParams(params).toString();
  const url = `${supabaseUrl}/rest/v1/${table}?${qs}`;
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: 'application/json',
      // Ask Supabase for up to 1 000 rows (default PostgREST limit)
      'Range-Unit': 'items',
      Range: '0-999',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} — ${body}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Escape for use inside an HTML element (e.g. <title>). */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape for use inside an HTML attribute value (e.g. content="..."). */
function escAttr(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** Trim description to 160 chars, breaking at a word boundary. */
function trimDesc(str) {
  if (!str) return '';
  const s = String(str);
  if (s.length <= 160) return s;
  const cut = s.slice(0, 159);
  const space = cut.lastIndexOf(' ');
  return (space > 100 ? cut.slice(0, space) : cut) + '\u2026';
}

/** Normalise a canonical URL to end with a trailing slash so it matches
 *  the URL Netlify actually serves (directory-based prerendered pages are
 *  served at /path/ not /path).  Prevents Ahrefs redirect-chain warnings. */
function withTrailingSlash(url) {
  if (!url) return url;
  // Don't touch URLs that already end with /
  if (url.endsWith('/')) return url;
  // Don't touch file-like URLs (e.g. /sitemap.xml)
  if (/\.[a-z0-9]+$/i.test(url.split('?')[0])) return url;
  return url + '/';
}

// ─────────────────────────────────────────────────────────────────────────────
// Head + noscript injection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the <head> meta block for a route and injects it into the template.
 * Also injects crawlable content inside <div id="root"> containing
 * the H1, description, and full HTML content — visible to non-JS crawlers.
 */
function buildHtml(template, meta) {
  const {
    title,
    description,
    keywords,
    canonical,
    ogImage = DEFAULT_OG_IMAGE,
    schema,
    noindex = false,
    type = 'website',
    h1,
    content,
  } = meta;

  const desc = trimDesc(description);
  const schemas = Array.isArray(schema) ? schema : schema ? [schema] : [];
  const robots = noindex
    ? 'noindex,nofollow'
    : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1';
  const canon = withTrailingSlash(canonical);

  const metaLines = [
    `<title>${esc(title)}</title>`,
    desc       ? `    <meta name="description" content="${escAttr(desc)}" />`    : '',
    keywords   ? `    <meta name="keywords" content="${escAttr(keywords)}" />`   : '',
    `    <meta name="robots" content="${robots}" />`,
    `    <link rel="canonical" href="${escAttr(canon)}" />`,
    `    <meta property="og:site_name" content="MediWaste" />`,
    `    <meta property="og:type" content="${type}" />`,
    `    <meta property="og:url" content="${escAttr(canon)}" />`,
    `    <meta property="og:title" content="${escAttr(title)}" />`,
    desc       ? `    <meta property="og:description" content="${escAttr(desc)}" />` : '',
    `    <meta property="og:image" content="${escAttr(ogImage)}" />`,
    `    <meta property="og:image:width" content="1200" />`,
    `    <meta property="og:image:height" content="630" />`,
    `    <meta property="og:locale" content="en_GB" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:site" content="@mediwaste" />`,
    `    <meta name="twitter:title" content="${escAttr(title)}" />`,
    desc       ? `    <meta name="twitter:description" content="${escAttr(desc)}" />` : '',
    `    <meta name="twitter:image" content="${escAttr(ogImage)}" />`,
    ...schemas.map(s => `    <script type="application/ld+json">${JSON.stringify(s)}</script>`),
  ].filter(Boolean).join('\n');

  // Inject crawlable content inside #root so non-JS crawlers (aHREFS, Bing,
  // social scrapers) see the H1 and article body as the page's real content.
  // React replaces this when it hydrates.
  // content is trusted HTML from Supabase (already sanitised by the app).
  const rootParts = [
    h1      ? `<h1>${esc(h1)}</h1>` : '',
    desc    ? `<p>${esc(desc)}</p>` : '',
    content ? content               : '',
  ].filter(Boolean);
  const rootInner = rootParts.length
    ? `<article>${rootParts.join('')}</article>`
    : '';

  // Wrap crawlable content in <noscript> so it is invisible to JS-enabled
  // browsers (preventing flash of unstyled text before CSS loads) but still
  // fully present in the HTML source for non-JS crawlers (aHREFS, Bing,
  // social scrapers). React replaces #root entirely on hydration.
  const rootContent = rootInner
    ? `<noscript>${rootInner}</noscript>`
    : '';

  return template
    // Remove the generic title added by vite build
    .replace(/<title>[^<]*<\/title>/, '')
    // Inject all meta tags before closing </head>
    .replace('</head>', `    ${metaLines}\n  </head>`)
    // Inject crawlable content inside <div id="root">
    .replace('<div id="root"></div>', `<div id="root">${rootContent}</div>`);
}

// ─────────────────────────────────────────────────────────────────────────────
// File writing
// ─────────────────────────────────────────────────────────────────────────────

function writeRoute(routePath, html) {
  // '/' → dist/index.html  |  '/about' → dist/about/index.html
  const rel = routePath === '/' ? '' : routePath;
  const dir = path.join(DIST, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
// Static routes
// ─────────────────────────────────────────────────────────────────────────────

// Shared content blocks used across multiple pages
const EXTERNAL_LINKS = '<h2>Useful Resources</h2><ul><li><a href="https://www.gov.uk/government/publications/management-of-clinical-and-healthcare-waste" target="_blank" rel="noopener noreferrer">GOV.UK: Management of clinical and healthcare waste guidance</a></li><li><a href="https://www.hse.gov.uk/biologicalagents/blood-borne-viruses/needlestick-injuries.htm" target="_blank" rel="noopener noreferrer">HSE: Safe disposal of sharps and needlestick injuries</a></li><li><a href="https://www.nhs.uk/conditions/clinical-waste/" target="_blank" rel="noopener noreferrer">NHS: How to dispose of clinical waste</a></li></ul>';

const SERVICE_LINKS = '<h2>Our Clinical Waste Services</h2><ul><li><a href="/waste-services/infectious-waste">Infectious waste collection</a> — yellow bag waste including contaminated dressings, swabs and PPE</li><li><a href="/waste-services/sharps-waste">Sharps disposal</a> — needles, syringes, lancets and other medical sharps</li><li><a href="/waste-services/pharmaceutical-waste">Pharmaceutical waste disposal</a> — expired medicines and controlled drugs</li><li><a href="/waste-services/cytotoxic-waste">Cytotoxic waste disposal</a> — chemotherapy and cytostatic waste</li><li><a href="/waste-services/dental-waste">Dental waste disposal</a> — amalgam, impression materials and dental sharps</li><li><a href="/waste-services/anatomical-waste">Anatomical waste disposal</a> — human tissue and pathology waste</li></ul>';

const COMPLIANCE_BOX = '<div class="success-box"><p><strong>Compliance guarantee:</strong> All waste transfer notes and consignment notes provided within 48 hours of collection. MediWaste is audited annually by the Environment Agency and holds a registered waste carrier licence (upper tier).</p></div>';

const PROCESS_STEPS = '<h2>Our Collection Process</h2><ol><li><strong>Free consultation</strong> — We assess your waste streams and recommend the right containers and collection schedule.</li><li><strong>Scheduled collection</strong> — Our licensed drivers collect your waste at agreed intervals and issue waste transfer notes on every visit.</li><li><strong>Compliant disposal</strong> — Waste is transported to a licensed facility for incineration or treatment, with full chain-of-custody documentation.</li></ol>';

const FAQ_SCHEMA = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});

const LOCAL_BUSINESS_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'MediWaste',
  description: 'Clinical waste compliance and disposal services for GP surgeries, dental practices, and healthcare providers across London and the South East.',
  url: BASE_URL,
  telephone: '+441322879713',
  email: 'hello@mediwaste.co.uk',
  address: { '@type': 'PostalAddress', addressCountry: 'GB' },
  areaServed: ['London', 'Kent', 'Essex', 'Surrey', 'Sussex', 'Hampshire'],
};

const STATIC_ROUTES = [
  {
    path: '/',
    title: 'Clinical Waste Collection London & South East | MediWaste',
    description: 'Fully compliant clinical waste disposal for GP surgeries, dental practices, and care homes across London and the South East. Registered waste carrier. Free compliance audit available.',
    keywords: 'clinical waste collection, medical waste disposal, sharps disposal, clinical waste London',
    canonical: `${BASE_URL}/`,
    h1: 'Clinical Waste Collection London & South East',
    schema: LOCAL_BUSINESS_SCHEMA,
    content: `
<p>MediWaste provides fully licensed clinical waste collection and disposal services for GP surgeries, dental practices, care homes, aesthetic clinics and beauty salons across London and the South East. We are a registered waste carrier (upper tier) with the Environment Agency, ensuring your waste is handled safely, legally and responsibly at every stage.</p>
<h2>Why Choose MediWaste?</h2>
<p>We understand that healthcare providers need a reliable, compliant waste partner. Our service is built on three principles: compliance, convenience and competitive pricing. We supply all containers free of charge, collect on a schedule that suits you, and provide full documentation within 48 hours of every collection.</p>
<ul>
<li><strong>Environment Agency registered</strong> — upper tier waste carrier licence</li>
<li><strong>Free containers</strong> — sharps bins, yellow bags, orange bags and rigid containers supplied at no extra cost</li>
<li><strong>Flexible scheduling</strong> — weekly, fortnightly, monthly or ad-hoc collections</li>
<li><strong>Full documentation</strong> — waste transfer notes and consignment notes within 48 hours</li>
<li><strong>7-day startup</strong> — we can usually begin collections within a week of your enquiry</li>
</ul>
${SERVICE_LINKS}
<h2>Areas We Serve</h2>
<p>We provide clinical waste collection across London and the South East, including:</p>
<ul>
<li><a href="/service-areas/london">London</a> — all 32 boroughs and the City</li>
<li><a href="/service-areas/kent">Kent</a> — Maidstone, Canterbury, Dartford, Medway</li>
<li><a href="/service-areas/essex">Essex</a> — Chelmsford, Colchester, Basildon</li>
<li><a href="/service-areas/surrey">Surrey</a> — Guildford, Woking, Reigate, Epsom</li>
<li><a href="/service-areas/sussex">Sussex</a> — Brighton, Crawley, Worthing</li>
<li><a href="/service-areas/hampshire">Hampshire</a> — Southampton, Portsmouth, Basingstoke</li>
</ul>
<p>For a full list of locations, see our <a href="/service-coverage">service coverage page</a>.</p>
${PROCESS_STEPS}
${COMPLIANCE_BOX}
<h2>Client Testimonials</h2>
<p>"MediWaste has transformed our waste management. The collection is always on time and the documentation is impeccable." — GP Surgery, London</p>
<p>"Professional, reliable and compliant. We switched to MediWaste six months ago and have never looked back." — Dental Practice, Kent</p>
<h2>Frequently Asked Questions</h2>
<h3>How quickly can you start collections?</h3>
<p>We can usually begin collections within 7 days of your initial enquiry. In urgent cases, we may be able to arrange a first collection sooner.</p>
<h3>Do you supply containers?</h3>
<p>Yes, all sharps bins, yellow bags, orange bags and rigid containers are supplied free of charge as part of your service agreement.</p>
<h3>Are you licensed by the Environment Agency?</h3>
<p>Yes, MediWaste is a registered upper tier waste carrier with the Environment Agency. We are audited annually and hold all required licences for clinical and hazardous waste transport.</p>
<h3>How much does clinical waste collection cost?</h3>
<p>Pricing depends on the volume and type of waste, collection frequency and your location. <a href="/quote">Request a free quote</a> or call us on 0800 046 9806 for a tailored price.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/about',
    title: 'About MediWaste | Professional Medical Waste Services',
    description: "Learn about MediWaste's professional clinical waste disposal services. Fully licensed and compliant waste management for healthcare and beauty industries across the UK.",
    canonical: `${BASE_URL}/about`,
    h1: 'About MediWaste',
    schema: LOCAL_BUSINESS_SCHEMA,
    content: `
<p>MediWaste is a specialist clinical waste management company serving GP surgeries, dental practices, care homes, aesthetic clinics and beauty salons across London and the South East. We provide fully licensed collection and disposal of all clinical waste streams, with a focus on compliance, reliability and customer service.</p>
<h2>Our Accreditations</h2>
<ul>
<li><strong>Environment Agency registered waste carrier</strong> — upper tier licence</li>
<li><strong>Safe Contractor approved</strong></li>
<li><strong>ISO 14001 certified</strong> — environmental management systems</li>
<li><strong>CQC compliant</strong> — we help healthcare providers meet Care Quality Commission requirements for waste management</li>
</ul>
<h2>Our Approach</h2>
<p>We believe clinical waste disposal should be simple, transparent and fully compliant. Our process begins with a free consultation to understand your waste streams and recommend the right containers and collection schedule. We then provide ongoing collections with full documentation, so you always have the records you need for inspections and audits.</p>
<p>Every collection is backed by waste transfer notes or consignment notes, issued within 48 hours. We supply all containers free of charge, and our pricing is transparent with no hidden fees.</p>
<h2>Who We Serve</h2>
<ul>
<li><strong>GP surgeries and medical centres</strong> — infectious waste, sharps, pharmaceutical waste</li>
<li><strong>Dental practices</strong> — amalgam, sharps, impression materials, infectious waste</li>
<li><strong>Care homes and nursing homes</strong> — incontinence waste, sharps, pharmaceutical waste</li>
<li><strong>Aesthetic clinics and beauty salons</strong> — sharps, clinical waste, tattoo and piercing waste</li>
<li><strong>Veterinary practices</strong> — clinical waste, sharps, pharmaceutical waste, anatomical waste</li>
<li><strong>Pharmacies</strong> — expired medicines, controlled drugs, packaging waste</li>
</ul>
<h2>Our Service Area</h2>
<p>We provide clinical waste collection across <a href="/service-areas/london">London</a>, <a href="/service-areas/kent">Kent</a>, <a href="/service-areas/essex">Essex</a>, <a href="/service-areas/surrey">Surrey</a>, <a href="/service-areas/sussex">Sussex</a> and <a href="/service-areas/hampshire">Hampshire</a>. See our full <a href="/service-coverage">service coverage area</a> for more details.</p>
${COMPLIANCE_BOX}
<h2>Contact Us</h2>
<p>Ready to get started? <a href="/quote">Request a free quote</a> or call us on 0800 046 9806. We can usually begin collections within 7 days of your enquiry.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/waste-services',
    title: 'Clinical Waste Disposal Services UK | Medical Waste Collection | Sharps Disposal',
    description: 'Licensed clinical waste disposal: infectious waste, sharps, pharmaceutical, cytotoxic, dental and anatomical waste. Compliant UK medical waste collection. Free quote.',
    keywords: 'clinical waste disposal, medical waste collection, sharps disposal UK',
    canonical: `${BASE_URL}/waste-services`,
    h1: 'Clinical Waste Disposal Services',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Clinical Waste Disposal',
      provider: { '@type': 'LocalBusiness', name: 'MediWaste', url: BASE_URL },
      areaServed: { '@type': 'Country', name: 'United Kingdom' },
      description: 'Professional disposal of infectious clinical waste, sharps, pharmaceutical waste, anatomical waste, cytotoxic waste and dental waste.',
    },
    content: `
<p>MediWaste provides licensed clinical waste disposal services for healthcare providers across London and the South East. We handle all categories of clinical waste, from infectious waste and sharps to pharmaceutical and anatomical waste, ensuring full compliance with UK regulations at every stage.</p>
${SERVICE_LINKS}
<h2>Waste Segregation</h2>
<p>Proper waste segregation is essential for compliance. The <a href="https://www.gov.uk/government/publications/management-of-clinical-and-healthcare-waste" target="_blank" rel="noopener noreferrer">GOV.UK guidance on clinical waste management</a> specifies colour-coded containers for different waste streams:</p>
<ul>
<li><strong>Yellow bags</strong> — infectious waste requiring incineration</li>
<li><strong>Orange bags</strong> — infectious waste suitable for alternative treatment</li>
<li><strong>Yellow sharps bins</strong> — sharps contaminated with pharmaceuticals</li>
<li><strong>Orange sharps bins</strong> — sharps not contaminated with pharmaceuticals</li>
<li><strong>Purple bins/bags</strong> — cytotoxic and cytostatic waste</li>
<li><strong>Blue bins</strong> — pharmaceutical waste</li>
<li><strong>Red bins</strong> — anatomical waste</li>
</ul>
${PROCESS_STEPS}
<h2>Compliance and Documentation</h2>
<p>Every collection is documented with waste transfer notes or hazardous waste consignment notes, issued within 48 hours. We maintain records for the statutory minimum of two years and can provide copies on request. <a href="/compliance">Learn more about our compliance services</a>.</p>
${COMPLIANCE_BOX}
<h2>Get a Quote</h2>
<p><a href="/quote">Request a free, no-obligation quote</a> or call us on 0800 046 9806. We can usually start collections within 7 days.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/waste-services/infectious-waste',
    title: 'Infectious Clinical Waste Disposal UK | Yellow Bag Waste Collection Service',
    description: 'Licensed infectious clinical waste disposal. Collection of contaminated dressings, swabs, PPE and infectious materials. Yellow bag waste with compliant incineration.',
    keywords: 'infectious waste disposal, clinical waste collection, yellow bag waste',
    canonical: `${BASE_URL}/waste-services/infectious-waste`,
    h1: 'Infectious Clinical Waste Disposal',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Infectious Waste Disposal',
      provider: { '@type': 'LocalBusiness', name: 'MediWaste', url: BASE_URL },
    },
    content: `
<p>Infectious clinical waste includes any waste that may be contaminated with potentially infectious micro-organisms. This includes contaminated dressings, swabs, bandages, PPE (gloves, aprons, masks), and other materials that have been in contact with bodily fluids. MediWaste provides licensed collection and incineration of infectious waste in yellow or orange bags, depending on the waste category.</p>
<h2>What Counts as Infectious Waste?</h2>
<ul>
<li>Contaminated dressings, bandages and wound coverings</li>
<li>Used swabs and cotton wool</li>
<li>Disposable PPE — gloves, aprons, masks, gowns</li>
<li>Contaminated bedding and clothing</li>
<li>Items saturated with blood or bodily fluids</li>
<li>Microbiological cultures and specimens</li>
</ul>
<h2>Yellow Bag vs Orange Bag</h2>
<p>Yellow bags are used for infectious waste that requires incineration, such as waste contaminated with chemicals or pharmaceuticals. Orange bags are used for infectious waste that can be treated by alternative treatment methods. Our team will advise you on the correct segregation for your waste streams during your free consultation.</p>
<h2>Regulatory Compliance</h2>
<p>Infectious waste disposal is governed by the <a href="https://www.gov.uk/government/publications/management-of-clinical-and-healthcare-waste" target="_blank" rel="noopener noreferrer">GOV.UK clinical waste management guidance</a> and the Hazardous Waste Regulations 2005. MediWaste ensures full compliance with all relevant regulations, providing waste transfer notes within 48 hours of every collection.</p>
${PROCESS_STEPS}
${COMPLIANCE_BOX}
<h2>Related Services</h2>
<ul>
<li><a href="/waste-services/sharps-waste">Sharps waste disposal</a></li>
<li><a href="/waste-services/pharmaceutical-waste">Pharmaceutical waste disposal</a></li>
<li><a href="/waste-services">All clinical waste services</a></li>
</ul>
<p><a href="/quote">Request a free quote</a> or call 0800 046 9806.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/waste-services/sharps-waste',
    title: 'Sharps Waste Disposal UK | Needle & Syringe Disposal Service | Sharps Bins',
    description: 'Licensed sharps waste disposal for needles, syringes and medical sharps. Puncture-proof bins supplied free. Compliant collection and incineration. Get a quote.',
    keywords: 'sharps disposal, needle disposal UK, sharps bins, sharps waste collection',
    canonical: `${BASE_URL}/waste-services/sharps-waste`,
    h1: 'Sharps Waste Disposal',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Sharps Waste Disposal',
      provider: { '@type': 'LocalBusiness', name: 'MediWaste', url: BASE_URL },
    },
    content: `
<p>Sharps waste includes any item that could cut or puncture the skin and may be contaminated with blood or bodily fluids. This includes needles, syringes, lancets, scalpels, razor blades and glass ampoules. MediWaste provides licensed sharps waste disposal with free puncture-proof sharps bins supplied as part of your service.</p>
<h2>Types of Sharps Waste</h2>
<ul>
<li><strong>Needles and syringes</strong> — from injections, blood sampling and vaccinations</li>
<li><strong>Lancets and finger-prick devices</strong> — from diabetes testing and point-of-care testing</li>
<li><strong>Scalpels and surgical blades</strong> — from minor surgery and podiatry</li>
<li><strong>Razor blades</strong> — from dermatology and beauty treatments</li>
<li><strong>Glass ampoules and vials</strong> — from pharmaceutical preparation</li>
<li><strong>Acupuncture needles</strong> — from acupuncture and dry needling clinics</li>
</ul>
<h2>Sharps Bin Colour Coding</h2>
<p>The <a href="https://www.hse.gov.uk/biologicalagents/blood-borne-viruses/needlestick-injuries.htm" target="_blank" rel="noopener noreferrer">HSE guidance on sharps disposal</a> specifies colour-coded bins:</p>
<ul>
<li><strong>Orange sharps bins</strong> — sharps not contaminated with pharmaceuticals (e.g. blood sampling needles)</li>
<li><strong>Yellow sharps bins</strong> — sharps contaminated with pharmaceuticals (e.g. injection needles)</li>
<li><strong>Purple sharps bins</strong> — cytotoxic or cytostatic contaminated sharps (e.g. chemotherapy needles)</li>
</ul>
<h2>Regulatory Compliance</h2>
<p>Sharps waste disposal is regulated under the Health and Safety (Sharp Instruments in Healthcare) Regulations 2013 and the Hazardous Waste Regulations 2005. All sharps must be placed in UN-approved puncture-proof containers and disposed of by licensed carriers. MediWaste provides full documentation for every collection.</p>
${PROCESS_STEPS}
${COMPLIANCE_BOX}
<h2>Related Services</h2>
<ul>
<li><a href="/waste-services/infectious-waste">Infectious waste disposal</a></li>
<li><a href="/waste-services/pharmaceutical-waste">Pharmaceutical waste disposal</a></li>
<li><a href="/waste-services/cytotoxic-waste">Cytotoxic waste disposal</a></li>
<li><a href="/waste-services">All clinical waste services</a></li>
</ul>
<p><a href="/quote">Request a free quote</a> or call 0800 046 9806.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/waste-services/pharmaceutical-waste',
    title: 'Pharmaceutical Waste Disposal UK | Medicine & Drug Disposal Service',
    description: 'Licensed pharmaceutical waste disposal for expired medicines, controlled drugs and pharmaceutical waste. Blue bin collection with compliant incineration. Free quote.',
    keywords: 'pharmaceutical waste disposal, medicine disposal UK, drug waste collection',
    canonical: `${BASE_URL}/waste-services/pharmaceutical-waste`,
    h1: 'Pharmaceutical Waste Disposal',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Pharmaceutical Waste Disposal',
      provider: { '@type': 'LocalBusiness', name: 'MediWaste', url: BASE_URL },
    },
    content: `
<p>Pharmaceutical waste includes expired, unused or contaminated medicines, controlled drugs and pharmaceutical packaging. MediWaste provides licensed pharmaceutical waste disposal in blue bins, with compliant incineration and full chain-of-custody documentation.</p>
<h2>Types of Pharmaceutical Waste</h2>
<ul>
<li><strong>Expired medicines</strong> — tablets, capsules, liquids and topical preparations past their expiry date</li>
<li><strong>Unused medicines</strong> — returned by patients or no longer needed</li>
<li><strong>Controlled drugs</strong> — subject to additional regulations under the Misuse of Drugs Regulations 2001</li>
<li><strong>Pharmaceutical packaging</strong> — vials, ampoules, bottles and blister packs contaminated with residue</li>
<li><strong>Vaccines and biological products</strong> — expired or unused vaccines</li>
<li><strong>Cytotoxic and cytostatic medicines</strong> — must be segregated into purple containers</li>
</ul>
<h2>Legal Regulations</h2>
<p>Pharmaceutical waste disposal is governed by the Hazardous Waste Regulations 2005, the Misuse of Drugs Regulations 2001, and the <a href="https://www.gov.uk/government/publications/management-of-clinical-and-healthcare-waste" target="_blank" rel="noopener noreferrer">GOV.UK clinical waste management guidance</a>. Controlled drugs require denaturing before disposal and must be witnessed and documented. MediWaste ensures full compliance with all regulatory requirements.</p>
<h2>Benefits of Professional Pharmaceutical Waste Disposal</h2>
<ul>
<li>Prevents environmental contamination from improper disposal</li>
<li>Protects public health by ensuring medicines are destroyed safely</li>
<li>Maintains compliance with CQC and Environment Agency requirements</li>
<li>Provides an audit trail for inspections and regulatory visits</li>
</ul>
${PROCESS_STEPS}
${COMPLIANCE_BOX}
<h2>Related Services</h2>
<ul>
<li><a href="/waste-services/sharps-waste">Sharps waste disposal</a></li>
<li><a href="/waste-services/cytotoxic-waste">Cytotoxic waste disposal</a></li>
<li><a href="/waste-services">All clinical waste services</a></li>
</ul>
<p><a href="/quote">Request a free quote</a> or call 0800 046 9806.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/waste-services/cytotoxic-waste',
    title: 'Cytotoxic Waste Disposal UK | Chemotherapy Waste Collection Service',
    description: 'Licensed cytotoxic and cytostatic waste disposal. Collection of chemotherapy waste, contaminated PPE and cancer treatment materials. Purple bin. Free quote.',
    keywords: 'cytotoxic waste disposal, chemotherapy waste, cytostatic waste UK',
    canonical: `${BASE_URL}/waste-services/cytotoxic-waste`,
    h1: 'Cytotoxic Waste Disposal',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Cytotoxic Waste Disposal',
      provider: { '@type': 'LocalBusiness', name: 'MediWaste', url: BASE_URL },
    },
    content: `
<p>Cytotoxic and cytostatic waste includes any material contaminated with chemotherapy drugs or other cancer treatment agents. This waste is highly hazardous and requires specialist handling, purple-coloured containers and high-temperature incineration. MediWaste provides licensed cytotoxic waste disposal for oncology clinics, hospitals and veterinary practices.</p>
<h2>Types of Cytotoxic Waste</h2>
<ul>
<li><strong>Chemotherapy administration equipment</strong> — IV bags, tubing, syringes and needles used to administer cytotoxic drugs</li>
<li><strong>Contaminated PPE</strong> — gloves, gowns, masks and aprons worn during chemotherapy handling</li>
<li><strong>Cytotoxic drug packaging</strong> — vials, ampoules and bottles that contained cytotoxic medicines</li>
<li><strong>Contaminated absorbent materials</strong> — spill kits, wipes and dressings used in chemotherapy areas</li>
<li><strong>Body waste from treated patients</strong> — subject to specific protocols</li>
</ul>
<h2>Regulatory Compliance</h2>
<p>Cytotoxic waste is classified as hazardous under the Hazardous Waste Regulations 2005. It must be segregated into purple-coloured containers with the cytotoxic hazard symbol and disposed of by high-temperature incineration. The <a href="https://www.gov.uk/government/publications/management-of-clinical-and-healthcare-waste" target="_blank" rel="noopener noreferrer">GOV.UK clinical waste management guidance</a> provides detailed requirements for cytotoxic waste handling.</p>
<h2>Benefits of Professional Cytotoxic Waste Disposal</h2>
<ul>
<li>Protects healthcare workers and the public from exposure to hazardous drugs</li>
<li>Ensures compliance with Environment Agency and HSE requirements</li>
<li>Provides full documentation for regulatory inspections</li>
<li>Reduces environmental impact through safe incineration</li>
</ul>
${PROCESS_STEPS}
${COMPLIANCE_BOX}
<h2>Related Services</h2>
<ul>
<li><a href="/waste-services/pharmaceutical-waste">Pharmaceutical waste disposal</a></li>
<li><a href="/waste-services/sharps-waste">Sharps waste disposal</a></li>
<li><a href="/waste-services">All clinical waste services</a></li>
</ul>
<p><a href="/quote">Request a free quote</a> or call 0800 046 9806.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/waste-services/dental-waste',
    title: 'Dental Waste Disposal UK | Amalgam Waste & Dental Clinical Waste Collection',
    description: 'Licensed dental waste disposal including amalgam, sharps and infectious dental materials. Mercury waste collection with compliant incineration. Free quote.',
    keywords: 'dental waste disposal, amalgam waste UK, dental clinical waste',
    canonical: `${BASE_URL}/waste-services/dental-waste`,
    h1: 'Dental Waste Disposal',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Dental Waste Disposal',
      provider: { '@type': 'LocalBusiness', name: 'MediWaste', url: BASE_URL },
    },
    content: `
<p>Dental practices generate a range of specialised waste streams that require licensed disposal. MediWaste provides comprehensive dental waste disposal services, including amalgam waste, sharps, infectious waste and X-ray chemicals, with full regulatory compliance.</p>
<h2>Types of Dental Waste</h2>
<ul>
<li><strong>Amalgam waste</strong> — amalgam capsules, extracted teeth with amalgam fillings and amalgam separator waste. Contains mercury and requires specialist recovery.</li>
<li><strong>Dental sharps</strong> — needles, scalpel blades, burs and endodontic files</li>
<li><strong>Infectious waste</strong> — contaminated gauze, cotton rolls and impression materials</li>
<li><strong>X-ray chemicals</strong> — developer and fixer solutions containing silver and other chemicals</li>
<li><strong>Pharmaceutical waste</strong> — expired local anaesthetics and other dental medicines</li>
<li><strong>PPE</strong> — contaminated gloves, masks and gowns</li>
</ul>
<h2>Regulations and Compliance</h2>
<p>Dental waste disposal is regulated under the Hazardous Waste Regulations 2005 and the <a href="https://www.gov.uk/government/publications/management-of-clinical-and-healthcare-waste" target="_blank" rel="noopener noreferrer">GOV.UK clinical waste management guidance</a>. Amalgam waste containing mercury is classified as hazardous and must be stored in specialised containers with mercury recovery. Dental practices must also comply with CQC requirements for waste management.</p>
<h2>Benefits of Professional Dental Waste Disposal</h2>
<ul>
<li>Ensures mercury is recovered safely, protecting the environment</li>
<li>Maintains CQC compliance for waste management inspections</li>
<li>Protects staff and patients from needlestick injuries and exposure</li>
<li>Provides full documentation for regulatory audits</li>
</ul>
${PROCESS_STEPS}
${COMPLIANCE_BOX}
<h2>Related Services</h2>
<ul>
<li><a href="/waste-services/sharps-waste">Sharps waste disposal</a></li>
<li><a href="/waste-services/infectious-waste">Infectious waste disposal</a></li>
<li><a href="/waste-services/pharmaceutical-waste">Pharmaceutical waste disposal</a></li>
<li><a href="/waste-services">All clinical waste services</a></li>
</ul>
<p><a href="/quote">Request a free quote</a> or call 0800 046 9806.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/waste-services/anatomical-waste',
    title: 'Anatomical Waste Disposal UK | Human Tissue & Pathology Waste Collection',
    description: 'Licensed anatomical waste disposal. Dignified collection and incineration of human tissue, organs and pathology waste. Fully compliant. Free quote.',
    keywords: 'anatomical waste disposal, human tissue waste, pathology waste UK',
    canonical: `${BASE_URL}/waste-services/anatomical-waste`,
    h1: 'Anatomical Waste Disposal',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Anatomical Waste Disposal',
      provider: { '@type': 'LocalBusiness', name: 'MediWaste', url: BASE_URL },
    },
    content: `
<p>Anatomical waste includes human tissue, organs, body parts and pathology specimens that require dignified, compliant disposal through high-temperature incineration. MediWaste provides licensed anatomical waste collection for hospitals, pathology laboratories, veterinary practices and research facilities.</p>
<h2>Types of Anatomical Waste</h2>
<ul>
<li><strong>Human tissue</strong> — surgical specimens, biopsy samples and excised tissue</li>
<li><strong>Organs and body parts</strong> — from surgical procedures and post-mortem examinations</li>
<li><strong>Pathology specimens</strong> — laboratory samples and cultures</li>
<li><strong>Placental tissue</strong> — from maternity units</li>
<li><strong>Animal tissue from research</strong> — from veterinary and laboratory settings</li>
</ul>
<h2>Legal Regulations and Compliance</h2>
<p>Anatomical waste is classified as hazardous under the Hazardous Waste Regulations 2005. It must be stored in red-coloured containers with the anatomical waste symbol and disposed of by high-temperature incineration. The <a href="https://www.gov.uk/government/publications/management-of-clinical-and-healthcare-waste" target="_blank" rel="noopener noreferrer">GOV.UK clinical waste management guidance</a> provides detailed requirements. Human tissue may also be subject to the Human Tissue Act 2004.</p>
<h2>Process of Disposal</h2>
<ol>
<li><strong>Free consultation</strong> — We assess your anatomical waste streams and provide appropriate red containers.</li>
<li><strong>Scheduled collection</strong> — Our licensed drivers collect waste in dedicated vehicles with refrigerated storage where required.</li>
<li><strong>Compliant incineration</strong> — Waste is transported to a licensed high-temperature incineration facility with full chain-of-custody documentation.</li>
</ol>
${COMPLIANCE_BOX}
<h2>Related Services</h2>
<ul>
<li><a href="/waste-services/infectious-waste">Infectious waste disposal</a></li>
<li><a href="/waste-services/pharmaceutical-waste">Pharmaceutical waste disposal</a></li>
<li><a href="/waste-services">All clinical waste services</a></li>
</ul>
<p><a href="/quote">Request a free quote</a> or call 0800 046 9806.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/faq',
    title: 'FAQ | Clinical Waste Disposal Questions | MediWaste',
    description: 'Find answers to frequently asked questions about clinical waste disposal, collection schedules, compliance requirements and pricing from MediWaste.',
    canonical: `${BASE_URL}/faq`,
    h1: 'Frequently Asked Questions',
    schema: FAQ_SCHEMA([
      ['How much does clinical waste collection cost?', 'Pricing depends on the volume and type of waste, collection frequency and your location. We offer free, no-obligation quotes tailored to your specific needs. Call us on 0800 046 9806 for a personalised price.'],
      ['What types of clinical waste do you collect?', 'We collect all categories of clinical waste including infectious waste, sharps, pharmaceutical waste, cytotoxic waste, dental waste and anatomical waste. See our full range of waste services for details.'],
      ['Are you registered with the Environment Agency?', 'Yes, MediWaste is a registered upper tier waste carrier with the Environment Agency. We are audited annually and hold all required licences for clinical and hazardous waste transport.'],
      ['How quickly can you start collections?', 'We can usually begin collections within 7 days of your initial enquiry. In urgent cases, we may be able to arrange a first collection sooner.'],
      ['Do you supply containers?', 'Yes, all sharps bins, yellow bags, orange bags and rigid containers are supplied free of charge as part of your service agreement.'],
      ['How often do you collect?', 'We offer flexible collection schedules including weekly, fortnightly, monthly and ad-hoc collections. We will recommend the best frequency based on your waste volume.'],
      ['What documentation do you provide?', 'We provide waste transfer notes or hazardous waste consignment notes for every collection, issued within 48 hours. Records are maintained for the statutory minimum of two years.'],
      ['What areas do you cover?', 'We cover London, Kent, Essex, Surrey, Sussex and Hampshire. See our service coverage page for a full list of areas.'],
    ]),
    content: `
<p>Here are answers to the most common questions we receive about clinical waste collection and disposal. If you have a question that is not covered here, please <a href="/contact">contact us</a> or call 0800 046 9806.</p>
<h2>Pricing and Quotes</h2>
<h3>How much does clinical waste collection cost?</h3>
<p>Pricing depends on the volume and type of waste, collection frequency and your location. We offer free, no-obligation quotes tailored to your specific needs. <a href="/quote">Request a quote online</a> or call us on 0800 046 9806.</p>
<h3>Are there any hidden fees?</h3>
<p>No. Our pricing is transparent and includes all containers, collection, disposal and documentation. There are no hidden charges.</p>
<h2>Services</h2>
<h3>What types of clinical waste do you collect?</h3>
<p>We collect all categories of clinical waste including infectious waste, sharps, pharmaceutical waste, cytotoxic waste, dental waste and anatomical waste. See our <a href="/waste-services">waste services page</a> for details.</p>
<h3>Do you supply containers?</h3>
<p>Yes, all sharps bins, yellow bags, orange bags and rigid containers are supplied free of charge as part of your service agreement.</p>
<h3>How often do you collect?</h3>
<p>We offer flexible collection schedules including weekly, fortnightly, monthly and ad-hoc collections. We will recommend the best frequency based on your waste volume.</p>
<h2>Compliance</h2>
<h3>Are you registered with the Environment Agency?</h3>
<p>Yes, MediWaste is a registered upper tier waste carrier with the Environment Agency. We are audited annually and hold all required licences.</p>
<h3>What documentation do you provide?</h3>
<p>We provide waste transfer notes or hazardous waste consignment notes for every collection, issued within 48 hours. Records are maintained for the statutory minimum of two years.</p>
<h2>Getting Started</h2>
<h3>How quickly can you start collections?</h3>
<p>We can usually begin collections within 7 days of your initial enquiry. In urgent cases, we may be able to arrange a first collection sooner.</p>
<h3>What areas do you cover?</h3>
<p>We cover London, Kent, Essex, Surrey, Sussex and Hampshire. See our <a href="/service-coverage">service coverage page</a> for a full list of areas.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/contact',
    title: 'Contact MediWaste | Get a Free Waste Disposal Quote',
    description: 'Contact MediWaste for a free clinical waste disposal quote. Call us on 0800 046 9806 or fill in our online form. Serving London, Kent, Essex, Surrey and Sussex.',
    canonical: `${BASE_URL}/contact`,
    h1: 'Contact MediWaste',
    schema: [LOCAL_BUSINESS_SCHEMA, {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact MediWaste',
      url: `${BASE_URL}/contact`,
    }],
    content: `
<p>Get in touch with MediWaste for a free, no-obligation quote for clinical waste collection. Our team is ready to help you find the right waste management solution for your healthcare facility.</p>
<h2>Phone</h2>
<ul>
<li><strong>Freephone:</strong> 0800 046 9806 — for quotes and general enquiries</li>
<li><strong>Local office:</strong> 01322 879 713</li>
<li><strong>Email:</strong> hello@mediwaste.co.uk</li>
</ul>
<h2>Online Quote</h2>
<p>The fastest way to get a tailored quote is to use our <a href="/quote">online quote form</a>. Simply tell us about your waste streams and collection requirements, and we will send you a personalised quote within one business day.</p>
<h2>Areas We Serve</h2>
<p>We provide clinical waste collection across London and the South East:</p>
<ul>
<li><a href="/service-areas/london">London</a> — all 32 boroughs</li>
<li><a href="/service-areas/kent">Kent</a> — Maidstone, Canterbury, Dartford, Medway</li>
<li><a href="/service-areas/essex">Essex</a> — Chelmsford, Colchester, Basildon</li>
<li><a href="/service-areas/surrey">Surrey</a> — Guildford, Woking, Reigate, Epsom</li>
<li><a href="/service-areas/sussex">Sussex</a> — Brighton, Crawley, Worthing</li>
<li><a href="/service-areas/hampshire">Hampshire</a> — Southampton, Portsmouth, Basingstoke</li>
</ul>
<h2>Our Services</h2>
<p>We collect all types of clinical waste including <a href="/waste-services/infectious-waste">infectious waste</a>, <a href="/waste-services/sharps-waste">sharps</a>, <a href="/waste-services/pharmaceutical-waste">pharmaceutical waste</a>, <a href="/waste-services/cytotoxic-waste">cytotoxic waste</a>, <a href="/waste-services/dental-waste">dental waste</a> and <a href="/waste-services/anatomical-waste">anatomical waste</a>. See our full range of <a href="/waste-services">waste services</a>.</p>
<h2>Frequently Asked Questions</h2>
<h3>How quickly can you start collections?</h3>
<p>We can usually begin collections within 7 days of your enquiry.</p>
<h3>Do you supply containers?</h3>
<p>Yes, all containers are supplied free of charge.</p>
<h3>Are you Environment Agency registered?</h3>
<p>Yes, we are a registered upper tier waste carrier. See our <a href="/compliance">compliance page</a> for details.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/quote',
    title: 'Get a Free Quote — Clinical Waste Disposal | MediWaste',
    description: 'Request a free clinical waste disposal quote. Fast response, competitive pricing and compliant waste management for your healthcare facility. Call 0800 046 9806.',
    canonical: `${BASE_URL}/quote`,
    h1: 'Get a Free Quote',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Clinical Waste Disposal Quote',
      provider: { '@type': 'LocalBusiness', name: 'MediWaste', url: BASE_URL, telephone: '0800 046 9806' },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP', description: 'Free no-obligation quote' },
    },
    content: `
<p>Request a free, no-obligation quote for clinical waste collection. Tell us about your waste streams and collection requirements, and we will send you a personalised quote within one business day. Alternatively, call us on 0800 046 9806.</p>
<h2>Types of Clinical Waste We Collect</h2>
<ul>
<li><a href="/waste-services/infectious-waste">Infectious waste</a> — contaminated dressings, swabs, PPE</li>
<li><a href="/waste-services/sharps-waste">Sharps waste</a> — needles, syringes, lancets, scalpels</li>
<li><a href="/waste-services/pharmaceutical-waste">Pharmaceutical waste</a> — expired medicines, controlled drugs</li>
<li><a href="/waste-services/cytotoxic-waste">Cytotoxic waste</a> — chemotherapy and cytostatic waste</li>
<li><a href="/waste-services/dental-waste">Dental waste</a> — amalgam, dental sharps, impression materials</li>
<li><a href="/waste-services/anatomical-waste">Anatomical waste</a> — human tissue, pathology specimens</li>
</ul>
<h2>Compliance and Regulations</h2>
<p>All clinical waste disposal is governed by the Hazardous Waste Regulations 2005 and the <a href="https://www.gov.uk/government/publications/management-of-clinical-and-healthcare-waste" target="_blank" rel="noopener noreferrer">GOV.UK clinical waste management guidance</a>. MediWaste ensures full compliance with all regulations. See our <a href="/compliance">compliance page</a> for more information.</p>
${PROCESS_STEPS}
${COMPLIANCE_BOX}
<h2>What to Expect</h2>
<ul>
<li><strong>Free consultation</strong> — We assess your waste streams and recommend the right containers and schedule.</li>
<li><strong>Transparent pricing</strong> — No hidden fees. All containers, collection and documentation included.</li>
<li><strong>7-day startup</strong> — We can usually begin collections within a week.</li>
<li><strong>Flexible scheduling</strong> — Weekly, fortnightly, monthly or ad-hoc collections.</li>
</ul>
<h2>Client Testimonials</h2>
<p>"MediWaste provided a competitive quote and started collections within 5 days. Excellent service." — Care Home, Surrey</p>
<p>"The quote process was straightforward and the pricing was transparent. Highly recommended." — Aesthetic Clinic, London</p>
<p>Ready to get started? Fill in the form above or call <a href="/contact">0800 046 9806</a>.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/news',
    title: 'News & Updates | MediWaste Clinical Waste Disposal',
    description: 'Stay updated with the latest news, regulations, and insights on clinical waste management from MediWaste. Expert guidance for healthcare facilities.',
    canonical: `${BASE_URL}/news`,
    h1: 'News & Updates',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'MediWaste News',
      url: `${BASE_URL}/news`,
      publisher: { '@type': 'Organization', name: 'MediWaste', url: BASE_URL },
    },
    content: `
<p>Stay up to date with the latest news, regulations and insights on clinical waste management. Our articles provide expert guidance for healthcare facilities, covering regulatory changes, best practices and industry updates.</p>
<h2>Recent Regulations</h2>
<p>The clinical waste management landscape is constantly evolving. Key regulatory developments include updates to the Hazardous Waste Regulations, changes to Environment Agency guidance and new CQC inspection criteria. We monitor these changes and provide clear, practical guidance on what they mean for your facility.</p>
<h2>Best Practices</h2>
<p>Proper waste segregation is essential for compliance. Our articles cover best practices for segregating infectious waste, sharps, pharmaceutical waste and other clinical waste streams. We also cover topics such as reducing waste volumes, improving documentation and preparing for inspections.</p>
<h2>Industry Insights</h2>
<p>From the environmental impact of clinical waste disposal to the latest innovations in waste treatment technology, we provide insights to help healthcare facilities make informed decisions about their waste management.</p>
<h2>Useful Resources</h2>
<ul>
<li><a href="https://www.gov.uk/government/publications/management-of-clinical-and-healthcare-waste" target="_blank" rel="noopener noreferrer">GOV.UK: Management of clinical and healthcare waste guidance</a></li>
<li><a href="https://www.hse.gov.uk/biologicalagents/" target="_blank" rel="noopener noreferrer">HSE: Biological agents guidance</a></li>
<li><a href="https://www.nhs.uk/conditions/clinical-waste/" target="_blank" rel="noopener noreferrer">NHS: Clinical waste disposal</a></li>
</ul>
<p>Looking for a specific topic? <a href="/contact">Contact us</a> with your questions or browse our <a href="/faq">FAQ page</a>.</p>
`,
  },
  {
    path: '/compliance',
    title: 'Clinical Waste Compliance | Regulations & Certificates | MediWaste',
    description: 'Understand your Duty of Care obligations for clinical waste. MediWaste provides waste disposal certificates, hazardous waste consignment notes, and ensures full regulatory compliance.',
    canonical: `${BASE_URL}/compliance`,
    h1: 'Clinical Waste Compliance',
    schema: [LOCAL_BUSINESS_SCHEMA, FAQ_SCHEMA([
      ['What is the Duty of Care for clinical waste?', 'Under the Environmental Protection Act 1990, anyone who produces, carries or disposes of clinical waste has a Duty of Care to ensure it is handled safely and legally. This includes segregating waste correctly, using licensed carriers and keeping documentation.'],
      ['What documentation do I need for clinical waste disposal?', 'You need waste transfer notes for non-hazardous waste and hazardous waste consignment notes for hazardous waste. These must be retained for at least two years.'],
      ['How often is MediWaste audited?', 'MediWaste is audited annually by the Environment Agency and holds a registered upper tier waste carrier licence.'],
    ])],
    content: `
<p>Clinical waste compliance is a legal requirement for all healthcare providers. Under the Environmental Protection Act 1990 and the Hazardous Waste Regulations 2005, anyone who produces, carries or disposes of clinical waste has a Duty of Care to ensure it is handled safely and legally. MediWaste helps you meet these obligations with fully documented, compliant waste collection and disposal.</p>
<h2>Key Regulations</h2>
<ul>
<li><strong>Environmental Protection Act 1990</strong> — establishes the Duty of Care for waste producers</li>
<li><strong>Hazardous Waste Regulations 2005</strong> — governs the disposal of hazardous clinical waste</li>
<li><strong>Health and Safety (Sharp Instruments in Healthcare) Regulations 2013</strong> — requires safe sharps disposal</li>
<li><strong>GOV.UK clinical waste management guidance</strong> — provides detailed segregation and disposal requirements</li>
</ul>
<p>For the full guidance, see the <a href="https://www.gov.uk/government/publications/management-of-clinical-and-healthcare-waste" target="_blank" rel="noopener noreferrer">GOV.UK clinical waste management page</a>.</p>
<h2>Documentation We Provide</h2>
<ul>
<li><strong>Waste transfer notes</strong> — for every collection of non-hazardous clinical waste</li>
<li><strong>Hazardous waste consignment notes</strong> — for hazardous waste including sharps, pharmaceutical and cytotoxic waste</li>
<li><strong>Certificates of disposal</strong> — confirming compliant incineration or treatment</li>
<li><strong>Waste audit reports</strong> — available on request for CQC inspections</li>
</ul>
<p>All documentation is issued within 48 hours of collection and retained for the statutory minimum of two years.</p>
${COMPLIANCE_BOX}
<h2>Our Compliance Process</h2>
<ol>
<li><strong>Free consultation</strong> — We assess your waste streams and ensure you have the correct segregation and containers.</li>
<li><strong>Scheduled collection</strong> — Our licensed drivers collect waste and issue waste transfer notes on every visit.</li>
<li><strong>Documentation</strong> — All consignment notes and certificates are provided within 48 hours.</li>
<li><strong>Audit support</strong> — We provide waste audit reports and documentation for CQC and Environment Agency inspections.</li>
</ol>
<h2>Frequently Asked Questions</h2>
<h3>What is the Duty of Care for clinical waste?</h3>
<p>Under the Environmental Protection Act 1990, anyone who produces, carries or disposes of clinical waste has a Duty of Care to ensure it is handled safely and legally. This includes segregating waste correctly, using licensed carriers and keeping documentation.</p>
<h3>What documentation do I need?</h3>
<p>You need waste transfer notes for non-hazardous waste and hazardous waste consignment notes for hazardous waste. These must be retained for at least two years.</p>
<h3>How often is MediWaste audited?</h3>
<p>MediWaste is audited annually by the Environment Agency and holds a registered upper tier waste carrier licence.</p>
<p><a href="/quote">Request a free quote</a> or call 0800 046 9806 to discuss your compliance requirements.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/service-coverage',
    title: 'Service Coverage Areas | Clinical Waste Disposal UK | MediWaste',
    description: 'Professional clinical waste collection and disposal services across the UK. Licensed medical waste management for London, Kent, Surrey, Sussex, Hampshire, and Essex.',
    canonical: `${BASE_URL}/service-coverage`,
    h1: 'Service Coverage Areas',
    schema: LOCAL_BUSINESS_SCHEMA,
    content: `
<p>MediWaste provides licensed clinical waste collection and disposal services across London and the South East. We serve GP surgeries, dental practices, care homes, aesthetic clinics and beauty salons in the following areas:</p>
<h2>Areas We Cover</h2>
<ul>
<li><a href="/service-areas/london">London</a> — all 32 London boroughs and the City of London</li>
<li><a href="/service-areas/kent">Kent</a> — Maidstone, Canterbury, Dartford, Medway, Tunbridge Wells, Tonbridge</li>
<li><a href="/service-areas/essex">Essex</a> — Chelmsford, Colchester, Basildon, Romford, Harlow</li>
<li><a href="/service-areas/surrey">Surrey</a> — Guildford, Woking, Reigate, Epsom, Camberley</li>
<li><a href="/service-areas/sussex">Sussex</a> — Brighton, Crawley, Worthing, Eastbourne, Hastings</li>
<li><a href="/service-areas/hampshire">Hampshire</a> — Southampton, Portsmouth, Basingstoke, Winchester, Farnborough</li>
</ul>
<h2>Our Services</h2>
<p>We collect all types of clinical waste including <a href="/waste-services/infectious-waste">infectious waste</a>, <a href="/waste-services/sharps-waste">sharps</a>, <a href="/waste-services/pharmaceutical-waste">pharmaceutical waste</a>, <a href="/waste-services/cytotoxic-waste">cytotoxic waste</a>, <a href="/waste-services/dental-waste">dental waste</a> and <a href="/waste-services/anatomical-waste">anatomical waste</a>. See our full range of <a href="/waste-services">waste services</a>.</p>
${PROCESS_STEPS}
${COMPLIANCE_BOX}
<h2>Can We Start in Your Area?</h2>
<p>We can usually begin collections within 7 days of your enquiry. <a href="/quote">Request a free quote</a> or call 0800 046 9806 to find out if we cover your area.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/audit',
    title: 'Free Clinical Waste Audit Tool | MediWaste',
    description: 'Answer 15 questions about your waste streams. Our AI generates a free, personalised clinical waste audit report — identifying risks and giving you a prioritised action plan.',
    canonical: `${BASE_URL}/audit`,
    h1: 'Free Clinical Waste Audit Tool',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'MediWaste Clinical Waste Audit Tool',
      url: `${BASE_URL}/audit`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
    },
    content: `
<p>Our free clinical waste audit tool helps healthcare facilities assess their waste management practices. Answer 15 questions about your waste streams, and our AI generates a personalised audit report identifying risks, compliance gaps and a prioritised action plan.</p>
<h2>How the Audit Works</h2>
<ol>
<li><strong>Answer 15 questions</strong> — The questionnaire covers waste segregation, collection frequency, documentation, staff training and regulatory compliance.</li>
<li><strong>AI-generated report</strong> — Our AI analyses your responses and generates a detailed report with risk scores, compliance gaps and recommendations.</li>
<li><strong>Prioritised action plan</strong> — The report includes a step-by-step action plan to address any identified issues, prioritised by risk level.</li>
<li><strong>Free download</strong> — Your audit report is available to download immediately as a PDF.</li>
</ol>
<h2>What the Audit Covers</h2>
<ul>
<li>Waste segregation practices — are you using the correct colour-coded containers?</li>
<li>Collection frequency — is your waste being collected often enough?</li>
<li>Documentation — do you have waste transfer notes and consignment notes for all collections?</li>
<li>Staff training — are your staff trained in safe waste handling?</li>
<li>Regulatory compliance — are you meeting your Duty of Care obligations?</li>
<li>Environmental impact — are you minimising waste and disposing of it responsibly?</li>
</ul>
<h2>Benefits of the Audit</h2>
<ul>
<li>Identifies compliance gaps before they become regulatory issues</li>
<li>Provides a clear, prioritised action plan</li>
<li>Helps prepare for CQC and Environment Agency inspections</li>
<li>Completely free, with no obligation</li>
</ul>
<h2>Frequently Asked Questions</h2>
<h3>Is the audit really free?</h3>
<p>Yes, the clinical waste audit tool is completely free to use. There is no obligation to use our services after completing the audit.</p>
<h3>How long does the audit take?</h3>
<p>The questionnaire takes approximately 10-15 minutes to complete. Your personalised report is generated immediately after submission.</p>
<h3>What do I do with the results?</h3>
<p>The report includes a prioritised action plan. You can use this to improve your waste management practices, or contact us for help implementing the recommendations. <a href="/contact">Get in touch</a> or call 0800 046 9806.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/directory-listings',
    title: 'Clinical Waste Business Directory | MediWaste',
    description: 'Directory of healthcare businesses and clinical waste service providers across the UK served by MediWaste.',
    canonical: `${BASE_URL}/directory-listings`,
    h1: 'Clinical Waste Business Directory',
    schema: LOCAL_BUSINESS_SCHEMA,
    content: `
<p>Our clinical waste business directory lists healthcare businesses and clinical waste service providers across the UK that are served by MediWaste. Find local providers in your area and learn about the waste management services available to you.</p>
<h2>How to Use This Directory</h2>
<p>Browse the directory to find healthcare businesses and waste service providers in your area. Each listing includes the business name, location, services offered and contact information. If you would like to be added to the directory, please <a href="/contact">contact us</a>.</p>
<h2>Types of Businesses Listed</h2>
<ul>
<li><strong>GP surgeries and medical centres</strong> — primary care providers requiring infectious waste and sharps collection</li>
<li><strong>Dental practices</strong> — dental clinics requiring amalgam, sharps and infectious waste disposal</li>
<li><strong>Care homes and nursing homes</strong> — residential care facilities requiring incontinence waste and sharps collection</li>
<li><strong>Aesthetic clinics and beauty salons</strong> — aesthetic practitioners requiring sharps and clinical waste collection</li>
<li><strong>Veterinary practices</strong> — veterinary clinics requiring clinical waste, sharps and pharmaceutical waste disposal</li>
<li><strong>Pharmacies</strong> — pharmacies requiring pharmaceutical waste and controlled drug disposal</li>
</ul>
<h2>Our Waste Services</h2>
<p>We provide licensed collection of all clinical waste streams. See our <a href="/waste-services">waste services page</a> for details, or <a href="/quote">request a free quote</a>.</p>
${COMPLIANCE_BOX}
<p>For more information about our services, call 0800 046 9806 or <a href="/contact">contact us online</a>.</p>
${EXTERNAL_LINKS}
`,
  },
  {
    path: '/terms',
    title: 'Terms of Service | MediWaste',
    description: 'Terms and conditions for using MediWaste clinical waste disposal services. Read our service agreements and policies.',
    canonical: `${BASE_URL}/terms`,
    noindex: true,
    h1: 'Terms of Service',
    content: `
<p>These terms and conditions govern the use of MediWaste clinical waste disposal services. By engaging our services, you agree to the following terms.</p>
<h2>Service Agreement</h2>
<p>MediWaste provides licensed clinical waste collection and disposal services to healthcare facilities across London and the South East. A service agreement will be established between MediWaste and the client detailing collection frequency, waste types, container provision and pricing.</p>
<h2>Client Responsibilities</h2>
<ul>
<li>Ensure all waste is correctly segregated according to current regulations</li>
<li>Use the containers provided by MediWaste for the correct waste streams</li>
<li>Store waste securely between collections</li>
<li>Provide accurate information about waste volumes and types</li>
<li>Allow access for scheduled collections</li>
</ul>
<h2>MediWaste Responsibilities</h2>
<ul>
<li>Provide all required containers free of charge</li>
<li>Collect waste on the agreed schedule</li>
<li>Provide waste transfer notes and consignment notes within 48 hours</li>
<li>Ensure all waste is disposed of in compliance with UK regulations</li>
<li>Maintain records for the statutory minimum period</li>
</ul>
<h2>Cancellation</h2>
<p>Either party may terminate the service agreement with 30 days written notice. Outstanding collection fees must be settled before termination is completed.</p>
<h2>Liability</h2>
<p>MediWaste accepts liability for waste once it has been collected and signed for by our licensed drivers. The client remains responsible for correct segregation and storage of waste prior to collection.</p>
<h2>Pricing and Payment</h2>
<p>Pricing is agreed in the service agreement and is inclusive of containers, collection, disposal and documentation. Invoices are issued monthly and are payable within 30 days.</p>
<h2>Contact</h2>
<p>For questions about these terms, please <a href="/contact">contact us</a> or call 0800 046 9806.</p>
`,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | MediWaste',
    description: 'Privacy policy for MediWaste. Learn how we collect, use, and protect your personal data in accordance with UK GDPR.',
    canonical: `${BASE_URL}/privacy`,
    noindex: true,
    h1: 'Privacy Policy',
    content: `
<p>This privacy policy explains how MediWaste collects, uses and protects your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</p>
<h2>Data We Collect</h2>
<ul>
<li><strong>Contact information</strong> — name, business name, address, phone number and email address provided via our contact or quote forms</li>
<li><strong>Service information</strong> — waste types, collection schedule and billing information</li>
<li><strong>Website data</strong> — IP address, browser type and pages visited, collected via cookies (see our <a href="/cookies">cookie policy</a>)</li>
</ul>
<h2>How We Use Your Data</h2>
<ul>
<li>To provide clinical waste collection and disposal services</li>
<li>To respond to enquiries and provide quotes</li>
<li>To issue invoices and process payments</li>
<li>To provide waste transfer notes and compliance documentation</li>
<li>To send service updates and regulatory information</li>
</ul>
<h2>Your Rights Under UK GDPR</h2>
<ul>
<li><strong>Right of access</strong> — you can request a copy of the personal data we hold about you</li>
<li><strong>Right to rectification</strong> — you can ask us to correct inaccurate data</li>
<li><strong>Right to erasure</strong> — you can ask us to delete your data where legally permissible</li>
<li><strong>Right to restrict processing</strong> — you can ask us to limit how we use your data</li>
<li><strong>Right to data portability</strong> — you can request your data in a portable format</li>
<li><strong>Right to object</strong> — you can object to certain types of processing</li>
</ul>
<h2>Data Security</h2>
<p>We implement appropriate technical and organisational measures to protect your personal data, including secure storage, access controls and regular security reviews. Data is only retained for as long as necessary to fulfil the purposes for which it was collected, or as required by law.</p>
<h2>Contact</h2>
<p>To exercise your rights or for any privacy-related questions, please <a href="/contact">contact us</a> or call 0800 046 9806.</p>
`,
  },
  {
    path: '/cookies',
    title: 'Cookie Policy | MediWaste',
    description: 'Cookie policy for MediWaste. Learn about how we use cookies on our website and your options for managing them.',
    canonical: `${BASE_URL}/cookies`,
    noindex: true,
    h1: 'Cookie Policy',
    content: `
<p>This cookie policy explains how MediWaste uses cookies on our website and how you can manage them. Cookies are small text files stored on your device when you visit a website.</p>
<h2>Types of Cookies We Use</h2>
<ul>
<li><strong>Essential cookies</strong> — required for the website to function correctly, including session management and security</li>
<li><strong>Analytics cookies</strong> — help us understand how visitors use our website so we can improve it</li>
<li><strong>Preference cookies</strong> — remember your settings such as cookie consent choices</li>
</ul>
<h2>Session Cookies</h2>
<p>Session cookies are temporary and are deleted when you close your browser. They allow the website to function correctly during your visit.</p>
<h2>Persistent Cookies</h2>
<p>Persistent cookies remain on your device after you close your browser. They are used to remember your preferences, such as your cookie consent choice, for future visits.</p>
<h2>Managing Cookies</h2>
<p>You can control and delete cookies through your browser settings. Most browsers allow you to refuse cookies or alert you when cookies are being sent. See your browser help for instructions:</p>
<ul>
<li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome cookie settings</a></li>
<li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer">Mozilla Firefox cookie settings</a></li>
<li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Apple Safari cookie settings</a></li>
</ul>
<h2>GDPR and ePrivacy Compliance</h2>
<p>Under the UK GDPR and the ePrivacy Directive, we require your consent to set non-essential cookies. Our cookie consent banner allows you to accept or reject non-essential cookies. You can change your preference at any time.</p>
<h2>Contact</h2>
<p>For questions about our use of cookies, please <a href="/contact">contact us</a> or call 0800 046 9806.</p>
`,
  },
  // ── County-level service area pages ─────────────────────────────────────────
  ...[
    { slug: 'london', name: 'London', towns: 'all 32 London boroughs and the City of London', keywords: 'clinical waste disposal London, medical waste collection London' },
    { slug: 'kent', name: 'Kent', towns: 'Maidstone, Canterbury, Dartford, Medway, Tunbridge Wells and Tonbridge', keywords: 'clinical waste disposal Kent, medical waste collection Kent' },
    { slug: 'essex', name: 'Essex', towns: 'Chelmsford, Colchester, Basildon, Romford and Harlow', keywords: 'clinical waste disposal Essex, medical waste collection Essex' },
    { slug: 'surrey', name: 'Surrey', towns: 'Guildford, Woking, Reigate, Epsom and Camberley', keywords: 'clinical waste disposal Surrey, medical waste collection Surrey' },
    { slug: 'sussex', name: 'Sussex', towns: 'Brighton, Crawley, Worthing, Eastbourne and Hastings', keywords: 'clinical waste disposal Sussex, medical waste collection Sussex' },
    { slug: 'hampshire', name: 'Hampshire', towns: 'Southampton, Portsmouth, Basingstoke, Winchester and Farnborough', keywords: 'clinical waste disposal Hampshire, medical waste collection Hampshire' },
  ].map((area) => ({
    path: `/service-areas/${area.slug}`,
    title: `Clinical Waste Disposal ${area.name} | Licensed Collection Service | MediWaste`,
    description: `Licensed clinical waste collection across ${area.name}. Serving ${area.towns}. Fully compliant, free quote available. Call 0800 046 9806.`,
    keywords: area.keywords,
    canonical: `${BASE_URL}/service-areas/${area.slug}`,
    h1: `Clinical Waste Disposal ${area.name}`,
    schema: [LOCAL_BUSINESS_SCHEMA, FAQ_SCHEMA([
      [`How much does clinical waste collection cost in ${area.name}?`, `Pricing depends on waste volume, type and collection frequency. We offer free, no-obligation quotes. Call 0800 046 9806 for a tailored price.`],
      [`What types of clinical waste do you collect in ${area.name}?`, `We collect infectious waste, sharps, pharmaceutical waste, cytotoxic waste, dental waste and anatomical waste across ${area.name}.`],
      [`Are you registered with the Environment Agency?`, `Yes, MediWaste is a registered upper tier waste carrier with the Environment Agency, audited annually.`],
      [`How quickly can you start collections in ${area.name}?`, `We can usually begin collections within 7 days of your enquiry.`],
    ])],
    content: `
<p>MediWaste provides licensed clinical waste collection and disposal services across ${area.name}, serving ${area.towns}. We are a registered upper tier waste carrier with the Environment Agency, ensuring your waste is handled safely, legally and responsibly.</p>
<h2>Our Services in ${area.name}</h2>
<p>We collect all types of clinical waste for healthcare facilities in ${area.name}:</p>
<ul>
<li><a href="/waste-services/infectious-waste">Infectious waste collection</a> — contaminated dressings, swabs and PPE</li>
<li><a href="/waste-services/sharps-waste">Sharps disposal</a> — needles, syringes and medical sharps</li>
<li><a href="/waste-services/pharmaceutical-waste">Pharmaceutical waste disposal</a> — expired medicines and controlled drugs</li>
<li><a href="/waste-services/cytotoxic-waste">Cytotoxic waste disposal</a> — chemotherapy and cytostatic waste</li>
<li><a href="/waste-services/dental-waste">Dental waste disposal</a> — amalgam and dental sharps</li>
<li><a href="/waste-services/anatomical-waste">Anatomical waste disposal</a> — human tissue and pathology waste</li>
</ul>
<h2>Who We Serve in ${area.name}</h2>
<ul>
<li>GP surgeries and medical centres</li>
<li>Dental practices</li>
<li>Care homes and nursing homes</li>
<li>Aesthetic clinics and beauty salons</li>
<li>Veterinary practices</li>
<li>Pharmacies</li>
</ul>
${PROCESS_STEPS}
${COMPLIANCE_BOX}
<h2>Frequently Asked Questions</h2>
<h3>How much does clinical waste collection cost in ${area.name}?</h3>
<p>Pricing depends on waste volume, type and collection frequency. We offer free, no-obligation quotes. Call 0800 046 9806 for a tailored price.</p>
<h3>What types of clinical waste do you collect in ${area.name}?</h3>
<p>We collect infectious waste, sharps, pharmaceutical waste, cytotoxic waste, dental waste and anatomical waste across ${area.name}.</p>
<h3>Are you registered with the Environment Agency?</h3>
<p>Yes, MediWaste is a registered upper tier waste carrier with the Environment Agency, audited annually.</p>
<h3>How quickly can you start collections in ${area.name}?</h3>
<p>We can usually begin collections within 7 days of your enquiry. <a href="/quote">Request a free quote</a> or call 0800 046 9806.</p>
${EXTERNAL_LINKS}
`,
  })),
];

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n[prerender] Starting…');

  if (!fs.existsSync(DIST)) {
    console.error('[prerender] dist/ not found — run vite build first');
    process.exit(1);
  }

  const env = loadEnv();
  const SUPABASE_URL = env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

  const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');
  let count = 0;

  // ── Static routes ──────────────────────────────────────────────────────────
  console.log(`[prerender] Writing ${STATIC_ROUTES.length} static routes…`);
  for (const route of STATIC_ROUTES) {
    writeRoute(route.path, buildHtml(template, route));
    count++;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[prerender] No Supabase credentials — skipping dynamic routes');
    console.log(`[prerender] Done. ${count} routes written.\n`);
    return;
  }

  // ── SEO location pages (/c/:slug) ─────────────────────────────────────────
  console.log('[prerender] Fetching SEO pages from Supabase…');
  try {
    const pages = await supabaseFetch(SUPABASE_URL, SUPABASE_ANON_KEY, 'seo_pages', {
      status: 'eq.published',
      select: 'url_slug,meta_title,meta_description,meta_keywords,h1,og_image,canonical_url,target_keyword,content,location,published_at,updated_at',
    });

    console.log(`[prerender]   ${pages.length} SEO pages`);

    // Collect slugs/titles so we can inject internal links into the
    // service-coverage page (fixes ahrefs "orphan pages" issue).
    const seoLocationLinks = pages.map((page) => {
      const title = page.meta_title || page.h1 || page.target_keyword || page.url_slug;
      return `<a href="/c/${page.url_slug}">${esc(title.replace(/\s*\|\s*MediWaste.*$/i, ''))}</a>`;
    });
    const locationLinksHtml = seoLocationLinks.length
      ? `<section><h2>Clinical Waste Collection Locations</h2><p>Find clinical waste collection services in your area. We serve towns and cities across London and the South East.</p><div>${seoLocationLinks.join(' ')}</div></section>`
      : '';

    for (const page of pages) {
      const canonical = withTrailingSlash(page.canonical_url || `${BASE_URL}/c/${page.url_slug}`);
      const title = page.meta_title || page.h1 || page.target_keyword;
      const description =
        page.meta_description ||
        `Professional ${page.target_keyword} services from MediWaste. Fully licensed, compliant clinical waste disposal.`;

      const schema = [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: page.h1 || title,
          description,
          url: canonical,
          publisher: { '@type': 'Organization', name: 'MediWaste', url: BASE_URL },
          datePublished: page.published_at,
          dateModified: page.updated_at || page.published_at,
          keywords: page.meta_keywords || page.target_keyword,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'MediWaste',
          url: BASE_URL,
          telephone: '0800 046 9806',
          description: `Clinical waste collection and disposal services${page.location ? ` in ${page.location}` : ''}`,
          areaServed: page.location || 'United Kingdom',
        },
      ];

      writeRoute(`/c/${page.url_slug}`, buildHtml(template, {
        title,
        description,
        keywords: page.meta_keywords || page.target_keyword,
        canonical,
        ogImage: page.og_image || DEFAULT_OG_IMAGE,
        schema,
        type: 'article',
        h1: page.h1 || title,
        content: page.content,
      }));
      count++;
    }

    // Re-write the service-coverage page with internal links to all SEO
    // location pages so crawlers can discover them via internal links,
    // not just the sitemap.
    if (locationLinksHtml) {
      writeRoute('/service-coverage', buildHtml(template, {
        title: 'Service Coverage Areas | Clinical Waste Disposal UK | MediWaste',
        description: 'Professional clinical waste collection and disposal services across the UK. Licensed medical waste management for London, Kent, Surrey, Sussex, Hampshire, and Essex.',
        canonical: `${BASE_URL}/service-coverage`,
        h1: 'Service Coverage Areas',
        content: locationLinksHtml,
      }));
    }
  } catch (err) {
    console.warn(`[prerender]   ⚠ SEO pages fetch failed: ${err.message}`);
  }

  // ── News articles (/news/:slug) ────────────────────────────────────────────
  console.log('[prerender] Fetching news articles from Supabase…');
  try {
    const articles = await supabaseFetch(SUPABASE_URL, SUPABASE_ANON_KEY, 'news_articles', {
      status: 'eq.published',
      select: 'slug,title,excerpt,seo_title,seo_description,seo_keywords,og_image,featured_image,content,published_at,updated_at',
    });

    console.log(`[prerender]   ${articles.length} news articles`);
    for (const article of articles) {
      const canonical = withTrailingSlash(`${BASE_URL}/news/${article.slug}`);
      const title = article.seo_title || article.title;
      const description = article.seo_description || article.excerpt;
      const keywords = Array.isArray(article.seo_keywords)
        ? article.seo_keywords.join(', ')
        : (article.seo_keywords || '');

      const schema = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.excerpt,
        image: {
          '@type': 'ImageObject',
          url: article.og_image || article.featured_image,
          width: 1200,
          height: 630,
        },
        datePublished: article.published_at,
        dateModified: article.updated_at || article.published_at,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        author: { '@type': 'Organization', name: 'MediWaste', url: BASE_URL },
        publisher: {
          '@type': 'Organization',
          name: 'MediWaste',
          url: BASE_URL,
          logo: { '@type': 'ImageObject', url: `${BASE_URL}/mediwaste-logo.png`, width: 200, height: 60 },
        },
      };

      writeRoute(`/news/${article.slug}`, buildHtml(template, {
        title,
        description,
        keywords,
        canonical,
        ogImage: article.og_image || article.featured_image || DEFAULT_OG_IMAGE,
        schema,
        type: 'article',
        h1: article.title,
        content: article.content,
      }));
      count++;
    }
  } catch (err) {
    console.warn(`[prerender]   ⚠ News articles fetch failed: ${err.message}`);
  }

  // ── SPA-only routes (no SEO content, just the app shell) ───────────────────
  // These routes need client-side JavaScript to function (auth, dynamic tokens,
  // interactive forms). We write a copy of the bare SPA shell with noindex so
  // crawlers skip them, and no _redirects catch-all is needed.
  console.log('[prerender] Writing SPA-only routes…');
  const spaShell = buildHtml(template, {
    title: 'MediWaste',
    canonical: withTrailingSlash(BASE_URL),
    noindex: true,
  });
  const SPA_ROUTES = [
    '/login',
    '/driver-upload',
    '/admin',
  ];
  for (const route of SPA_ROUTES) {
    writeRoute(route, spaShell);
    count++;
  }
  // Wildcard SPA routes — write a shell for each known pattern prefix
  // so Netlify has a static file to serve (no catch-all rewrite needed).
  const SPA_WILDCARD_PREFIXES = [
    '/admin/quote-requests',
    '/admin/quotes',
    '/admin/contact-enquiries',
    '/admin/settings',
    '/admin/news',
    '/admin/customers',
    '/admin/mailing-lists',
    '/admin/subscriptions',
    '/admin/jobs',
    '/admin/staff',
    '/admin/invoices',
    '/admin/waste-transfer-notes',
    '/admin/waste-carriers',
    '/admin/service-agreements',
    '/admin/email-inbox',
    '/admin/certificates',
    '/admin/notes',
    '/admin/backup',
    '/admin/resources',
    '/admin/collection-requests',
    '/admin/seo-pages',
    '/admin/directory-listings',
    '/admin/sitemap',
    '/admin/audits',
    '/staff/dashboard',
    '/customer/dashboard',
    '/news/category',
  ];
  for (const prefix of SPA_WILDCARD_PREFIXES) {
    writeRoute(prefix, spaShell);
    count++;
  }

  console.log(`[prerender] Done. ${count} routes written.\n`);
}

main().catch(err => {
  console.error('[prerender] Fatal error:', err);
  process.exit(1);
});
