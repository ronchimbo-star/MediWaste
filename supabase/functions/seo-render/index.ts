import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BASE_URL = "https://mediwaste.co.uk";
const DEFAULT_OG_IMAGE = `${BASE_URL}/Medical-Waste-Hero.jpg`;

// ── HTML helpers ────────────────────────────────────────────────────────────

function esc(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escAttr(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

function trimDesc(str: string): string {
  if (!str) return "";
  if (str.length <= 160) return str;
  const cut = str.slice(0, 159);
  const space = cut.lastIndexOf(" ");
  return (space > 100 ? cut.slice(0, space) : cut) + "\u2026";
}

// ── Static route definitions ────────────────────────────────────────────────

interface RouteMeta {
  title: string;
  description: string;
  keywords?: string;
  canonical: string;
  h1: string;
  noindex?: boolean;
  type?: string;
  schema?: object | object[];
  content?: string;
}

const STATIC_ROUTES: Record<string, RouteMeta> = {
  "/": {
    title: "Clinical Waste Collection London & South East | MediWaste",
    description:
      "Fully compliant clinical waste disposal for GP surgeries, dental practices, and care homes across London and the South East. Registered waste carrier. Free compliance audit available.",
    keywords:
      "clinical waste collection, medical waste disposal, sharps disposal, clinical waste London",
    canonical: `${BASE_URL}/`,
    h1: "Clinical Waste Collection London & South East",
    schema: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "MediWaste",
      description:
        "Clinical waste compliance and disposal services for GP surgeries, dental practices, and healthcare providers across London and the South East.",
      url: BASE_URL,
      telephone: "+441322879713",
      email: "hello@mediwaste.co.uk",
      address: { "@type": "PostalAddress", addressCountry: "GB" },
      areaServed: ["London", "Kent", "Essex", "Surrey", "Sussex", "Hampshire"],
    },
  },
  "/about": {
    title: "About MediWaste | Professional Medical Waste Services",
    description:
      "Learn about MediWaste's professional clinical waste disposal services. Fully licensed and compliant waste management for healthcare and beauty industries across the UK.",
    canonical: `${BASE_URL}/about`,
    h1: "About MediWaste",
  },
  "/waste-services": {
    title:
      "Clinical Waste Disposal Services UK | Medical Waste Collection | Sharps Disposal",
    description:
      "Licensed clinical waste disposal: infectious waste, sharps, pharmaceutical, cytotoxic, dental and anatomical waste. Compliant UK medical waste collection. Free quote.",
    keywords:
      "clinical waste disposal, medical waste collection, sharps disposal UK",
    canonical: `${BASE_URL}/waste-services`,
    h1: "Clinical Waste Disposal Services",
    schema: {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Clinical Waste Disposal",
      provider: { "@type": "LocalBusiness", name: "MediWaste", url: BASE_URL },
      areaServed: { "@type": "Country", name: "United Kingdom" },
      description:
        "Professional disposal of infectious clinical waste, sharps, pharmaceutical waste, anatomical waste, cytotoxic waste and dental waste.",
    },
  },
  "/waste-services/infectious-waste": {
    title:
      "Infectious Clinical Waste Disposal UK | Yellow Bag Waste Collection Service",
    description:
      "Licensed infectious clinical waste disposal. Collection of contaminated dressings, swabs, PPE and infectious materials. Yellow bag waste with compliant incineration.",
    keywords:
      "infectious waste disposal, clinical waste collection, yellow bag waste",
    canonical: `${BASE_URL}/waste-services/infectious-waste`,
    h1: "Infectious Clinical Waste Disposal",
  },
  "/waste-services/sharps-waste": {
    title:
      "Sharps Waste Disposal UK | Needle & Syringe Disposal Service | Sharps Bins",
    description:
      "Licensed sharps waste disposal for needles, syringes and medical sharps. Puncture-proof bins supplied free. Compliant collection and incineration. Get a quote.",
    keywords:
      "sharps disposal, needle disposal UK, sharps bins, sharps waste collection",
    canonical: `${BASE_URL}/waste-services/sharps-waste`,
    h1: "Sharps Waste Disposal",
  },
  "/waste-services/pharmaceutical-waste": {
    title:
      "Pharmaceutical Waste Disposal UK | Medicine & Drug Disposal Service",
    description:
      "Licensed pharmaceutical waste disposal for expired medicines, controlled drugs and pharmaceutical waste. Blue bin collection with compliant incineration. Free quote.",
    keywords:
      "pharmaceutical waste disposal, medicine disposal UK, drug waste collection",
    canonical: `${BASE_URL}/waste-services/pharmaceutical-waste`,
    h1: "Pharmaceutical Waste Disposal",
  },
  "/waste-services/cytotoxic-waste": {
    title:
      "Cytotoxic Waste Disposal UK | Chemotherapy Waste Collection Service",
    description:
      "Licensed cytotoxic and cytostatic waste disposal. Collection of chemotherapy waste, contaminated PPE and cancer treatment materials. Purple bin. Free quote.",
    keywords:
      "cytotoxic waste disposal, chemotherapy waste, cytostatic waste UK",
    canonical: `${BASE_URL}/waste-services/cytotoxic-waste`,
    h1: "Cytotoxic Waste Disposal",
  },
  "/waste-services/dental-waste": {
    title:
      "Dental Waste Disposal UK | Amalgam Waste & Dental Clinical Waste Collection",
    description:
      "Licensed dental waste disposal including amalgam, sharps and infectious dental materials. Mercury waste collection with compliant incineration. Free quote.",
    keywords:
      "dental waste disposal, amalgam waste UK, dental clinical waste",
    canonical: `${BASE_URL}/waste-services/dental-waste`,
    h1: "Dental Waste Disposal",
  },
  "/waste-services/anatomical-waste": {
    title:
      "Anatomical Waste Disposal UK | Human Tissue & Pathology Waste Collection",
    description:
      "Licensed anatomical waste disposal. Dignified collection and incineration of human tissue, organs and pathology waste. Fully compliant. Free quote.",
    keywords:
      "anatomical waste disposal, human tissue waste, pathology waste UK",
    canonical: `${BASE_URL}/waste-services/anatomical-waste`,
    h1: "Anatomical Waste Disposal",
  },
  "/faq": {
    title: "FAQ | Clinical Waste Disposal Questions | MediWaste",
    description:
      "Find answers to frequently asked questions about clinical waste disposal, collection schedules, compliance requirements and pricing from MediWaste.",
    canonical: `${BASE_URL}/faq`,
    h1: "Frequently Asked Questions",
  },
  "/contact": {
    title: "Contact MediWaste | Get a Free Waste Disposal Quote",
    description:
      "Contact MediWaste for a free clinical waste disposal quote. Call us or fill in our online form. Serving London, Kent, Essex, Surrey and Sussex.",
    canonical: `${BASE_URL}/contact`,
    h1: "Contact MediWaste",
  },
  "/quote": {
    title: "Get a Free Quote — Clinical Waste Disposal | MediWaste",
    description:
      "Request a free clinical waste disposal quote. Fast response, competitive pricing and compliant waste management for your healthcare facility.",
    canonical: `${BASE_URL}/quote`,
    h1: "Get a Free Quote",
    schema: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Clinical Waste Disposal Quote",
      provider: {
        "@type": "LocalBusiness",
        name: "MediWaste",
        url: BASE_URL,
        telephone: "0800 046 9806",
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "GBP",
        description: "Free no-obligation quote",
      },
    },
  },
  "/news": {
    title: "News & Updates | MediWaste Clinical Waste Disposal",
    description:
      "Stay updated with the latest news, regulations, and insights on clinical waste management from MediWaste. Expert guidance for healthcare facilities.",
    canonical: `${BASE_URL}/news`,
    h1: "News & Updates",
    schema: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "MediWaste News",
      url: `${BASE_URL}/news`,
      publisher: { "@type": "Organization", name: "MediWaste", url: BASE_URL },
    },
  },
  "/compliance": {
    title:
      "Clinical Waste Compliance | Regulations & Certificates | MediWaste",
    description:
      "Understand your Duty of Care obligations for clinical waste. MediWaste provides waste disposal certificates, hazardous waste consignment notes, and ensures full regulatory compliance.",
    canonical: `${BASE_URL}/compliance`,
    h1: "Clinical Waste Compliance",
  },
  "/service-coverage": {
    title:
      "Service Coverage Areas | Clinical Waste Disposal UK | MediWaste",
    description:
      "Professional clinical waste collection and disposal services across the UK. Licensed medical waste management for London, Kent, Surrey, Sussex, Hampshire, and Essex.",
    canonical: `${BASE_URL}/service-coverage`,
    h1: "Service Coverage Areas",
  },
  "/audit": {
    title: "Free Clinical Waste Audit Tool | MediWaste",
    description:
      "Answer 15 questions about your waste streams. Our AI generates a free, personalised clinical waste audit report — identifying risks and giving you a prioritised action plan.",
    canonical: `${BASE_URL}/audit`,
    h1: "Free Clinical Waste Audit Tool",
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "MediWaste Clinical Waste Audit Tool",
      url: `${BASE_URL}/audit`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    },
  },
  "/directory-listings": {
    title: "Clinical Waste Business Directory | MediWaste",
    description:
      "Directory of healthcare businesses and clinical waste service providers across the UK served by MediWaste.",
    canonical: `${BASE_URL}/directory-listings`,
    h1: "Clinical Waste Business Directory",
  },
  "/terms": {
    title: "Terms of Service | MediWaste",
    description:
      "Terms and conditions for using MediWaste clinical waste disposal services. Read our service agreements and policies.",
    canonical: `${BASE_URL}/terms`,
    noindex: true,
    h1: "Terms of Service",
  },
  "/privacy": {
    title: "Privacy Policy | MediWaste",
    description:
      "Privacy policy for MediWaste. Learn how we collect, use, and protect your personal data in accordance with UK GDPR.",
    canonical: `${BASE_URL}/privacy`,
    noindex: true,
    h1: "Privacy Policy",
  },
  "/cookies": {
    title: "Cookie Policy | MediWaste",
    description:
      "Cookie policy for MediWaste. Learn about how we use cookies on our website and your options.",
    canonical: `${BASE_URL}/cookies`,
    noindex: true,
    h1: "Cookie Policy",
  },
  "/service-areas/london": {
    title:
      "Clinical Waste Disposal London | Licensed Collection Service | MediWaste",
    description:
      "Licensed clinical waste collection across all London boroughs. Serving GP surgeries, dental practices, care homes and aesthetic clinics. Fast response, fully compliant.",
    keywords:
      "clinical waste disposal London, medical waste collection London",
    canonical: `${BASE_URL}/service-areas/london`,
    h1: "Clinical Waste Disposal London",
  },
  "/service-areas/kent": {
    title:
      "Clinical Waste Disposal Kent | Licensed Collection Service | MediWaste",
    description:
      "Licensed clinical waste collection across Kent. Serving Maidstone, Canterbury, Dartford, Medway and surrounding areas. Fully compliant, free quote available.",
    keywords:
      "clinical waste disposal Kent, medical waste collection Kent",
    canonical: `${BASE_URL}/service-areas/kent`,
    h1: "Clinical Waste Disposal Kent",
  },
  "/service-areas/essex": {
    title:
      "Clinical Waste Disposal Essex | Licensed Collection Service | MediWaste",
    description:
      "Licensed clinical waste collection across Essex. Serving Chelmsford, Colchester, Basildon and surrounding areas. Fully compliant, free quote available.",
    keywords:
      "clinical waste disposal Essex, medical waste collection Essex",
    canonical: `${BASE_URL}/service-areas/essex`,
    h1: "Clinical Waste Disposal Essex",
  },
  "/service-areas/surrey": {
    title:
      "Clinical Waste Disposal Surrey | Licensed Collection Service | MediWaste",
    description:
      "Licensed clinical waste collection across Surrey. Serving Guildford, Woking, Reigate, Epsom and surrounding areas. Fully compliant, free quote available.",
    keywords:
      "clinical waste disposal Surrey, medical waste collection Surrey",
    canonical: `${BASE_URL}/service-areas/surrey`,
    h1: "Clinical Waste Disposal Surrey",
  },
  "/service-areas/sussex": {
    title:
      "Clinical Waste Disposal Sussex | Licensed Collection Service | MediWaste",
    description:
      "Licensed clinical waste collection across Sussex. Serving Brighton, Crawley, Worthing and surrounding areas. Fully compliant, free quote available.",
    keywords:
      "clinical waste disposal Sussex, medical waste collection Sussex",
    canonical: `${BASE_URL}/service-areas/sussex`,
    h1: "Clinical Waste Disposal Sussex",
  },
  "/service-areas/hampshire": {
    title:
      "Clinical Waste Disposal Hampshire | Licensed Collection Service | MediWaste",
    description:
      "Licensed clinical waste collection across Hampshire. Serving Southampton, Portsmouth, Basingstoke and surrounding areas. Fully compliant, free quote available.",
    keywords:
      "clinical waste disposal Hampshire, medical waste collection Hampshire",
    canonical: `${BASE_URL}/service-areas/hampshire`,
    h1: "Clinical Waste Disposal Hampshire",
  },
};

