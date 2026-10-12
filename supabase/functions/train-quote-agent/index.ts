import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MEDIWASTE_SENDERS = [
  "sarah.benson@mediwaste.co.uk",
  "hello@mediwaste.co.uk",
  "ron.chimbo@mediwaste.co.uk",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const maxEmails = body.maxEmails || 100;
    const mode: string = body.mode || "analyze";

    /* ── Mode: "list" — return available untrained quotes from the DB ── */
    if (mode === "list") {
      const { data: existingIds } = await supabase
        .from("mw_quote_training_examples")
        .select("source_email_id");

      const usedIds = new Set((existingIds || []).map((r: any) => r.source_email_id).filter(Boolean));

      const { data: quoteEmails, error } = await supabase
        .from("mw_emails")
        .select("id, subject, to_email, from_email, received_at, body_plain")
        .eq("direction", "outbound")
        .in("from_email", MEDIWASTE_SENDERS)
        .ilike("subject", "%quote%")
        .not("subject", "ilike", "New Quote Request%")
        .not("subject", "ilike", "Re: New Quote Request%")
        .order("received_at", { ascending: false })
        .limit(maxEmails);

      if (error) throw new Error(`Failed to fetch quote emails: ${error.message}`);

      const available = (quoteEmails || []).filter((e: any) => !usedIds.has(e.id));

      return new Response(
        JSON.stringify({
          success: true,
          available: available.map((e: any) => ({
            id: e.id,
            subject: e.subject,
            to_email: e.to_email,
            received_at: e.received_at,
            body_preview: (e.body_plain || "").slice(0, 200),
          })),
          totalFound: quoteEmails?.length || 0,
          alreadyTrained: usedIds.size,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ── Mode: "analyze" — analyse DB quote emails with OpenAI ──────── */
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

    // Get already-trained email IDs
    const { data: existingTraining } = await supabase
      .from("mw_quote_training_examples")
      .select("source_email_id");

    const trainedIds = new Set((existingTraining || []).map((r: any) => r.source_email_id).filter(Boolean));

    // Fetch the latest N sent quotes from MediWaste addresses, most recent first
    const { data: quoteEmails, error: fetchError } = await supabase
      .from("mw_emails")
      .select("id, subject, to_email, from_email, from_name, received_at, body_plain")
      .eq("direction", "outbound")
      .in("from_email", MEDIWASTE_SENDERS)
      .ilike("subject", "%quote%")
      .not("subject", "ilike", "New Quote Request%")
      .not("subject", "ilike", "Re: New Quote Request%")
      .order("received_at", { ascending: false })
      .limit(maxEmails);

    if (fetchError) throw new Error(`Failed to fetch quote emails: ${fetchError.message}`);

    const toAnalyze = (quoteEmails || []).filter((e: any) => !trainedIds.has(e.id));

    if (toAnalyze.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All available quotes have already been trained",
          found: quoteEmails?.length || 0,
          trained: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let trainedCount = 0;
    const results: any[] = [];
    let skipped = 0;

    for (const email of toAnalyze) {
      const bodyText = email.body_plain || "";

      if (!bodyText || bodyText.length < 50) {
        skipped++;
        continue;
      }

      // Parse recipient name from to_email or subject
      const toName = email.to_email?.split("@")[0] || "";

      const analysisPrompt = `You are analysing a real quote email sent by MediWaste (a UK clinical waste collection company) to a potential customer. Extract structured information that can be used to train an AI agent to write similar quotes.

Email subject: ${email.subject}
Email body:
${bodyText.slice(0, 4000)}

Extract the following as JSON:
{
  "client_name": "name of the recipient if identifiable from the greeting or body",
  "client_business": "business name if mentioned",
  "client_postcode": "postcode if mentioned",
  "waste_types": ["array of waste types mentioned, e.g. sharps, clinical waste, pharmaceutical, offensive, tiger bags"],
  "frequency": "collection frequency if mentioned, e.g. monthly, quarterly, bi-monthly, flexible",
  "key_details": {
    "pricing": ["list of prices mentioned, e.g. 'Sharps 5L: £12.00 each', 'Monthly collection: £45.00/month'"],
    "bin_types": ["bin types and sizes mentioned, e.g. '2L sharps bin', '240L clinical waste container'"],
    "services_included": ["what's included in the service, e.g. 'containers supplied', 'waste transfer notes', 'collection and disposal'"],
    "terms": ["any terms mentioned, e.g. '12-month contract', '30 days notice', 'no setup fee'"],
    "tone": "describe the tone/style of the email in a few words, e.g. 'professional, warm, detailed'"
  },
  "analysis_summary": "2-3 sentences describing what makes this quote effective — the style, structure, pricing approach, and any notable patterns"
}`;

      const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful assistant that analyses email quotes for a UK clinical waste collection company called MediWaste. Always respond with valid JSON." },
            { role: "user", content: analysisPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      });

      if (!openaiResp.ok) {
        const errText = await openaiResp.text();
        console.error(`OpenAI error for email ${email.id}:`, errText);
        continue;
      }

      const openaiData = await openaiResp.json();
      const content = openaiData.choices?.[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(content); } catch { parsed = {}; }

      const { error: insertError } = await supabase
        .from("mw_quote_training_examples")
        .insert([{
          source_email_id: email.id,
          client_name: parsed.client_name || toName || null,
          client_business: parsed.client_business || null,
          client_postcode: parsed.client_postcode || null,
          waste_types: parsed.waste_types || [],
          frequency: parsed.frequency || null,
          quote_subject: email.subject,
          quote_body: bodyText,
          key_details: parsed.key_details || {},
          analysis_summary: parsed.analysis_summary || null,
        }]);

      if (insertError) {
        console.error("Insert error:", insertError.message);
        continue;
      }

      trainedCount++;
      results.push({
        subject: email.subject,
        to: email.to_email,
        client_name: parsed.client_name || toName || "",
        analysis_summary: parsed.analysis_summary || "",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        found: quoteEmails?.length || 0,
        toAnalyze: toAnalyze.length,
        trained: trainedCount,
        skipped,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Quote training error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
