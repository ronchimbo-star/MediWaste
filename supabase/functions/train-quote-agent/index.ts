import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/* ── Gmail helpers ────────────────────────────────────────────── */

async function getGmailAccessToken(): Promise<string> {
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
    const errText = await resp.text().catch(() => "unknown");
    throw new Error(`Failed to refresh Gmail token: ${errText}`);
  }

  const staticToken = Deno.env.get("GMAIL_ACCESS_TOKEN");
  if (staticToken) return staticToken;

  throw new Error("No Gmail credentials configured.");
}

function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return decodeURIComponent(
      raw.split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
    );
  } catch { return ""; }
}

function getHeader(headers: any[], name: string): string {
  const header = headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || "";
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
    if (part.parts) for (const sub of part.parts) processPart(sub);
  };
  processPart(payload);
  return plain;
}

function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
  return { name: "", email: raw.trim() };
}

/* ── Main handler ─────────────────────────────────────────────── */

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
    const maxEmails = body.maxEmails || 20;
    const mode: string = body.mode || "analyze";

    /* ── Mode: "list" — return quote emails from the DB ──────── */
    if (mode === "list") {
      const { data: existingIds } = await supabase
        .from("mw_quote_training_examples")
        .select("source_email_id");

      const usedIds = new Set((existingIds || []).map((r: any) => r.source_email_id).filter(Boolean));

      const { data: quoteEmails, error } = await supabase
        .from("mw_emails")
        .select("id, subject, to_email, from_email, from_name, received_at, body_plain")
        .eq("direction", "outbound")
        .ilike("subject", "%quote%")
        .not("from_email", "ilike", "%ronchimbo@gmail.com%")
        .order("received_at", { ascending: false })
        .limit(100);

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
          alreadyTrained: usedIds.size,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ── Mode: "analyze" — fetch from Gmail + analyse with OpenAI ─ */
    const gmailToken = await getGmailAccessToken();

    // Search Gmail sent folder for emails with "quote" in the subject
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxEmails}&q=in:sent subject:quote`;
    const listResp = await fetch(listUrl, { headers: { Authorization: `Bearer ${gmailToken}` } });

    if (!listResp.ok) {
      const errText = await listResp.text();
      throw new Error(`Gmail API list error: ${listResp.status} - ${errText}`);
    }

    const listData = await listResp.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No sent emails with 'quote' in subject found in Gmail", trained: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check which are already trained
    const gmailIds = messages.map((m: any) => m.id);
    const { data: existingEmails } = await supabase
      .from("mw_emails")
      .select("id, gmail_message_id")
      .in("gmail_message_id", gmailIds);

    const gmailIdToDbId: Record<string, string> = {};
    for (const e of existingEmails || []) {
      gmailIdToDbId[e.gmail_message_id] = e.id;
    }

    const { data: existingTraining } = await supabase
      .from("mw_quote_training_examples")
      .select("source_email_id");

    const trainedIds = new Set((existingTraining || []).map((r: any) => r.source_email_id).filter(Boolean));

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

    let trainedCount = 0;
    const results: any[] = [];

    for (const msg of messages) {
      // Fetch full message from Gmail
      const msgResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${gmailToken}` } }
      );
      if (!msgResp.ok) continue;

      const msgData = await msgResp.json();
      const headers = msgData.payload?.headers || [];
      const subject = getHeader(headers, "Subject") || "(No Subject)";
      const toRaw = getHeader(headers, "To");
      const to = parseEmailAddress(toRaw);
      const dateRaw = getHeader(headers, "Date");
      const bodyText = extractEmailBody(msgData.payload);

      if (!bodyText || bodyText.length < 50) continue;

      // Find or create the email record in mw_emails
      let dbEmailId = gmailIdToDbId[msg.id];

      if (!dbEmailId) {
        const { data: newEmail } = await supabase
          .from("mw_emails")
          .insert([{
            gmail_message_id: msg.id,
            gmail_thread_id: msgData.threadId || null,
            from_email: "sarah.benson@mediwaste.co.uk",
            from_name: "Sarah Benson",
            to_email: to.email,
            subject,
            body_plain: bodyText,
            body_html: null,
            direction: "outbound",
            status: "read",
            has_attachments: false,
            attachments: [],
            labels: msgData.labelIds || [],
            received_at: dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString(),
          }])
          .select("id")
          .single();
        dbEmailId = newEmail?.id;
      }

      if (dbEmailId && trainedIds.has(dbEmailId)) continue;

      // Analyse with OpenAI
      const analysisPrompt = `You are analysing a real quote email sent by MediWaste to a potential customer. Extract structured information that can be used to train an AI agent to write similar quotes.

Email subject: ${subject}
Email body:
${bodyText.slice(0, 3000)}

Extract the following as JSON:
{
  "client_name": "name of the recipient if identifiable",
  "client_business": "business name if mentioned",
  "client_postcode": "postcode if mentioned",
  "waste_types": ["array of waste types mentioned"],
  "frequency": "collection frequency if mentioned",
  "key_details": {
    "pricing": ["list of prices mentioned, e.g. 'Sharps 5L: £12.00 each'"],
    "bin_types": ["bin types and sizes mentioned"],
    "services_included": ["what's included in the service"],
    "terms": ["any terms mentioned, e.g. '12-month contract', '30 days notice'"],
    "tone": "describe the tone/style of the email in a few words"
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
            { role: "system", content: "You are a helpful assistant that analyses email quotes. Always respond with valid JSON." },
            { role: "user", content: analysisPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      });

      if (!openaiResp.ok) {
        const errText = await openaiResp.text();
        console.error(`OpenAI error for message ${msg.id}:`, errText);
        continue;
      }

      const openaiData = await openaiResp.json();
      const content = openaiData.choices?.[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(content); } catch { parsed = {}; }

      const { error: insertError } = await supabase
        .from("mw_quote_training_examples")
        .insert([{
          source_email_id: dbEmailId || null,
          client_name: parsed.client_name || to.name || to.email,
          client_business: parsed.client_business || null,
          client_postcode: parsed.client_postcode || null,
          waste_types: parsed.waste_types || [],
          frequency: parsed.frequency || null,
          quote_subject: subject,
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
        subject,
        to: to.email,
        client_name: parsed.client_name || to.name || to.email,
        analysis_summary: parsed.analysis_summary || "",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        foundInGmail: messages.length,
        trained: trainedCount,
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
