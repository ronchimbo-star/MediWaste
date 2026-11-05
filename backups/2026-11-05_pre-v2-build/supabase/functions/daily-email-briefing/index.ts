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

function buildPrompt(emails: EmailRow[], windowLabel: string): string {
  const emailSummaries = emails.map((e, i) => {
    const sender = e.from_name || e.from_email;
    const customer = e.customer?.company_name || e.customer?.contact_name || '';
    const bodySnippet = e.body_plain?.slice(0, 300).replace(/\s+/g, ' ').trim() || '';
    return `Email ${i + 1}:
From: ${sender}${customer ? ` (${customer})` : ''}
Subject: ${e.subject}
Date: ${new Date(e.received_at).toLocaleDateString('en-GB')}
Snippet: ${bodySnippet}`;
  }).join('\n\n');

  return `You are my MediWaste assistant. Review the following emails received in the ${windowLabel}.

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

async function getGmailAccessToken(): Promise<string | null> {
  const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN");
  const clientId = Deno.env.get("GMAIL_CLIENT_ID");
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");

  if (refreshToken && clientId && clientSecret) {
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.access_token) return data.access_token;
    }
    return null;
  }

  return Deno.env.get("GMAIL_ACCESS_TOKEN") || null;
}

function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return decodeURIComponent(
      raw
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
  } catch {
    return "";
  }
}

function extractEmailBody(payload: any): string {
  let plain = "";
  const processPart = (part: any) => {
    if (!part) return;
    const mimeType = part.mimeType || "";
    const body = part.body || {};
    if (mimeType === "text/plain" && body.data) {
      plain = decodeBase64Url(body.data);
    } else if (mimeType === "text/html" && body.data && !plain) {
      plain = decodeBase64Url(body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    if (part.parts) {
      for (const subpart of part.parts) processPart(subpart);
    }
  };
  processPart(payload);
  return plain;
}

function getHeader(headers: any[], name: string): string {
  const header = headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || "";
}

function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
  return { name: "", email: raw.trim() };
}

async function syncGmail(supabase: any): Promise<{ fetched: number; newEmails: number; error: string | null }> {
  let gmailToken: string;
  try {
    const token = await getGmailAccessToken();
    if (!token) return { fetched: 0, newEmails: 0, error: "No Gmail credentials configured" };
    gmailToken = token;
  } catch (e: any) {
    return { fetched: 0, newEmails: 0, error: e.message };
  }

  try {
    let listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=to:mediwaste.co.uk OR from:mediwaste.co.uk`;
    const listResp = await fetch(listUrl, { headers: { Authorization: `Bearer ${gmailToken}` } });

    if (!listResp.ok) {
      const errText = await listResp.text();
      return { fetched: 0, newEmails: 0, error: `Gmail API list error: ${listResp.status} - ${errText}` };
    }

    const listData = await listResp.json();
    const messages = listData.messages || [];
    let newCount = 0;

    const { data: allCustomers } = await supabase
      .from("mw_customers")
      .select("id, email");

    const customerEmailMap: Record<string, string> = {};
    for (const c of allCustomers || []) {
      if (c.email) customerEmailMap[c.email.toLowerCase()] = c.id;
    }

    for (const msg of messages) {
      const { data: existing } = await supabase
        .from("mw_emails")
        .select("id")
        .eq("gmail_message_id", msg.id)
        .maybeSingle();
      if (existing) continue;

      const msgResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${gmailToken}` } }
      );
      if (!msgResp.ok) continue;
      const msgData = await msgResp.json();

      const headers = msgData.payload?.headers || [];
      const fromRaw = getHeader(headers, "From");
      const toRaw = getHeader(headers, "To");
      const subject = getHeader(headers, "Subject") || "(No Subject)";
      const dateRaw = getHeader(headers, "Date");

      const from = parseEmailAddress(fromRaw);
      const to = parseEmailAddress(toRaw);
      const bodyPlain = extractEmailBody(msgData.payload);
      const receivedAt = dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString();

      const mediwasteDomains = ["mediwaste.co.uk"];
      const fromIsMediwaste = mediwasteDomains.some((d) => from.email.toLowerCase().includes(d));
      const direction = fromIsMediwaste ? "outbound" : "inbound";
      const matchEmail = direction === "inbound" ? from.email.toLowerCase() : to.email.toLowerCase();
      const customerId = customerEmailMap[matchEmail] || null;

      const labels = msgData.labelIds || [];
      const isRead = !labels.includes("UNREAD");
      const isStarred = labels.includes("STARRED");
      const status = isStarred ? "starred" : isRead ? "read" : "unread";

      await supabase.from("mw_emails").insert([{
        gmail_message_id: msg.id,
        gmail_thread_id: msgData.threadId || null,
        customer_id: customerId,
        from_email: from.email,
        from_name: from.name,
        to_email: to.email,
        subject,
        body_plain: bodyPlain,
        body_html: null,
        direction,
        status,
        has_attachments: false,
        attachments: [],
        labels,
        received_at: receivedAt,
      }]);
      newCount++;
    }

    await supabase.from("mw_email_sync_log").insert([{
      status: "success",
      emails_fetched: messages.length,
      emails_new: newCount,
    }]);

    return { fetched: messages.length, newEmails: newCount, error: null };
  } catch (err: any) {
    return { fetched: 0, newEmails: 0, error: err.message };
  }
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
    const skipSync = body.skipSync === true;

    let syncResult: { fetched: number; newEmails: number; error: string | null } | null = null;

    if (!skipSync) {
      syncResult = await syncGmail(supabase);
    }

    // Try 24h window first, then fall back to 7 days, then 30 days
    const windows = [
      { hours: 24, label: "last 24 hours" },
      { hours: 168, label: "last 7 days" },
      { hours: 720, label: "last 30 days" },
    ];

    let inboundEmails: EmailRow[] = [];
    let windowLabel = windows[0].label;

    for (const w of windows) {
      const since = new Date(Date.now() - w.hours * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("mw_emails")
        .select(`
          id, from_email, from_name, subject, body_plain, direction, received_at, customer_id,
          customer:mw_customers(company_name, contact_name)
        `)
        .eq("direction", "inbound")
        .gte("received_at", since)
        .order("received_at", { ascending: false })
        .limit(100);

      if (error) throw new Error(`Failed to fetch emails: ${error.message}`);

      inboundEmails = (data || []) as EmailRow[];
      windowLabel = w.label;
      if (inboundEmails.length > 0) break;
    }

    const syncNote = syncResult
      ? syncResult.error
        ? ` (Gmail sync skipped: ${syncResult.error})`
        : syncResult.newEmails > 0
          ? ` (Gmail synced: ${syncResult.newEmails} new emails)`
          : " (Gmail synced: no new emails)"
      : "";

    if (inboundEmails.length === 0) {
      const noEmailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">MediWaste Daily Briefing</h1>
        <p style="font-size: 16px; color: #666;">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p style="font-size: 16px; color: #666;">No inbound emails found in the last 30 days. You're all caught up!</p>
        <p style="font-size: 12px; color: #aaa;">${syncNote}</p>
      </div>`;

      const { data: briefing } = await supabase
        .from("mw_ai_briefings")
        .insert([{
          briefing_date: new Date().toISOString().split('T')[0],
          summary_html: noEmailHtml,
          summary_text: "No inbound emails found in the last 30 days." + syncNote,
          email_count: 0,
          email_sent: false,
          actions: [],
        }])
        .select()
        .single();

      return new Response(
        JSON.stringify({ success: true, briefing, message: "No new emails to summarise" + syncNote, syncResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categorised = inboundEmails.map(categoriseEmail);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

    const prompt = buildPrompt(inboundEmails, windowLabel);

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
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">Generated by MediWaste AI Assistant · ${inboundEmails.length} emails analysed (${windowLabel})${syncNote}</p>
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
        syncResult,
        windowUsed: windowLabel,
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
