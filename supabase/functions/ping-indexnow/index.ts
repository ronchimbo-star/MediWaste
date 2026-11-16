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

// IndexNow accepts up to 10,000 URLs per POST; keep batches modest.
const MAX_URLS_PER_BATCH = 100;

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
    const rawPaths: string[] = Array.isArray(body?.paths) ? body.paths : [];
    const source: string = typeof body?.source === "string" ? body.source : "manual";
    const engine: string = body?.engine === "google" ? "google" : "indexnow";

    if (rawPaths.length === 0) {
      return new Response(
        JSON.stringify({ error: "Provide a `paths` array of site paths or absolute URLs." }),
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
