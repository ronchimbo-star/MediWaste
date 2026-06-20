import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BASE_URL = "https://www.mediwaste.co.uk";

const STATIC_URLS = [
  { loc: "/", lastmod: "2026-05-15", changefreq: "weekly", priority: "1.0" },
  { loc: "/about", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/contact", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.9" },
  { loc: "/quote", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.9" },
  { loc: "/audit", lastmod: "2026-06-20", changefreq: "monthly", priority: "0.9" },
  { loc: "/faq", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.7" },
  { loc: "/compliance", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/waste-services", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.9" },
  { loc: "/waste-services/infectious-waste", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/waste-services/sharps-waste", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/waste-services/pharmaceutical-waste", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/waste-services/cytotoxic-waste", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/waste-services/dental-waste", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/waste-services/anatomical-waste", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/service-area", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/service-areas/london", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.9" },
  { loc: "/service-areas/kent", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/service-areas/essex", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/service-areas/surrey", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/service-areas/sussex", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/service-areas/hampshire", lastmod: "2026-05-15", changefreq: "monthly", priority: "0.8" },
  { loc: "/news", lastmod: "2026-05-15", changefreq: "daily", priority: "0.8" },
  { loc: "/directory-listings", lastmod: "2026-05-15", changefreq: "weekly", priority: "0.5" },
  { loc: "/privacy", lastmod: "2026-05-15", changefreq: "yearly", priority: "0.3" },
  { loc: "/terms", lastmod: "2026-05-15", changefreq: "yearly", priority: "0.3" },
  { loc: "/cookies", lastmod: "2026-05-15", changefreq: "yearly", priority: "0.3" },
];

function toDateStr(dateVal: string | null): string {
  if (!dateVal) return "";
  try {
    return new Date(dateVal).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function urlEntry(
  loc: string,
  lastmod: string,
  changefreq: string,
  priority: string
): string {
  return `  <url>
    <loc>${BASE_URL}${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all dynamic content in parallel
    const [seoResult, newsResult, categoriesResult] = await Promise.all([
      supabase
        .from("seo_pages")
        .select("url_slug, updated_at, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false }),
      supabase
        .from("news_articles")
        .select("slug, updated_at, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false }),
      supabase
        .from("news_categories")
        .select("slug, updated_at"),
    ]);

    // Static pages
    const entries: string[] = STATIC_URLS.map((u) =>
      urlEntry(u.loc, u.lastmod, u.changefreq, u.priority)
    );

    // SEO pages (/c/:slug)
    if (seoResult.data) {
      for (const page of seoResult.data) {
        const lastmod = toDateStr(page.updated_at || page.published_at);
        entries.push(urlEntry(`/c/${page.url_slug}`, lastmod, "weekly", "0.7"));
      }
    }

    // News articles (/news/:slug)
    if (newsResult.data) {
      for (const article of newsResult.data) {
        const lastmod = toDateStr(article.updated_at || article.published_at);
        entries.push(urlEntry(`/news/${article.slug}`, lastmod, "monthly", "0.6"));
      }
    }

    // News categories (/news/category/:slug)
    if (categoriesResult.data) {
      for (const cat of categoriesResult.data) {
        const lastmod = toDateStr(cat.updated_at);
        entries.push(urlEntry(`/news/category/${cat.slug}`, lastmod, "weekly", "0.5"));
      }
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
