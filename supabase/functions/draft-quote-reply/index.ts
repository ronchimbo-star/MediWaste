import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const emailId = body.emailId;
    const quoteRequestId = body.quoteRequestId;

    let emailData: any = null;

    if (emailId) {
      const { data, error } = await supabase
        .from("mw_emails")
        .select("id, from_email, from_name, subject, body_plain, customer_id, customer:mw_customers(company_name, contact_name)")
        .eq("id", emailId)
        .maybeSingle();
      if (error) throw new Error(`Failed to fetch email: ${error.message}`);
      emailData = data;
    } else if (quoteRequestId) {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("id, company_name, contact_name, email, phone, postcode, bin_count, frequency, business_type, message, items, service_type, products")
        .eq("id", quoteRequestId)
        .maybeSingle();
      if (error) throw new Error(`Failed to fetch quote request: ${error.message}`);
      emailData = data;
    } else {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: quoteEmails, error: qErr } = await supabase
        .from("mw_emails")
        .select("id, from_email, from_name, subject, body_plain, customer_id, customer:mw_customers(company_name, contact_name)")
        .eq("direction", "inbound")
        .gte("received_at", twentyFourHoursAgo)
        .order("received_at", { ascending: false })
        .limit(50);

      if (qErr) throw qErr;

      const QUOTE_KEYWORDS = ["quote", "quotation", "price", "pricing", "cost", "how much", "estimate", "enquiry", "inquiry", "interested in", "waste collection", "sharps bin", "clinical waste"];
      const quoteEmail = (quoteEmails || []).find((e: any) => {
        const text = `${e.subject} ${e.body_plain}`.toLowerCase();
        return QUOTE_KEYWORDS.some(kw => text.includes(kw));
      });

      if (!quoteEmail) {
        return new Response(
          JSON.stringify({ success: false, message: "No quote enquiry emails found in the last 24 hours" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      emailData = quoteEmail;
    }

    if (!emailData) {
      return new Response(
        JSON.stringify({ success: false, message: "No email found to draft a quote from" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

    const isQuoteRequest = !!emailData.contact_name;
    let extractionPrompt: string;
    let draftPrompt: string;

    if (isQuoteRequest) {
      const items = emailData.items ? JSON.stringify(emailData.items) : "Not specified";
      const products = emailData.products ? JSON.stringify(emailData.products) : "Not specified";
      extractionPrompt = `Extract the following client details from this quote request:
- Client name: ${emailData.contact_name || "Unknown"}
- Business: ${emailData.company_name || emailData.business_name || emailData.business_type || "Unknown"}
- Postcode: ${emailData.postcode || "Unknown"}
- Waste types: ${emailData.service_type || "Not specified"}
- Frequency: ${emailData.frequency || "Not specified"}
- Estimated volume: ${emailData.bin_count ? emailData.bin_count + " bins" : "Not specified"}
- Additional info: ${emailData.message || emailData.additional_info || "None"}
- Items: ${items}
- Products: ${products}`;
    } else {
      extractionPrompt = `Extract the following client details from this email:
From: ${emailData.from_name || emailData.from_email}
Subject: ${emailData.subject}
Body: ${emailData.body_plain?.slice(0, 1500) || "No body"}
Customer: ${emailData.customer?.company_name || emailData.customer?.contact_name || "Not linked"}`;
    }

    draftPrompt = `You are my MediWaste quote assistant. Based on the following client details, draft a professional quote email.

${extractionPrompt}

Use the MediWaste tone – warm, professional, and helpful.
Include:
- A personalised opening
- A clear quote table (options, cost per visit, annual cost)
- What's included (bins, documentation, compliance)
- A clear call to action

Use actual MediWaste pricing (all excl VAT):
- Sharps bin (1L): £7.00 each
- Sharps bin (5L): £12.00 each
- Sharps bin (7L): £15.00 each
- Clinical waste bin (per bin): £10.00-£15.00 depending on size
- Collection per visit (1 bin): £76.00
- Collection per visit (2 bins same day): £148.15
- 12-month bin rental: £102.00-£432.00 depending on bin type and quantity
- Pharmaceutical waste disposal (per visit): £43.00
- Documentation & compliance fee (annual): £43.00
- Additional line items typically range £20-£100
Adjust quantities and totals based on frequency and volume mentioned in the email.

Do not send the email – just draft it and return it to me for review.

Return your response as JSON with this structure:
{
  "client_name": "extracted name",
  "client_business": "extracted business",
  "client_postcode": "extracted postcode",
  "waste_types": ["array", "of", "waste", "types"],
  "frequency": "extracted frequency",
  "estimated_volume": "extracted volume",
  "draft_subject": "email subject line",
  "draft_body": "full email body as plain text"
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
          { role: "system", content: "You are a helpful assistant for a clinical waste disposal company called MediWaste. You draft professional quote emails. Always respond with valid JSON." },
          { role: "user", content: draftPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      throw new Error(`OpenAI API error: ${openaiResp.status} - ${errText}`);
    }

    const openaiData = await openaiResp.json();
    const content = openaiData.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        client_name: emailData.from_name || emailData.contact_name || "",
        client_business: emailData.company_name || "",
        client_postcode: emailData.postcode || "",
        waste_types: [],
        frequency: "",
        estimated_volume: "",
        draft_subject: `Quote for Clinical Waste Collection Services`,
        draft_body: content,
      };
    }

    const { data: draft, error: insertError } = await supabase
      .from("mw_ai_quote_drafts")
      .insert([{
        email_id: emailData.id || null,
        quote_request_id: quoteRequestId || null,
        client_name: parsed.client_name || emailData.from_name || emailData.contact_name || "",
        client_business: parsed.client_business || emailData.company_name || "",
        client_postcode: parsed.client_postcode || emailData.postcode || "",
        waste_types: parsed.waste_types || [],
        frequency: parsed.frequency || "",
        estimated_volume: parsed.estimated_volume || "",
        draft_subject: parsed.draft_subject || "Quote for Clinical Waste Collection Services",
        draft_body: parsed.draft_body || "",
        status: "pending",
      }])
      .select()
      .single();

    if (insertError) throw new Error(`Failed to save draft: ${insertError.message}`);

    return new Response(
      JSON.stringify({ success: true, draft }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Quote draft error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
