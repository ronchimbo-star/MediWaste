import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

function extractEmailBody(payload: any): { plain: string; html: string } {
  let plain = "";
  let html = "";

  const processpart = (part: any) => {
    if (!part) return;
    const mimeType = part.mimeType || "";
    const body = part.body || {};

    if (mimeType === "text/plain" && body.data) {
      plain = decodeBase64Url(body.data);
    } else if (mimeType === "text/html" && body.data) {
      html = decodeBase64Url(body.data);
    }

    if (part.parts) {
      for (const subpart of part.parts) {
        processpart(subpart);
      }
    }
  };

  processpart(payload);
  return { plain, html };
}

function getHeader(headers: any[], name: string): string {
  const header = headers?.find(
    (h: any) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value || "";
}

function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
  }
  return { name: "", email: raw.trim() };
}

function hasAttachments(payload: any): boolean {
  const checkParts = (parts: any[]): boolean => {
    if (!parts) return false;
    for (const part of parts) {
      if (part.filename && part.filename.length > 0) return true;
      if (part.parts && checkParts(part.parts)) return true;
    }
    return false;
  };
  return payload?.parts ? checkParts(payload.parts) : false;
}

function extractAttachments(payload: any): any[] {
  const attachments: any[] = [];
  const walkParts = (parts: any[]) => {
    if (!parts) return;
    for (const part of parts) {
      if (part.filename && part.filename.length > 0) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body?.size || 0,
          attachmentId: part.body?.attachmentId || null,
        });
      }
      if (part.parts) walkParts(part.parts);
    }
  };
  if (payload?.parts) walkParts(payload.parts);
  return attachments;
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

    const gmailToken = Deno.env.get("GMAIL_ACCESS_TOKEN");
    if (!gmailToken) {
      return new Response(
        JSON.stringify({ error: "GMAIL_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const maxResults = body.maxResults || 50;
    const pageToken = body.pageToken || null;

    let listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=to:mediwaste.co.uk OR from:mediwaste.co.uk`;
    if (pageToken) listUrl += `&pageToken=${pageToken}`;

    const listResp = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${gmailToken}` },
    });

    if (!listResp.ok) {
      const errText = await listResp.text();
      await supabase.from("mw_email_sync_log").insert([{
        status: "error",
        error_message: `Gmail API list error: ${listResp.status} - ${errText}`,
        emails_fetched: 0,
        emails_new: 0,
      }]);
      return new Response(
        JSON.stringify({ error: "Gmail API error", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const listData = await listResp.json();
    const messages = listData.messages || [];
    const nextPageToken = listData.nextPageToken || null;

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

      const { plain, html } = extractEmailBody(msgData.payload);
      const receivedAt = dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString();

      const mediwasteEmails = ["mediwaste.co.uk"];
      const fromIsMediwaste = mediwasteEmails.some((d) =>
        from.email.toLowerCase().includes(d)
      );
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
        body_plain: plain,
        body_html: html,
        direction,
        status,
        has_attachments: hasAttachments(msgData.payload),
        attachments: extractAttachments(msgData.payload),
        labels,
        received_at: receivedAt,
      }]);

      newCount++;
    }

    await supabase.from("mw_email_sync_log").insert([{
      status: "success",
      emails_fetched: messages.length,
      emails_new: newCount,
      next_page_token: nextPageToken,
    }]);

    return new Response(
      JSON.stringify({
        success: true,
        fetched: messages.length,
        new: newCount,
        nextPageToken,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
