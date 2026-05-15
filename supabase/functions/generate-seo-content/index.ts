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
  const locationOrDefault = location || "your area";

  let customBlock = "";
  if (customInstructions && customInstructions.trim()) {
    customBlock = `\n\nADDITIONAL INSTRUCTIONS FROM THE CONTENT MANAGER:\n${customInstructions.trim()}\n\nYou MUST follow the above additional instructions. They take priority over default settings where they conflict (e.g. word count, style, images, CTAs).`;
  }

  return `You are an expert SEO content writer for MediWaste, a UK clinical waste disposal company. Write content for a page targeting the keyword "${keyword}"${locationPart}${servicePart}${categoryPart}.

Generate the following in JSON format:
{
  "meta_title": "SEO-optimised title tag (55-60 chars, include keyword + location)",
  "meta_description": "Compelling meta description (150-160 chars, include keyword, location, and call-to-action)",
  "h1": "Must include the target keyword + location (e.g. 'Clinical Waste Collection in ${locationOrDefault}')",
  "content": "Full HTML article body following the MANDATORY STRUCTURE below",
  "og_title": "Open Graph title (can match meta_title)",
  "og_description": "OG description (can match meta_description)",
  "keywords": "Comma-separated list of 8-12 relevant SEO keywords including location variants",
  "faq_schema": [
    {"question": "FAQ question 1", "answer": "FAQ answer 1"},
    {"question": "FAQ question 2", "answer": "FAQ answer 2"},
    {"question": "FAQ question 3", "answer": "FAQ answer 3"},
    {"question": "FAQ question 4", "answer": "FAQ answer 4"}
  ]
}

===== MANDATORY CONTENT STRUCTURE (in this exact order) =====

1. INTRO PARAGRAPH (max 150 words)
   - Summarise the service for that location
   - Short, direct, factual — no marketing fluff
   - 2-3 sentences maximum

2. TRUST SIGNAL MODULE
   - "Rated Excellent by ${locationOrDefault} practices" with a 4.8+ star rating mention
   - 2 short customer testimonials specific to the area. Format as:
     <div class="info-box"><h3>What Our ${locationOrDefault} Clients Say</h3><p><strong>"[Testimonial quote]"</strong><br/><em>— [Name] – [Role], [Location]</em></p><p><strong>"[Testimonial quote]"</strong><br/><em>— [Name] – [Role], [Location]</em></p></div>
   - Accreditations line: "Fully licenced by the Environment Agency | Safe Contractor Approved | ISO 14001 Certified"

3. KEY SERVICES TABLE (3 columns: Service, Description, Frequency)
   - Use <table> with <thead> and <tbody>
   - Include 5-6 services relevant to the keyword (sharps, infectious, pharmaceutical, anatomical, dental, offensive)

4. OUR COLLECTION PROCESS (3 steps)
   - Format as a numbered list or 3 clear steps
   - Step 1: Schedule & Setup
   - Step 2: Collection & Transport
   - Step 3: Disposal & Documentation

5. LOCAL RELEVANCE SECTION
   - Include 2-3 sentences mentioning specific local landmarks, streets, or areas near ${locationOrDefault}
   - Mention the local authority and any relevant waste policies
   - List typical local businesses served (GP surgeries, dental clinics, beauty salons, veterinary practices)
   - If the location is a town, mention nearby villages or postcode areas

6. COMPLIANCE & TRUST SECTION
   - Add a compliance guarantee box using: <div class="success-box"><h3>Compliance Guarantee</h3><p>All waste transfer notes and consignment notes provided within 48 hours of collection.</p></div>
   - Include: "Our clients in ${locationOrDefault} include: small GP surgeries, dental clinics, beauty salons, tattoo studios, veterinary practices, and care homes."
   - Include: "MediWaste is audited annually by the Environment Agency and holds a registered waste carrier licence (upper tier)."

7. FAQ SECTION
   - Minimum 4 questions formatted as:
     <h2>Frequently Asked Questions</h2>
     <h3>[Question]</h3>
     <p>[Answer - 2-3 sentences]</p>
   - MUST include these questions (localised to ${locationOrDefault}):
     • "How much does clinical waste collection cost in ${locationOrDefault}?"
     • "What types of clinical waste do you collect in ${locationOrDefault}?"
     • "Are you registered with the Environment Agency?"
     • "How quickly can you start collections in ${locationOrDefault}?"
   - Add 1-2 more relevant questions

8. Do NOT include any CTA buttons or "Request a Quote" sections — the page template adds these automatically.
9. Do NOT add the H1 heading — it is rendered separately by the page template.
10. Do NOT wrap content in <article>, <section>, or <main> tags — just use heading and paragraph-level elements.

===== STYLING & TONE GUIDELINES =====

- Use UK English spelling (colour, centre, licence, organised, favour)
- No jargon — write for beauticians, aesthetic practitioners, GP managers, salon owners
- Short paragraphs (2-3 sentences max)
- Bullet points for lists (not dense text)
- Professional but accessible tone — direct and factual, not marketing fluff
- Do NOT use phrases like "transform your waste management" or "clinical waste management is a critical service"
- Do NOT include broken or placeholder links
- Do NOT write generic environmental theory — focus on collection, compliance, and service
- Internal links: use <a href="/waste-services">, <a href="/quote">, <a href="/contact">, <a href="/waste-services/sharps-waste">, <a href="/compliance">

===== WORD COUNT REQUIREMENT (CRITICAL) =====

The MAIN BODY content (sections 1-6: intro, trust signals, services table, collection process, local relevance, compliance) MUST total at least 1,500 words. This does NOT include the FAQ section or testimonial quotes.

To achieve this:
- The INTRO should be 100-150 words
- AFTER the trust signal module, add a detailed section (h2) about the specific service with 3-4 paragraphs of 80-100 words each (300-400 words)
- The KEY SERVICES section should include explanatory paragraphs before/after the table (200+ words)
- The COLLECTION PROCESS section should have detailed descriptions for each step (200+ words)
- The LOCAL RELEVANCE section should be thorough: 250-300 words about the area
- The COMPLIANCE section should be detailed: 200-300 words about regulations, duty of care, etc.
- Add a section about "Why Choose MediWaste in ${locationOrDefault}" with 200-300 words

If you calculate fewer than 1,500 words in your main body, ADD MORE substantial paragraphs. Each section should have multiple paragraphs with real, useful information — not padding.

===== IMAGE RULES (CRITICAL) =====

- If instructed to include an image, you MUST use a real, verified Pexels URL in this format:
  https://images.pexels.com/photos/{PHOTO_ID}/pexels-photo-{PHOTO_ID}.jpeg?auto=compress&cs=tinysrgb&w=800
- ONLY use these known valid Pexels photo IDs for clinical/medical waste topics:
  - Sharps/needles: 7579831, 7579828, 3786126, 5726794, 3786157
  - Medical waste/biohazard: 3786166, 5726706, 4031321, 7089401
  - Healthcare/clinical setting: 4386467, 3938022, 4021775, 3259629
  - Waste bins/containers: 3735218, 802221, 2547565
- NEVER generate or guess image URLs — only use the IDs listed above
- NEVER use unsplash.com, pixabay.com, shutterstock.com, or any other image service
- NEVER use placeholder URLs or URLs you are not 100% certain exist
- If you are not sure an image URL works, DO NOT include any image
- Format: <img src="URL" alt="Descriptive alt text" class="w-full rounded-lg my-6" />

===== CONTENT QUALITY =====

- Content must be unique, factual, and deeply relevant to UK clinical waste management in ${locationOrDefault}
- Naturally incorporate the target keyword 5-8 times across the article
- Include references to: Environmental Protection Act 1990, Duty of Care regulations, HTM 07-01, Hazardous Waste Regulations 2005
- Do NOT repeat content from other location pages — each must be unique
- Do NOT wrap the JSON in markdown code fences

===== FAQ SCHEMA =====

The "faq_schema" field must contain an array of objects with "question" and "answer" keys matching the FAQ section in the content. These are used for Google FAQ rich snippets.${customBlock}`;
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
                "You are an expert SEO content writer specialising in UK clinical waste management. Always respond with valid JSON only, no markdown fences. Follow all structural requirements precisely. Use UK English spelling throughout.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 8000,
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
