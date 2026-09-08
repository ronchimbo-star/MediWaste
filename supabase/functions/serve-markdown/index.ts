import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/serve-markdown\/?/, "");

    if (!path) {
      return new Response(
        JSON.stringify({ error: "Slug required. Usage: /serve-markdown/{slug}" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const dbUrl = `${supabaseUrl}/rest/v1/markdown_versions?select=markdown_content,title,description,image,content_signal,token_counts,jsonld_count,source_url,version_number,created_at&public_slug=eq.${encodeURIComponent(path)}&is_published=eq.true&limit=1`;
    const resp = await fetch(dbUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: "Database query failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rows = await resp.json();
    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Markdown not found or not published" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const row = rows[0];

    // Return as text/markdown for AI bot consumption
    return new Response(row.markdown_content, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Content-Signal": row.content_signal || "ai-train=yes, search=yes, ai-input=yes",
        "X-Markdown-Version": String(row.version_number),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
