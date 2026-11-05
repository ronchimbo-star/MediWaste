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

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OpenAI API key not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { conversationText, customerId, subject, senderEmail, createdBy } = body;

    if (!conversationText || conversationText.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Conversation text is too short or empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch customer info if provided
    let customerContext = "";
    if (customerId) {
      const { data: customer } = await supabase
        .from("mw_customers")
        .select("company_name, contact_name, email, phone, billing_address, collection_address, payment_terms_days, postcode")
        .eq("id", customerId)
        .maybeSingle();
      if (customer) {
        customerContext = `\n\nKnown customer details (use as reference, but prefer conversation content if conflicting):\n${JSON.stringify(customer, null, 2)}`;
      }
    }

    // Fetch invoice settings for defaults
    const { data: settings } = await supabase
      .from("mw_invoice_settings")
      .select("vat_rate_default, default_payment_terms_days, bank_name, account_name, sort_code, account_number, payment_link_url")
      .eq("id", "default")
      .maybeSingle();

    const defaultVatRate = settings?.vat_rate_default ?? 20;
    const defaultPaymentTerms = settings?.default_payment_terms_days ?? 30;

    const systemPrompt = `You are an invoice extraction assistant for MediWaste, a UK-based medical and clinical waste collection business.

Your job is to analyse an email conversation between the business owner and a customer, and extract structured invoice data.

CRITICAL RULES:
- Never invent customer names, addresses, emails, or phone numbers. If missing, leave the field empty.
- Never invent services, waste types, prices, or payment terms. Only extract what appears in the conversation.
- Never assume a vague price is final. Mark pricing_status as "estimated" if the price seems like an estimate or range.
- If multiple prices appear, use the latest agreed price but mark pricing_status as "conflicting" and list the conflict.
- If a price is completely missing, mark pricing_status as "missing" and set unit_price to null.
- Do NOT calculate totals. Leave totals as null — the application will calculate them.
- Generate a professional email subject, salutation, body, and sign_off for the invoice email.
- The email should reference the service, invoice number (use placeholder "MW-2026-0000"), amount due, due date, and payment options.
- Use UK English, GBP currency, and professional but concise tone.
- Do not use marketing language or exaggeration.

Default VAT rate: ${defaultVatRate}%
Default payment terms: ${defaultPaymentTerms} days

Return ONLY valid JSON matching this exact structure:
{
  "customer": {
    "name": "", "company_name": "", "email": "", "telephone": "",
    "billing_address": "", "site_address": "",
    "company_registration_number": "", "vat_number": ""
  },
  "invoice": {
    "currency": "GBP", "invoice_date": "", "due_date": "",
    "payment_terms_days": null, "customer_reference": "",
    "purchase_order_number": "", "notes": ""
  },
  "line_items": [
    {
      "description": "", "waste_type": "", "service_type": "",
      "quantity": 1, "unit": "", "unit_price": null,
      "vat_rate": null, "line_total": null,
      "pricing_status": "confirmed|estimated|missing|conflicting",
      "source_text": ""
    }
  ],
  "totals": {
    "subtotal": null, "vat_amount": null, "total": null,
    "calculation_status": "complete|incomplete|requires_review"
  },
  "payment": {
    "payment_reference": "", "payment_method_notes": "",
    "bank_transfer_requested": false, "card_payment_requested": false
  },
  "email": {
    "recipient_name": "", "subject": "", "salutation": "",
    "body": "", "sign_off": ""
  },
  "warnings": [],
  "missing_information": [],
  "conflicts": [],
  "confidence": {
    "overall": 0, "customer_details": 0,
    "service_details": 0, "pricing": 0, "email_details": 0
  }
}

Fill confidence scores from 0-100 based on how clearly the information appears in the conversation.`;

    const userPrompt = `Analyse this email conversation and extract invoice data.${customerContext}\n\nConversation subject: ${subject || "Not provided"}\nSender email: ${senderEmail || "Not provided"}\n\n--- CONVERSATION START ---\n${conversationText}\n--- CONVERSATION END ---`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      throw new Error(`OpenAI error: ${openaiResponse.status} — ${errText}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned empty response");

    let extracted: any;
    try {
      extracted = JSON.parse(content);
    } catch {
      throw new Error("OpenAI returned invalid JSON");
    }

    // Save conversation source to database
    const { data: conversationRecord, error: convError } = await supabase
      .from("conversation_sources")
      .insert({
        customer_id: customerId || null,
        source_type: "email",
        subject: subject || null,
        sender_email: senderEmail || null,
        conversation_text: conversationText,
        extracted_json: extracted,
        ai_warnings: extracted.warnings || [],
        missing_information: extracted.missing_information || [],
        conflicts: extracted.conflicts || [],
        confidence_score: extracted.confidence || {},
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (convError) throw new Error(`Failed to save conversation: ${convError.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: conversationRecord?.id,
        extracted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("analyze-conversation error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
