import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRow {
  id: string;
  from_email: string;
  from_name: string;
  subject: string;
  body_plain: string;
  direction: string;
  received_at: string;
  customer_id: string | null;
  customer?: { company_name: string; contact_name: string } | null;
}

interface CategorisedEmail {
  category: 'urgent' | 'followup' | 'quote' | 'payment';
  sender: string;
  subject: string;
  summary: string;
  action: string;
  email_id: string;
}

const URGENT_KEYWORDS = ['urgent', 'asap', 'emergency', 'immediate', 'critical', 'deadline today', 'action required today'];
const QUOTE_KEYWORDS = ['quote', 'quotation', 'price', 'pricing', 'cost', 'how much', 'estimate', 'enquiry', 'inquiry', 'interested in'];
const PAYMENT_KEYWORDS = ['payment', 'invoice', 'paid', 'receipt', 'bank transfer', 'stripe', 'refund', 'billing', 'accounts'];
const FOLLOWUP_KEYWORDS = ['follow up', 'follow-up', 'chasing', 'reminder', 'still waiting', 'any update', 'status', 'collection', 'schedule', 'missed', 'complaint', 'issue', 'problem'];

function categoriseEmail(email: EmailRow): CategorisedEmail {
  const text = `${email.subject} ${email.body_plain}`.toLowerCase();
  const sender = email.from_name || email.from_email;
  const customerName = email.customer?.company_name || email.customer?.contact_name || '';
  const senderDisplay = customerName ? `${sender} (${customerName})` : sender;

  let category: CategorisedEmail['category'] = 'followup';

  if (URGENT_KEYWORDS.some(kw => text.includes(kw))) {
    category = 'urgent';
  } else if (QUOTE_KEYWORDS.some(kw => text.includes(kw))) {
    category = 'quote';
  } else if (PAYMENT_KEYWORDS.some(kw => text.includes(kw))) {
    category = 'payment';
  } else if (FOLLOWUP_KEYWORDS.some(kw => text.includes(kw))) {
    category = 'followup';
  }

  const bodySnippet = email.body_plain?.slice(0, 200).replace(/\s+/g, ' ').trim() || '';
  const summary = bodySnippet.length > 150 ? bodySnippet.slice(0, 150) + '...' : bodySnippet;

  const actionMap: Record<CategorisedEmail['category'], string> = {
    urgent: 'Review and respond today',
    followup: 'Respond this week',
    quote: 'Prepare and send a quote',
    payment: 'Process or file in accounts',
  };

  return {
    category,
    sender: senderDisplay,
    subject: email.subject,
    summary,
    action: actionMap[category],
    email_id: email.id,
  };
}

function buildPrompt(emails: EmailRow[]): string {
  const emailSummaries = emails.map((e, i) => {
    const sender = e.from_name || e.from_email;
    const customer = e.customer?.company_name || e.customer?.contact_name || '';
    const bodySnippet = e.body_plain?.slice(0, 300).replace(/\s+/g, ' ').trim() || '';
    return `Email ${i + 1}:
From: ${sender}${customer ? ` (${customer})` : ''}
Subject: ${e.subject}
Snippet: ${bodySnippet}`;
  }).join('\n\n');

  return `You are my MediWaste assistant. Review the following emails received in the last 24 hours.

Categorise each email into one of:
- 🔴 Urgent – needs action today
- 🟡 Follow-up – needs action this week
- 🟢 Quote Request – new enquiry
- 🔵 Payment / Admin

For each category, provide:
- Sender name / business
- Subject line
- A one-sentence summary
- What action is needed (if any)

Then list any actions I should take today. Be concise – keep to one page.

Here are the emails:

${emailSummaries}`;
}

function parseOpenAIResponse(content: string): {
  counts: { urgent: number; followup: number; quote: number; payment: number };
  actions: any[];
} {
  const counts = { urgent: 0, followup: 0, quote: 0, payment: 0 };
  const lines = content.split('\n');
  const actions: any[] = [];

  for (const line of lines) {
    if (line.includes('🔴')) counts.urgent++;
    if (line.includes('🟡')) counts.followup++;
    if (line.includes('🟢')) counts.quote++;
    if (line.includes('🔵')) counts.payment++;

    const actionMatch = line.match(/^\s*[-•*]\s*(.+)/);
    if (actionMatch && (line.toLowerCase().includes('action') || line.toLowerCase().includes('today') || line.toLowerCase().includes('send') || line.toLowerCase().includes('follow') || line.toLowerCase().includes('review') || line.toLowerCase().includes('respond'))) {
      actions.push({ text: actionMatch[1].trim() });
    }
  }

  return { counts, actions };
}

function textToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

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
    const sendEmail = body.sendEmail !== false;
    const recipientEmail = body.recipientEmail || "ronchimbo@gmail.com";

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: emails, error: emailError } = await supabase
      .from("mw_emails")
      .select(`
        id, from_email, from_name, subject, body_plain, direction, received_at, customer_id,
        customer:mw_customers(company_name, contact_name)
      `)
      .eq("direction", "inbound")
      .gte("received_at", twentyFourHoursAgo)
      .order("received_at", { ascending: false })
      .limit(100);

    if (emailError) throw new Error(`Failed to fetch emails: ${emailError.message}`);

    const inboundEmails = (emails || []) as EmailRow[];

    if (inboundEmails.length === 0) {
      const noEmailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">MediWaste Daily Briefing</h1>
        <p style="font-size: 16px; color: #666;">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p style="font-size: 16px; color: #666;">No new inbound emails in the last 24 hours. You're all caught up!</p>
      </div>`;

      const { data: briefing } = await supabase
        .from("mw_ai_briefings")
        .insert([{
          briefing_date: new Date().toISOString().split('T')[0],
          summary_html: noEmailHtml,
          summary_text: "No new inbound emails in the last 24 hours.",
          email_count: 0,
          email_sent: false,
          actions: [],
        }])
        .select()
        .single();

      return new Response(
        JSON.stringify({ success: true, briefing, message: "No new emails to summarise" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categorised = inboundEmails.map(categoriseEmail);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

    const prompt = buildPrompt(inboundEmails);

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful email assistant for a clinical waste disposal company called MediWaste. Be concise and professional." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      throw new Error(`OpenAI API error: ${openaiResp.status} - ${errText}`);
    }

    const openaiData = await openaiResp.json();
    const summaryText = openaiData.choices?.[0]?.message?.content || "Unable to generate summary.";

    const { counts, actions } = parseOpenAIResponse(summaryText);
    const summaryHtml = textToHtml(summaryText);

    const styledHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">MediWaste Daily Briefing</h1>
        <p style="color: #fecaca; margin: 5px 0 0;">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 20px;">
        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
          <span style="background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">🔴 ${counts.urgent} Urgent</span>
          <span style="background: #fefce8; color: #ca8a04; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">🟡 ${counts.followup} Follow-up</span>
          <span style="background: #f0fdf4; color: #16a34a; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">🟢 ${counts.quote} Quotes</span>
          <span style="background: #eff6ff; color: #2563eb; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">🔵 ${counts.payment} Payment/Admin</span>
        </div>
        <div style="font-size: 14px; line-height: 1.6; color: #374151;">
          ${summaryHtml}
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">Generated by MediWaste AI Assistant · ${inboundEmails.length} emails analysed</p>
      </div>
    </div>`;

    let emailSent = false;

    if (sendEmail) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) throw new Error("RESEND_API_KEY is not configured");

      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "MediWaste AI <hello@mediwaste.co.uk>",
          to: [recipientEmail],
          subject: `Daily Email Briefing — ${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`,
          html: styledHtml,
        }),
      });

      if (!resendResp.ok) {
        const errText = await resendResp.text();
        console.error("Resend API error:", errText);
      } else {
        emailSent = true;
      }
    }

    const { data: briefing } = await supabase
      .from("mw_ai_briefings")
      .insert([{
        briefing_date: new Date().toISOString().split('T')[0],
        summary_html: styledHtml,
        summary_text: summaryText,
        email_count: inboundEmails.length,
        urgent_count: counts.urgent,
        followup_count: counts.followup,
        quote_count: counts.quote,
        payment_count: counts.payment,
        actions: actions,
        email_sent: emailSent,
      }])
      .select()
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        briefing,
        emailCount: inboundEmails.length,
        counts,
        emailSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Briefing error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