// ── SPA shell fetcher ───────────────────────────────────────────────────────
// Fetches the live index.html from the site so we get the correct hashed
// asset tags. The React app hydrates #root, replacing our SEO content.

let cachedShell: string | null = null;
let shellFetchedAt = 0;
const SHELL_TTL = 10 * 60 * 1000; // 10 minutes

async function getSpaShell(): Promise<string> {
  const now = Date.now();
  if (cachedShell && now - shellFetchedAt < SHELL_TTL) {
    return cachedShell;
  }

  try {
    const res = await fetch(`${BASE_URL}/index.html`, {
      headers: { "User-Agent": "MediWaste-SEO-Render/1.0" },
    });
    if (res.ok) {
      const html = await res.text();
      cachedShell = html;
      shellFetchedAt = now;
      return html;
    }
  } catch (err) {
    console.error("Failed to fetch SPA shell:", err);
  }

  // Fallback: minimal shell with no assets (crawlers still get content)
  if (cachedShell) return cachedShell;
  return `<!DOCTYPE html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <link rel="icon" type="image/png" href="/mediwaste-favicon.png" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}

// ── HTML injector ──────────────────────────────────────────────────────────

function injectIntoShell(shell: string, meta: RouteMeta): string {
  const desc = trimDesc(meta.description);
  const schemas = Array.isArray(meta.schema)
    ? meta.schema
    : meta.schema
    ? [meta.schema]
    : [];
  const robots = meta.noindex
    ? "noindex,nofollow"
    : "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1";
  const type = meta.type || "website";

  const metaTags = [
    `<title>${esc(meta.title)}</title>`,
    desc
      ? `    <meta name="description" content="${escAttr(desc)}" />`
      : "",
    meta.keywords
      ? `    <meta name="keywords" content="${escAttr(meta.keywords)}" />`
      : "",
    `    <meta name="robots" content="${robots}" />`,
    `    <link rel="canonical" href="${escAttr(meta.canonical)}" />`,
    `    <meta property="og:site_name" content="MediWaste" />`,
    `    <meta property="og:type" content="${type}" />`,
    `    <meta property="og:url" content="${escAttr(meta.canonical)}" />`,
    `    <meta property="og:title" content="${escAttr(meta.title)}" />`,
    desc
      ? `    <meta property="og:description" content="${escAttr(desc)}" />`
      : "",
    `    <meta property="og:image" content="${escAttr(DEFAULT_OG_IMAGE)}" />`,
    `    <meta property="og:image:width" content="1200" />`,
    `    <meta property="og:image:height" content="630" />`,
    `    <meta property="og:locale" content="en_GB" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:site" content="@mediwaste" />`,
    `    <meta name="twitter:title" content="${escAttr(meta.title)}" />`,
    desc
      ? `    <meta name="twitter:description" content="${escAttr(desc)}" />`
      : "",
    `    <meta name="twitter:image" content="${escAttr(DEFAULT_OG_IMAGE)}" />`,
    ...schemas.map(
      (s) =>
        `    <script type="application/ld+json">${JSON.stringify(s)}</script>`
    ),
  ]
    .filter(Boolean)
    .join("\n");

  // Build crawlable content for #root — React replaces this on hydration
  const rootParts = [
    meta.h1 ? `<h1>${esc(meta.h1)}</h1>` : "",
    desc ? `<p>${esc(desc)}</p>` : "",
    meta.content ? meta.content : "",
  ].filter(Boolean);
  const rootInner = rootParts.length
    ? `<article>${rootParts.join("")}</article>`
    : "";

  let html = shell;

  // Replace the generic <title>MediWaste</title> with our meta tags
  html = html.replace(/<title>[^<]*<\/title>/, metaTags);

  // Inject any meta tags that weren't in the original shell (description, canonical, etc.)
  // by adding them before </head> if they're not already present
  const additionalMeta = [
    desc && !html.includes('name="description"')
      ? `    <meta name="description" content="${escAttr(desc)}" />`
      : "",
    meta.keywords && !html.includes('name="keywords"')
      ? `    <meta name="keywords" content="${escAttr(meta.keywords)}" />`
      : "",
    !html.includes('name="robots"')
      ? `    <meta name="robots" content="${robots}" />`
      : "",
    !html.includes('rel="canonical"')
      ? `    <link rel="canonical" href="${escAttr(meta.canonical)}" />`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (additionalMeta) {
    html = html.replace("</head>", `    ${additionalMeta}\n  </head>`);
  }

  // Inject crawlable content into <div id="root"></div>
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${rootInner}</div>`
  );

  return html;
}

// ── Route handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Strip the /seo-render function prefix
    let path = url.pathname.replace(/^\/seo-render/, "") || "/";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let meta: RouteMeta | null = null;

    // ── Static routes ──────────────────────────────────────────────────────
    if (STATIC_ROUTES[path]) {
      meta = { ...STATIC_ROUTES[path] };

      // Service-coverage page: inject internal links to all SEO location pages
      if (path === "/service-coverage") {
        const { data: seoPages } = await supabase
          .from("seo_pages")
          .select("url_slug,meta_title,h1,target_keyword")
          .eq("status", "published")
          .order("url_slug");

        if (seoPages && seoPages.length) {
          const links = seoPages
            .map((p) => {
              const title = (
                p.meta_title ||
                p.h1 ||
                p.target_keyword ||
                p.url_slug
              ).replace(/\s*\|\s*MediWaste.*$/i, "");
              return `<a href="/c/${p.url_slug}">${esc(title)}</a>`;
            })
            .join(" ");
          meta.content = `<section><h2>Clinical Waste Collection Locations</h2><p>Find clinical waste collection services in your area. We serve towns and cities across London and the South East.</p><div>${links}</div></section>`;
        }
      }
    }

    // ── SEO location pages: /c/:slug ────────────────────────────────────────
    else if (path.startsWith("/c/")) {
      const slug = path.slice(3);
      const { data: page } = await supabase
        .from("seo_pages")
        .select(
          "url_slug,meta_title,meta_description,meta_keywords,h1,og_image,canonical_url,target_keyword,content,location,published_at,updated_at"
        )
        .eq("url_slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (page) {
        const canonical = page.canonical_url || `${BASE_URL}/c/${page.url_slug}`;
        const title = page.meta_title || page.h1 || page.target_keyword;
        const description =
          page.meta_description ||
          `Professional ${page.target_keyword} services from MediWaste. Fully licensed, compliant clinical waste disposal.`;

        meta = {
          title,
          description,
          keywords: page.meta_keywords || page.target_keyword,
          canonical,
          h1: page.h1 || title,
          type: "article",
          content: page.content,
          schema: [
            {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: page.h1 || title,
              description,
              url: canonical,
              publisher: {
                "@type": "Organization",
                name: "MediWaste",
                url: BASE_URL,
              },
              datePublished: page.published_at,
              dateModified: page.updated_at || page.published_at,
              keywords: page.meta_keywords || page.target_keyword,
            },
            {
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "MediWaste",
              url: BASE_URL,
              telephone: "0800 046 9806",
              description: `Clinical waste collection and disposal services${
                page.location ? ` in ${page.location}` : ""
              }`,
              areaServed: page.location || "United Kingdom",
            },
          ],
        };
      }
    }

    // ── News articles: /news/:slug ──────────────────────────────────────────
    else if (path.startsWith("/news/") && path !== "/news") {
      const slug = path.slice(6);
      const { data: article } = await supabase
        .from("news_articles")
        .select(
          "slug,title,excerpt,seo_title,seo_description,seo_keywords,og_image,featured_image,content,published_at,updated_at"
        )
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (article) {
        const canonical = `${BASE_URL}/news/${article.slug}`;
        const title = article.seo_title || article.title;
        const description = article.seo_description || article.excerpt;
        const keywords = Array.isArray(article.seo_keywords)
          ? article.seo_keywords.join(", ")
          : article.seo_keywords || "";

        meta = {
          title,
          description,
          keywords,
          canonical,
          h1: article.title,
          type: "article",
          content: article.content,
          schema: {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: article.title,
            description: article.excerpt,
            image: {
              "@type": "ImageObject",
              url: article.og_image || article.featured_image,
              width: 1200,
              height: 630,
            },
            datePublished: article.published_at,
            dateModified: article.updated_at || article.published_at,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": canonical,
            },
            author: {
              "@type": "Organization",
              name: "MediWaste",
              url: BASE_URL,
            },
            publisher: {
              "@type": "Organization",
              name: "MediWaste",
              url: BASE_URL,
              logo: {
                "@type": "ImageObject",
                url: `${BASE_URL}/mediwaste-logo.png`,
                width: 200,
                height: 60,
              },
            },
          },
        };
      }
    }

    // ── Unknown route: return 404 ────────────────────────────────────────────
    if (!meta) {
      const shell = await getSpaShell();
      return new Response(
        injectIntoShell(shell, {
          title: "Page Not Found | MediWaste",
          description: "The page you are looking for could not be found.",
          canonical: `${BASE_URL}${path}`,
          h1: "Page Not Found",
          noindex: true,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    const shell = await getSpaShell();
    const html = injectIntoShell(shell, meta);

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("seo-render error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
