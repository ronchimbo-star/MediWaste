import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LinkCheckResult {
  url: string;
  status: number | null;
  ok: boolean;
  error?: string;
  redirectUrl?: string;
}

async function checkUrl(url: string): Promise<LinkCheckResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "MediWaste-LinkChecker/1.0",
      },
    });

    clearTimeout(timeout);

    const redirectUrl =
      response.redirected ? response.url : undefined;

    return {
      url,
      status: response.status,
      ok: response.ok,
      redirectUrl,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { url, status: null, ok: false, error: "Timeout (10s)" };
    }
    return { url, status: null, ok: false, error: err.message || String(err) };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or empty urls array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (urls.length > 50) {
      return new Response(
        JSON.stringify({ error: "Maximum 50 URLs per request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: LinkCheckResult[] = [];
    const batchSize = 10;

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(checkUrl));
      results.push(...batchResults);
    }

    const broken = results.filter((r) => !r.ok);
    const healthy = results.filter((r) => r.ok);

    return new Response(
      JSON.stringify({
        total: results.length,
        healthy: healthy.length,
        broken: broken.length,
        results,
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
