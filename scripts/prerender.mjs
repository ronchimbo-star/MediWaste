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

  const metaLines = [
    `<title>${esc(title)}</title>`,
    desc       ? `    <meta name="description" content="${escAttr(desc)}" />`    : '',
    keywords   ? `    <meta name="keywords" content="${escAttr(keywords)}" />`   : '',
    `    <meta name="robots" content="${robots}" />`,
    `    <link rel="canonical" href="${escAttr(canonical)}" />`,
    `    <meta property="og:site_name" content="MediWaste" />`,
    `    <meta property="og:type" content="${type}" />`,
    `    <meta property="og:url" content="${escAttr(canonical)}" />`,
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

  return template
    // Remove the generic title added by vite build
    .replace(/<title>[^<]*<\/title>/, '')
    // Inject all meta tags before closing </head>
    .replace('</head>', `    ${metaLines}\n  </head>`)
    // Inject crawlable content inside <div id="root">
    .replace('<div id="root"></div>', `<div id="root">${rootInner}</div>`);
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

const STATIC_ROUTES = [
  {
    path: '/',
    title: 'Clinical Waste Collection London & South East | MediWaste',
    description: 'Fully compliant clinical waste disposal for GP surgeries, dental practices, and care homes across London and the South East. Registered waste carrier. Free compliance audit available.',
    keywords: 'clinical waste collection, medical waste disposal, sharps disposal, clinical waste London',
    canonical: `${BASE_URL}/`,
    h1: 'Clinical Waste Collection London & South East',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'MediWaste',
      description: 'Clinical waste compliance and disposal services for GP surgeries, dental practices, and healthcare providers across London and the South East.',
      url: BASE_URL,
      telephone: '+441322879713',
      email: 'hello@mediwaste.co.uk',
      address: { '@type': 'PostalAddress', addressCountry: 'GB' },
      areaServed: ['London', 'Kent', 'Essex', 'Surrey', 'Sussex', 'Hampshire'],
    },
  },
  {
    path: '/about',
    title: 'About MediWaste | Professional Medical Waste Services',
    description: "Learn about MediWaste's professional clinical waste disposal services. Fully licensed and compliant waste management for healthcare and beauty industries across the UK.",
    canonical: `${BASE_URL}/about`,
    h1: 'About MediWaste',
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
  },
  {
    path: '/waste-services/infectious-waste',
    title: 'Infectious Clinical Waste Disposal UK | Yellow Bag Waste Collection Service',
    description: 'Licensed infectious clinical waste disposal. Collection of contaminated dressings, swabs, PPE and infectious materials. Yellow bag waste with compliant incineration.',
    keywords: 'infectious waste disposal, clinical waste collection, yellow bag waste',
    canonical: `${BASE_URL}/waste-services/infectious-waste`,
    h1: 'Infectious Clinical Waste Disposal',
  },
  {
    path: '/waste-services/sharps-waste',
    title: 'Sharps Waste Disposal UK | Needle & Syringe Disposal Service | Sharps Bins',
    description: 'Licensed sharps waste disposal for needles, syringes and medical sharps. Puncture-proof bins supplied free. Compliant collection and incineration. Get a quote.',
    keywords: 'sharps disposal, needle disposal UK, sharps bins, sharps waste collection',
    canonical: `${BASE_URL}/waste-services/sharps-waste`,
    h1: 'Sharps Waste Disposal',
  },
  {
    path: '/waste-services/pharmaceutical-waste',
    title: 'Pharmaceutical Waste Disposal UK | Medicine & Drug Disposal Service',
    description: 'Licensed pharmaceutical waste disposal for expired medicines, controlled drugs and pharmaceutical waste. Blue bin collection with compliant incineration. Free quote.',
    keywords: 'pharmaceutical waste disposal, medicine disposal UK, drug waste collection',
    canonical: `${BASE_URL}/waste-services/pharmaceutical-waste`,
    h1: 'Pharmaceutical Waste Disposal',
  },
  {
    path: '/waste-services/cytotoxic-waste',
    title: 'Cytotoxic Waste Disposal UK | Chemotherapy Waste Collection Service',
    description: 'Licensed cytotoxic and cytostatic waste disposal. Collection of chemotherapy waste, contaminated PPE and cancer treatment materials. Purple bin. Free quote.',
    keywords: 'cytotoxic waste disposal, chemotherapy waste, cytostatic waste UK',
    canonical: `${BASE_URL}/waste-services/cytotoxic-waste`,
    h1: 'Cytotoxic Waste Disposal',
  },
  {
    path: '/waste-services/dental-waste',
    title: 'Dental Waste Disposal UK | Amalgam Waste & Dental Clinical Waste Collection',
    description: 'Licensed dental waste disposal including amalgam, sharps and infectious dental materials. Mercury waste collection with compliant incineration. Free quote.',
    keywords: 'dental waste disposal, amalgam waste UK, dental clinical waste',
    canonical: `${BASE_URL}/waste-services/dental-waste`,
    h1: 'Dental Waste Disposal',
  },
  {
    path: '/waste-services/anatomical-waste',
    title: 'Anatomical Waste Disposal UK | Human Tissue & Pathology Waste Collection',
    description: 'Licensed anatomical waste disposal. Dignified collection and incineration of human tissue, organs and pathology waste. Fully compliant. Free quote.',
    keywords: 'anatomical waste disposal, human tissue waste, pathology waste UK',
    canonical: `${BASE_URL}/waste-services/anatomical-waste`,
    h1: 'Anatomical Waste Disposal',
  },
  {
    path: '/faq',
    title: 'FAQ | Clinical Waste Disposal Questions | MediWaste',
    description: 'Find answers to frequently asked questions about clinical waste disposal, collection schedules, compliance requirements and pricing from MediWaste.',
    canonical: `${BASE_URL}/faq`,
    h1: 'Frequently Asked Questions',
  },
  {
    path: '/contact',
    title: 'Contact MediWaste | Get a Free Waste Disposal Quote',
    description: 'Contact MediWaste for a free clinical waste disposal quote. Call us or fill in our online form. Serving London, Kent, Essex, Surrey and Sussex.',
    canonical: `${BASE_URL}/contact`,
    h1: 'Contact MediWaste',
  },
  {
    path: '/quote',
    title: 'Get a Free Quote — Clinical Waste Disposal | MediWaste',
    description: 'Request a free clinical waste disposal quote. Fast response, competitive pricing and compliant waste management for your healthcare facility.',
    canonical: `${BASE_URL}/quote`,
    h1: 'Get a Free Quote',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Clinical Waste Disposal Quote',
      provider: { '@type': 'LocalBusiness', name: 'MediWaste', url: BASE_URL, telephone: '0800 046 9806' },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP', description: 'Free no-obligation quote' },
    },
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
  },
  {
    path: '/compliance',
    title: 'Clinical Waste Compliance | Regulations & Certificates | MediWaste',
    description: 'Understand your Duty of Care obligations for clinical waste. MediWaste provides waste disposal certificates, hazardous waste consignment notes, and ensures full regulatory compliance.',
    canonical: `${BASE_URL}/compliance`,
    h1: 'Clinical Waste Compliance',
  },
  {
    path: '/service-coverage',
    title: 'Service Coverage Areas | Clinical Waste Disposal UK | MediWaste',
    description: 'Professional clinical waste collection and disposal services across the UK. Licensed medical waste management for London, Kent, Surrey, Sussex, Hampshire, and Essex.',
    canonical: `${BASE_URL}/service-coverage`,
    h1: 'Service Coverage Areas',
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
  },
  {
    path: '/directory-listings',
    title: 'Clinical Waste Business Directory | MediWaste',
    description: 'Directory of healthcare businesses and clinical waste service providers across the UK served by MediWaste.',
    canonical: `${BASE_URL}/directory-listings`,
    h1: 'Clinical Waste Business Directory',
  },
  {
    path: '/terms',
    title: 'Terms of Service | MediWaste',
    description: 'Terms and conditions for using MediWaste clinical waste disposal services. Read our service agreements and policies.',
    canonical: `${BASE_URL}/terms`,
    noindex: true,
    h1: 'Terms of Service',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | MediWaste',
    description: 'Privacy policy for MediWaste. Learn how we collect, use, and protect your personal data in accordance with UK GDPR.',
    canonical: `${BASE_URL}/privacy`,
    noindex: true,
    h1: 'Privacy Policy',
  },
  {
    path: '/cookies',
    title: 'Cookie Policy | MediWaste',
    description: 'Cookie policy for MediWaste. Learn about how we use cookies on our website and your options.',
    canonical: `${BASE_URL}/cookies`,
    noindex: true,
    h1: 'Cookie Policy',
  },
  // Fixed county-level location pages (have dedicated routes in App.tsx)
  {
    path: '/service-areas/london',
    title: 'Clinical Waste Disposal London | Licensed Collection Service | MediWaste',
    description: 'Licensed clinical waste collection across all London boroughs. Serving GP surgeries, dental practices, care homes and aesthetic clinics. Fast response, fully compliant.',
    keywords: 'clinical waste disposal London, medical waste collection London',
    canonical: `${BASE_URL}/service-areas/london`,
    h1: 'Clinical Waste Disposal London',
  },
  {
    path: '/service-areas/kent',
    title: 'Clinical Waste Disposal Kent | Licensed Collection Service | MediWaste',
    description: 'Licensed clinical waste collection across Kent. Serving Maidstone, Canterbury, Dartford, Medway and surrounding areas. Fully compliant, free quote available.',
    keywords: 'clinical waste disposal Kent, medical waste collection Kent',
    canonical: `${BASE_URL}/service-areas/kent`,
    h1: 'Clinical Waste Disposal Kent',
  },
  {
    path: '/service-areas/essex',
    title: 'Clinical Waste Disposal Essex | Licensed Collection Service | MediWaste',
    description: 'Licensed clinical waste collection across Essex. Serving Chelmsford, Colchester, Basildon and surrounding areas. Fully compliant, free quote available.',
    keywords: 'clinical waste disposal Essex, medical waste collection Essex',
    canonical: `${BASE_URL}/service-areas/essex`,
    h1: 'Clinical Waste Disposal Essex',
  },
  {
    path: '/service-areas/surrey',
    title: 'Clinical Waste Disposal Surrey | Licensed Collection Service | MediWaste',
    description: 'Licensed clinical waste collection across Surrey. Serving Guildford, Woking, Reigate, Epsom and surrounding areas. Fully compliant, free quote available.',
    keywords: 'clinical waste disposal Surrey, medical waste collection Surrey',
    canonical: `${BASE_URL}/service-areas/surrey`,
    h1: 'Clinical Waste Disposal Surrey',
  },
  {
    path: '/service-areas/sussex',
    title: 'Clinical Waste Disposal Sussex | Licensed Collection Service | MediWaste',
    description: 'Licensed clinical waste collection across Sussex. Serving Brighton, Crawley, Worthing and surrounding areas. Fully compliant, free quote available.',
    keywords: 'clinical waste disposal Sussex, medical waste collection Sussex',
    canonical: `${BASE_URL}/service-areas/sussex`,
    h1: 'Clinical Waste Disposal Sussex',
  },
  {
    path: '/service-areas/hampshire',
    title: 'Clinical Waste Disposal Hampshire | Licensed Collection Service | MediWaste',
    description: 'Licensed clinical waste collection across Hampshire. Serving Southampton, Portsmouth, Basingstoke and surrounding areas. Fully compliant, free quote available.',
    keywords: 'clinical waste disposal Hampshire, medical waste collection Hampshire',
    canonical: `${BASE_URL}/service-areas/hampshire`,
    h1: 'Clinical Waste Disposal Hampshire',
  },
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
      const canonical = page.canonical_url || `${BASE_URL}/c/${page.url_slug}`;
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
      const canonical = `${BASE_URL}/news/${article.slug}`;
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
    canonical: BASE_URL,
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
