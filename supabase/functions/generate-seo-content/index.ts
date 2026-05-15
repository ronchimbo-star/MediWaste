import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRequest {
  page_id: string;
  openai_api_key: string;
  model?: string;
}

const PROMPT_TEMPLATE = (
  keyword: string,
  location: string | null,
  serviceType: string | null,
  categoryName: string | null
) => {
  const locationPart = location ? ` in ${location}` : "";
  const servicePart = serviceType ? ` related to ${serviceType}` : "";
  const categoryPart = categoryName ? ` in the ${categoryName} sector` : "";

  return `You are an expert SEO content writer for MediWaste, a UK clinical waste disposal company. Write content for a page targeting the keyword "${keyword}"${locationPart}${servicePart}${categoryPart}.

Generate the following in JSON format:
{
  "meta_title": "SEO-optimised title tag (55-60 chars, include keyword)",
  "meta_description": "Compelling meta description (150-160 chars, include keyword, include call-to-action)",
  "h1": "Engaging H1 heading (different from meta_title but includes keyword)",
  "content": "Full HTML article body (600-800 words). Use <h2>, <h3>, <p>, <ul>, <li>, <strong> tags. Include practical advice, UK regulations where relevant, and naturally integrate the keyword. Write in a professional, authoritative tone. Include mentions of MediWaste services. Do NOT use markdown - use HTML only.",
  "og_title": "Open Graph title (can match meta_title)",
  "og_description": "OG description (can match meta_description)"
}

Requirements:
- Content must be unique, factual, and relevant to UK clinical waste management
- Naturally incorporate the target keyword 3-5 times
- Include references to relevant UK regulations (Environmental Protection Act 1990, Duty of Care, HTM 07-01) where applicable
- Mention MediWaste as a trusted provider
- Content should be helpful and informative, not thin or spammy
- Use British English spelling
- Do NOT wrap the JSON in markdown code fences`;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { page_id, openai_api_key, model = "gpt-4o" }: GenerateRequest =
      await req.json();

    if (!page_id || !openai_api_key) {
      return new Response(
        JSON.stringify({ error: "Missing page_id or openai_api_key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: page, error: pageError } = await supabase
      .from("seo_pages")
      .select("*, seo_categories(name)")
      .eq("id", page_id)
      .maybeSingle();

    if (pageError || !page) {
      return new Response(
        JSON.stringify({ error: "Page not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categoryName = page.seo_categories?.name || null;
    const prompt = PROMPT_TEMPLATE(
      page.target_keyword,
      page.location,
      page.service_type,
      categoryName
    );

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openai_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert SEO content writer. Always respond with valid JSON only, no markdown fences.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errBody = await openaiResponse.text();
      await supabase.from("seo_generation_logs").insert({
        page_id,
        action: page.content ? "regenerate" : "generate",
        prompt_used: prompt,
        model,
        status: "error",
        error_message: errBody,
      });
      return new Response(
        JSON.stringify({ error: "OpenAI API error", details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const usage = openaiData.usage;
    const rawContent = openaiData.choices?.[0]?.message?.content || "";

    let generated;
    try {
      const cleaned = rawContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      generated = JSON.parse(cleaned);
    } catch {
      await supabase.from("seo_generation_logs").insert({
        page_id,
        action: page.content ? "regenerate" : "generate",
        prompt_used: prompt,
        tokens_used: usage?.total_tokens,
        model,
        status: "error",
        error_message: `Failed to parse OpenAI response: ${rawContent.substring(0, 500)}`,
      });
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: rawContent }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("seo_pages")
      .update({
        meta_title: generated.meta_title,
        meta_description: generated.meta_description,
        h1: generated.h1,
        content: generated.content,
        og_title: generated.og_title || generated.meta_title,
        og_description: generated.og_description || generated.meta_description,
        last_generated_at: now,
        updated_at: now,
      })
      .eq("id", page_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to save generated content", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("seo_generation_logs").insert({
      page_id,
      action: page.content ? "regenerate" : "generate",
      prompt_used: prompt,
      tokens_used: usage?.total_tokens,
      model,
      status: "success",
    });

    return new Response(
      JSON.stringify({ success: true, generated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
