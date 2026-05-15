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
  { loc: "/", lastmod: "2026-04-10", changefreq: "weekly", priority: "1.0" },
  { loc: "/about", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/contact", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.9" },
  { loc: "/quote", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.9" },
  { loc: "/faq", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.7" },
  { loc: "/waste-services", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.9" },
  { loc: "/waste-services/infectious-waste", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/waste-services/sharps-waste", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/waste-services/pharmaceutical-waste", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/waste-services/cytotoxic-waste", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/waste-services/dental-waste", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/waste-services/anatomical-waste", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/service-coverage", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/service-areas/london", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.9" },
  { loc: "/service-areas/kent", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/service-areas/essex", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/service-areas/surrey", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/service-areas/sussex", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/service-areas/hampshire", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/clinical-waste-disposal-london", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.9" },
  { loc: "/clinical-waste-disposal-kent", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/clinical-waste-disposal-essex", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/clinical-waste-disposal-surrey", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/clinical-waste-disposal-sussex", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/clinical-waste-disposal-hampshire", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.8" },
  { loc: "/compliance", lastmod: "2026-04-10", changefreq: "monthly", priority: "0.7" },
  { loc: "/directory-listings", lastmod: "2026-05-15", changefreq: "weekly", priority: "0.5" },
  { loc: "/news", lastmod: "2026-04-10", changefreq: "weekly", priority: "0.7" },
  { loc: "/privacy", lastmod: "2026-04-10", changefreq: "yearly", priority: "0.3" },
  { loc: "/terms", lastmod: "2026-04-10", changefreq: "yearly", priority: "0.3" },
  { loc: "/cookies", lastmod: "2026-04-10", changefreq: "yearly", priority: "0.3" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: pages, error } = await supabase
      .from("seo_pages")
      .select("url_slug, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Static pages
    const staticXml = STATIC_URLS.map((u) => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`);

    // Dynamic SEO pages
    const dynamicXml = (pages || []).map((page) => {
      const lastmod = page.updated_at || page.published_at;
      const dateStr = lastmod ? new Date(lastmod).toISOString().split("T")[0] : "";
      return `  <url>
    <loc>${BASE_URL}/c/${page.url_slug}</loc>${dateStr ? `\n    <lastmod>${dateStr}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml.join("\n")}
${dynamicXml.join("\n")}
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
