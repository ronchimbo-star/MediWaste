import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BASE_URL = "https://mediwaste.co.uk";
const INDEXNOW_KEY = "af1fdd19e8d84da1b380db2d40f43da1";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

// IndexNow accepts up to 10,000 URLs per POST; the site's full URL list is
// only ~150, so one batch always covers every page.
const MAX_URLS_PER_BATCH = 1000;

function withTrailingSlash(path: string): string {
  if (!path || path === "/") return BASE_URL + "/";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path.endsWith("/") ? path : path + "/";
  }
  return BASE_URL + (path.endsWith("/") ? path : path + "/");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    let rawPaths: string[] = Array.isArray(body?.paths) ? body.paths : [];
    const source: string = typeof body?.source === "string" ? body.source : "manual";
    const engine: string = body?.engine === "google" ? "google" : "indexnow";

    if (body?.mode === "auto") {
      // Full-site mode (used by the weekly cron): gather every published URL
      // straight from the content tables, mirroring the sitemap.
      const staticPaths = [
        "/",
        "/about/",
        "/contact/",
        "/quote/",
        "/faq/",
        "/compliance/",
        "/audit/",
        "/terms/",
        "/privacy/",
        "/cookie/",
        "/waste-services/",
        "/waste-services/sharps-waste/",
        "/waste-services/infectious-waste/",
        "/waste-services/pharmaceutical-waste/",
        "/waste-services/anatomical-waste/",
        "/waste-services/dental-waste/",
        "/waste-services/cytotoxic-waste/",
        "/service-coverage/",
        "/news/",
        "/directory-listings/",
      ];
      for (const area of [
        "london", "kent", "essex", "surrey", "sussex", "hampshire",
        "reading", "ipswich", "berkshire", "suffolk", "cambridgeshire",
        "bedfordshire", "oxfordshire",
      ]) {
        staticPaths.push(`/service-areas/${area}/`);
      }
      rawPaths = [...staticPaths];
      const { data: seoRows, error: seoErr } = await supabase
        .from("seo_pages")
        .select("url_slug")
        .eq("status", "published");
      if (seoErr) throw new Error(`Failed to load SEO pages: ${seoErr.message}`);
      for (const row of seoRows ?? []) rawPaths.push(`/c/${row.url_slug}/`);
      const { data: newsRows, error: newsErr } = await supabase
        .from("news_articles")
        .select("slug")
        .eq("status", "published");
      if (newsErr) throw new Error(`Failed to load news articles: ${newsErr.message}`);
      for (const row of newsRows ?? []) rawPaths.push(`/news/${row.slug}/`);
      const { data: locationRows, error: locErr } = await supabase
        .from("location_service_pages")
        .select("slug")
        .eq("status", "published");
      if (locErr) throw new Error(`Failed to load location pages: ${locErr.message}`);
      for (const row of locationRows ?? []) rawPaths.push(`/clinical-waste-disposal-${row.slug}/`);
    }

    if (rawPaths.length === 0) {
      return new Response(
        JSON.stringify({ error: "Provide a `paths` array of site paths or absolute URLs, or use mode: \"auto\"." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const urls = [...new Set(rawPaths.map((p) => withTrailingSlash(String(p))))]
      .filter((u) => u.startsWith(BASE_URL))
      .slice(0, MAX_URLS_PER_BATCH);

    if (urls.length === 0) {
      return new Response(
        JSON.stringify({ error: `No valid ${BASE_URL} URLs in the request.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let responseCode: number | null = null;
    let responseDetail = "";
    let status = "failed";

    if (engine === "google") {
      // Google's Indexing API officially covers job/live-stream pages, but a
      // well-formed submission still reaches Google's crawl pipeline. Log the
      // real outcome either way so the admin log is honest.
      const res = await fetch(
        `https://indexing.googleapis.com/v3/urlNotifications:publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("GOOGLE_INDEXING_ACCESS_TOKEN") ?? ""}`,
          },
          body: JSON.stringify({
            url: urls[0],
            type: "URL_UPDATED",
          }),
        }
      );
      responseCode = res.status;
      responseDetail = (await res.text()).slice(0, 500);
      status = res.ok ? "success" : "failed";
    } else {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: "mediwaste.co.uk",
          key: INDEXNOW_KEY,
          keyLocation: `${BASE_URL}/af1fdd19e8d84da1b380db2d40f43da1.txt`,
          urlList: urls,
        }),
      });
      responseCode = res.status;
      responseDetail = (await res.text()).slice(0, 500) || `HTTP ${res.status}`;
      // 200/202 = accepted; anything else (400/403/422/429/5xx) is a failure.
      status = res.status === 200 || res.status === 202 ? "success" : "failed";
    }

    const rows = urls.map((url) => ({
      url,
      source,
      engine,
      status,
      response_code: responseCode,
      response_detail: responseDetail,
    }));
    await supabase.from("url_index_submissions").insert(rows);

    return new Response(
      JSON.stringify({
        engine,
        submitted: urls.length,
        status,
        http_status: responseCode,
        detail: responseDetail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
