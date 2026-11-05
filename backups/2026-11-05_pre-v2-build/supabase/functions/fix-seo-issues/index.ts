import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FixRequest {
  page_id: string;
  current_content: string;
  current_h1: string;
  current_meta_title: string;
  current_meta_description: string;
  target_keyword: string;
  location: string;
  failing_checks: string[];
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

    const {
      page_id,
      current_content,
      current_h1,
      current_meta_title,
      current_meta_description,
      target_keyword,
      location,
      failing_checks,
    }: FixRequest = await req.json();

    if (!page_id || !current_content) {
      return new Response(
        JSON.stringify({ error: "Missing page_id or current_content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const locationOrDefault = location || "your area";
    const issuesList = failing_checks.map((c, i) => `${i + 1}. ${c}`).join("\n");

    const prompt = `You are an expert SEO content editor for MediWaste, a UK clinical waste disposal company.

The following generated page content has FAILED certain validation checks. Your job is to FIX the content so that ALL issues pass validation, while preserving the existing good content and structure.

TARGET KEYWORD: "${target_keyword}"
LOCATION: "${locationOrDefault}"
CURRENT H1: "${current_h1}"
CURRENT META TITLE: "${current_meta_title}"
CURRENT META DESCRIPTION: "${current_meta_description}"

=== FAILING CHECKS (you MUST fix ALL of these) ===
${issuesList}

=== CURRENT CONTENT ===
${current_content}

=== FIX INSTRUCTIONS ===

For each failing check, apply the following fixes:

- "H1 includes target keyword": Rewrite the H1 to naturally include "${target_keyword}" and "${locationOrDefault}"
- "H1 includes location": Ensure H1 contains "${locationOrDefault}"
- "Meta title length": Adjust meta_title to be 55-60 characters, include the keyword and location
- "Meta title includes keyword": Ensure meta_title includes at least the main keyword term
- "Meta description length": Expand meta_description to 140-165 characters with keyword and a call-to-action
- "Content length": SIGNIFICANTLY expand the content to at least 1,500 words. Add more detailed paragraphs about the service, local area, compliance requirements, waste types, and collection process. Each section should have 3-4 substantial paragraphs.
- "Keyword usage": Naturally weave "${target_keyword}" into the text 5-8 times across different sections
- "Trust signal module": Add a trust section with: <div class="info-box"><h3>What Our ${locationOrDefault} Clients Say</h3><p><strong>"[testimonial]"</strong><br/><em>— [Name] – [Role], ${locationOrDefault}</em></p><p><strong>"[testimonial]"</strong><br/><em>— [Name] – [Role], ${locationOrDefault}</em></p></div> followed by "Rated Excellent by ${locationOrDefault} practices (4.8/5 stars). Fully licenced by the Environment Agency | Safe Contractor Approved | ISO 14001 Certified."
- "Accreditations mentioned": Add "Fully licenced by the Environment Agency | Safe Contractor Approved | ISO 14001 Certified" in the trust section
- "Key services table": Add a table with <table><thead><tr><th>Service</th><th>Description</th><th>Frequency</th></tr></thead><tbody> with 5-6 services
- "Collection process section": Add <h2>Our Collection Process</h2> with 3 numbered steps: 1. Schedule & Setup, 2. Collection & Transport, 3. Disposal & Documentation
- "Local relevance": Mention "${locationOrDefault}" at least 5 times throughout. Add local landmarks, streets, postcode areas, and local authority references
- "Compliance guarantee box": Add <div class="success-box"><h3>Compliance Guarantee</h3><p>All waste transfer notes and consignment notes provided within 48 hours of collection.</p></div>
- "FAQ section": Add <h2>Frequently Asked Questions</h2> with these <h3>question</h3><p>answer</p> pairs: "How much does clinical waste collection cost in ${locationOrDefault}?", "What types of clinical waste do you collect in ${locationOrDefault}?", "Are you registered with the Environment Agency?", "How quickly can you start collections in ${locationOrDefault}?"
- "Mandatory FAQ questions": Ensure all 4 mandatory questions above are present and localised
- "UK English spelling": Replace any American spellings (organize→organise, color→colour, center→centre, license→licence)
- "No external/broken links": Remove or replace any external links with valid internal links (/waste-services, /quote, /contact, /compliance, etc.)
- "Broken image links": Replace any broken <img> tags with a valid Pexels image. ONLY use these verified Pexels URLs:
  - Sharps/needles: https://images.pexels.com/photos/7579831/pexels-photo-7579831.jpeg?auto=compress&cs=tinysrgb&w=800
  - Medical waste: https://images.pexels.com/photos/3786166/pexels-photo-3786166.jpeg?auto=compress&cs=tinysrgb&w=800
  - Healthcare: https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=800
  - If no image is needed or the topic doesn't match, REMOVE the broken img tag entirely rather than guessing a URL.
  - NEVER use unsplash.com, pixabay.com, shutterstock.com, freepik.com, or any non-Pexels URL.
  - Format: <img src="URL" alt="descriptive alt text" class="w-full rounded-lg my-6" />
- "No CTA embedded in content": Remove any "Request a Quote" buttons or cta-box divs from the content
- "Internal links included": Add at least 3 internal links to pages like /waste-services, /waste-services/sharps-waste, /waste-services/infectious-waste, /quote, /compliance

IMPORTANT RULES:
- Use UK English spelling throughout (colour, centre, licence, organised)
- Short paragraphs (2-3 sentences max)
- Professional but accessible tone — no marketing fluff
- Do NOT include any CTA buttons — the page template handles this
- Do NOT wrap in <article> or <section> tags
- Preserve existing good structure and content where possible
- The content must be factual and relevant to clinical waste collection in ${locationOrDefault}
- For "Content length" fixes: The main body (excluding FAQ and testimonials) MUST be at least 1,500 words. Add detailed paragraphs about the service, regulations, local context, collection process details, waste types, and compliance requirements. Each h2 section should have 3-4 paragraphs of 80-100 words each.

Return ONLY valid JSON (no markdown fences):
{
  "h1": "Fixed H1 heading",
  "meta_title": "Fixed meta title (55-60 chars)",
  "meta_description": "Fixed meta description (140-165 chars)",
  "content": "Fixed full HTML content body"
}`;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are an expert SEO content editor. Fix all validation issues while preserving good existing content. Always respond with valid JSON only, no markdown fences. Use UK English spelling throughout. Ensure content is at least 1,500 words when word count is a failing check.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.5,
          max_tokens: 10000,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errBody = await openaiResponse.text();
      return new Response(
        JSON.stringify({ error: "OpenAI API error", details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices?.[0]?.message?.content || "";

    let fixed;
    try {
      const cleaned = rawContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      fixed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: rawContent.substring(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("seo_pages")
      .update({
        h1: fixed.h1 || current_h1,
        meta_title: fixed.meta_title || current_meta_title,
        meta_description: fixed.meta_description || current_meta_description,
        content: fixed.content || current_content,
        updated_at: now,
      })
      .eq("id", page_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to save fixed content", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, fixed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
