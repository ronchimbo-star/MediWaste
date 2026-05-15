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
  model?: string;
  custom_instructions?: string;
}

const PROMPT_TEMPLATE = (
  keyword: string,
  location: string | null,
  serviceType: string | null,
  categoryName: string | null,
  customInstructions: string | null
) => {
  const locationPart = location ? ` in ${location}` : "";
  const servicePart = serviceType ? ` related to ${serviceType}` : "";
  const categoryPart = categoryName ? ` in the ${categoryName} sector` : "";

  let customBlock = "";
  if (customInstructions && customInstructions.trim()) {
    customBlock = `\n\nADDITIONAL INSTRUCTIONS FROM THE CONTENT MANAGER:\n${customInstructions.trim()}\n\nYou MUST follow the above additional instructions. They take priority over default settings where they conflict (e.g. word count, style, images, CTAs).`;
  }

  return `You are an expert SEO content writer for MediWaste, a UK clinical waste disposal company. Write content for a page targeting the keyword "${keyword}"${locationPart}${servicePart}${categoryPart}.

Generate the following in JSON format:
{
  "meta_title": "SEO-optimised title tag (55-60 chars, include keyword)",
  "meta_description": "Compelling meta description (150-160 chars, include keyword, include call-to-action)",
  "h1": "Engaging H1 heading (different from meta_title but includes keyword naturally)",
  "content": "Full HTML article body (see structure requirements below)",
  "og_title": "Open Graph title (can match meta_title)",
  "og_description": "OG description (can match meta_description)",
  "keywords": "Comma-separated list of 6-10 relevant SEO keywords for the meta keywords tag"
}

CONTENT STRUCTURE REQUIREMENTS:
The content field must be well-structured HTML article body following this exact pattern:
- Start with an introductory paragraph (2-3 sentences summarising the article)
- Use <h2> for major sections (4-6 sections minimum)
- Use <h3> for sub-sections within major sections
- Use <p> for paragraphs with proper spacing
- Use <ul> and <li> for bullet point lists (include at least 2-3 lists)
- Use <strong> for emphasis on key terms
- Use <a href="/..."> for internal links to MediWaste pages (e.g. /waste-services, /quote, /contact, /waste-services/sharps-waste, /waste-services/infectious-waste)
- Use <table>, <thead>, <tbody>, <tr>, <th>, <td> for comparison tables where appropriate (include at least one table if relevant)
- Include <img> tags only if custom instructions specify an image to include
- Do NOT include any call-to-action sections or CTA buttons — the page template adds these automatically
- Do NOT add the H1 heading — it is rendered separately by the page template
- Do NOT wrap content in <article> or <section> tags — just use heading and paragraph-level elements

CONTENT QUALITY REQUIREMENTS:
- Minimum 1000 words unless instructed otherwise
- Content must be unique, factual, and deeply relevant to UK clinical waste management
- Naturally incorporate the target keyword 4-6 times across the article
- Include references to relevant UK regulations (Environmental Protection Act 1990, Duty of Care, HTM 07-01, Hazardous Waste Regulations 2005) where applicable
- Mention MediWaste naturally as a trusted provider (2-3 times, not excessively)
- Content should be genuinely helpful and informative — not thin or spammy
- Use British English spelling throughout
- Write in a professional, authoritative tone that demonstrates expertise
- Include practical, actionable advice the reader can use
- Address common questions or concerns the reader may have
- Do NOT wrap the JSON in markdown code fences${customBlock}`;
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

    const { page_id, model = "gpt-4o", custom_instructions }: GenerateRequest =
      await req.json();

    if (!page_id) {
      return new Response(
        JSON.stringify({ error: "Missing page_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured. Please add it to your project secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      categoryName,
      custom_instructions || null
    );

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert SEO content writer. Always respond with valid JSON only, no markdown fences. Follow all instructions precisely.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4500,
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
        meta_keywords: generated.keywords || null,
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
