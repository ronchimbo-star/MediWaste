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

    let emailData: any = null;

    if (emailId) {
      const { data, error } = await supabase
        .from("mw_emails")
        .select("id, from_email, from_name, subject, body_plain, customer_id, customer:mw_customers(id, company_name, contact_name, email, postcode)")
        .eq("id", emailId)
        .maybeSingle();
      if (error) throw new Error(`Failed to fetch email: ${error.message}`);
      emailData = data;
    } else {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const CONFIRM_KEYWORDS = ["confirm", "confirmed", "accept", "accepted", "go ahead", "proceed", "sign up", "happy to", "sounds good", "let's do it", "agreed", "onboard", "onboarding"];
      const { data: recentEmails, error } = await supabase
        .from("mw_emails")
        .select("id, from_email, from_name, subject, body_plain, customer_id, customer:mw_customers(id, company_name, contact_name, email, postcode)")
        .eq("direction", "inbound")
        .gte("received_at", fortyEightHoursAgo)
        .order("received_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const confirmEmail = (recentEmails || []).find((e: any) => {
        const text = `${e.subject} ${e.body_plain}`.toLowerCase();
        return CONFIRM_KEYWORDS.some(kw => text.includes(kw));
      });

      if (!confirmEmail) {
        return new Response(
          JSON.stringify({ success: false, message: "No confirmation emails found in the last 48 hours" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      emailData = confirmEmail;
    }

    if (!emailData) {
      return new Response(
        JSON.stringify({ success: false, message: "No email found to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

    const linkedCustomer = emailData.customer;
    const linkedCustomerId = emailData.customer_id;
    const linkedCustomerInfo = linkedCustomer
      ? `Already linked to customer: ${linkedCustomer.company_name || linkedCustomer.contact_name} (ID: ${linkedCustomer.id}, Email: ${linkedCustomer.email || 'N/A'}, Postcode: ${linkedCustomer.postcode || 'N/A'})`
      : "Not linked to any existing customer.";

    const prompt = `You are my MediWaste admin assistant. A client has confirmed they want to proceed with our services. Extract their details from this email and draft a Waste Management Certificate and an itemised invoice for ANNA Bank.

Email from: ${emailData.from_name || emailData.from_email}
Subject: ${emailData.subject}
Body: ${emailData.body_plain?.slice(0, 2000) || "No body"}
${linkedCustomerInfo}

Extract:
- Client name
- Business name
- Address (if available)
- Postcode (if available)
- Plan type (e.g., Monthly, Pay-as-you-go, Flexi)
- Start date (if mentioned, otherwise leave null)
- Waste streams covered (e.g., Sharps, Clinical, Pharmaceutical)

Then draft:
1. A Waste Management Certificate using this template:
   - Client name, business, address
   - Plan details and waste types
   - MediWaste licence number: EWC-2024-7891
   - QR code link placeholder: [QR CODE PLACEHOLDER]
   - Format as plain text

2. An itemised invoice for ANNA Bank (this will be copy-pasted into ANNA's invoice form). Format as plain text with:
   - Customer name and business
   - Billing address
   - Itemised list of services with:
     * Description (e.g., "Sharps bin collection — monthly", "Clinical waste bin rental", "Pharmaceutical waste disposal")
     * Quantity
     * Unit price (excl VAT)
     * Line total (excl VAT)
   - Subtotal (excl VAT)
   - VAT at 20%
   - Total (incl VAT)
   Use realistic MediWaste pricing:
   - Sharps bin collection (per visit): £15-25 depending on volume
   - Clinical waste bin collection (per visit): £18-30
   - Bin rental (annual): £45-85 per bin
   - Pharmaceutical waste disposal (per visit): £20-35
   - Documentation & compliance fee (annual): £50
   Adjust based on frequency and volume mentioned in the email.

Return your response as JSON:
{
  "client_name": "...",
  "business_name": "...",
  "address": "...",
  "postcode": "...",
  "plan_type": "...",
  "start_date": "YYYY-MM-DD or null",
  "waste_streams": ["Sharps", "Clinical"],
  "certificate_draft": "full certificate text",
  "invoice_draft": "full itemised invoice text for ANNA Bank"
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
          { role: "system", content: "You are a helpful admin assistant for a clinical waste disposal company called MediWaste. Always respond with valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 3000,
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
        client_name: emailData.from_name || "",
        business_name: linkedCustomer?.company_name || "",
        address: "",
        postcode: linkedCustomer?.postcode || "",
        plan_type: "",
        start_date: null,
        waste_streams: [],
        certificate_draft: content,
        invoice_draft: "",
      };
    }

    const { data: draft, error: insertError } = await supabase
      .from("mw_ai_customer_drafts")
      .insert([{
        email_id: emailData.id || null,
        client_name: parsed.client_name || emailData.from_name || "",
        business_name: parsed.business_name || "",
        address: parsed.address || "",
        postcode: parsed.postcode || "",
        plan_type: parsed.plan_type || "",
        start_date: parsed.start_date || null,
        waste_streams: parsed.waste_streams || [],
        certificate_draft: parsed.certificate_draft || "",
        invoice_email_draft: parsed.invoice_draft || "",
        status: "pending",
      }])
      .select()
      .single();

    if (insertError) throw new Error(`Failed to save draft: ${insertError.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        draft,
        linkedCustomerId: linkedCustomerId || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Customer draft error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
